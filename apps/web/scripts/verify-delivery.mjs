import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '../../..');
const mode = process.argv[2] ?? 'docker';
const native = mode === 'desktop';
let processHandle;
let exited;
let browser;
let origin;
const data = resolve(root, '.runtime/packaged-smoke');
const storedTheme = native
  ? await readFile(resolve(data, 'preferences.json'), 'utf8').then(
      (value) => JSON.parse(value).theme,
      () => undefined,
    )
  : undefined;
const closeNative = () => {
  if (!processHandle || processHandle.exitCode !== null) return;
  execFileSync(
    resolve(root, '.venv/Scripts/python.exe'),
    [
      '-c',
      `
import ctypes
from ctypes import wintypes
target = ${processHandle.pid}
user = ctypes.windll.user32
@ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
def close(hwnd, parameter):
    pid = wintypes.DWORD()
    user.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    if pid.value == target:
        user.PostMessageW(hwnd, 0x10, 0, 0)
    return True
user.EnumWindows(close, 0)
`,
    ],
    { windowsHide: true },
  );
};
try {
  if (native) {
    await mkdir(data, { recursive: true });
    processHandle = spawn(resolve(root, 'dist/desktop/MTools/MTools.exe'), [], {
      cwd: data,
      windowsHide: true,
      env: {
        ...process.env,
        MTOOLS_DATA_DIR: data,
        WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9337',
      },
      stdio: 'ignore',
    });
    exited = once(processHandle, 'exit');
    for (let attempt = 0; attempt < 200; attempt++) {
      if (processHandle.exitCode !== null)
        throw new Error('Packaged desktop exited during startup');
      try {
        const response = await fetch('http://127.0.0.1:9337/json/version');
        if (response.ok) break;
      } catch (error) {
        if (processHandle.exitCode !== null) throw error;
      }
      await delay(100);
    }
    browser = await chromium.connectOverCDP('http://127.0.0.1:9337');
  } else {
    browser = await chromium.launch();
  }
  const context = native ? browser.contexts()[0] : await browser.newContext();
  const page = native ? context.pages()[0] : await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  if (!native) await page.goto('http://127.0.0.1:8000/');
  await expect(
    page.getByRole('heading', { name: '工具目录', exact: true }),
  ).toBeVisible();
  origin = new URL(page.url()).origin;
  await expect(page.getByRole('link', { name: '打开工具' })).toBeVisible();
  if (storedTheme)
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      storedTheme,
    );
  if (native) {
    const denied = await fetch(origin);
    expect(denied.status).toBe(403);
  }
  await page.screenshot({
    fullPage: true,
    path: resolve(
      root,
      `docs/assets/platform-shell/2026-10-15-${mode}-catalog.png`,
    ),
  });
  await page.getByRole('link', { name: '打开工具' }).click();
  await page.getByRole('button', { name: '填入示例' }).click();
  await page.getByRole('button', { name: '格式化 JSON' }).click();
  await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
    /MTools/,
  );
  await page.screenshot({
    path: resolve(
      root,
      `docs/assets/platform-shell/2026-10-15-${mode}-json.png`,
    ),
  });
  if (!native) {
    const received = page.waitForEvent('download');
    await page.getByRole('button', { name: '下载', exact: true }).click();
    expect((await received).suggestedFilename()).toBe('formatted.json');
  } else {
    await page.getByRole('button', { name: '复制', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: '结果已复制' }),
    ).toBeVisible();
  }
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'JSON 格式化', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: '设置', exact: true }).click();
  await page.getByLabel('界面主题').selectOption('dark');
  await expect(page.getByLabel('界面主题')).toBeEnabled();
  await page.getByRole('link', { name: 'AI 助手', exact: true }).click();
  await page.getByRole('button', { name: '获取连接信息' }).click();
  await expect(page.getByLabel('MTools 连接配置')).toHaveValue(/mcpServers/);
  const config = JSON.parse(
    await page.getByLabel('MTools 连接配置').inputValue(),
  );
  if (native) expect(config.mcpServers.mtools.command).toMatch(/MToolsAI.exe$/);
  else expect(config.mcpServers.mtools.command).toBe('docker');
  expect(errors).toEqual([]);
  console.log(
    `${mode}: real operation, deep route, preferences, AI configuration and UI passed`,
  );
} finally {
  await cleanup();
}

async function cleanup() {
  if (native) {
    closeNative();
    let timeout;
    try {
      await Promise.race([
        exited,
        new Promise((resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Desktop did not exit')),
            15000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
    if (origin) {
      const reachable = await fetch(`${origin}/health/live`).then(
        () => true,
        () => false,
      );
      if (reachable) throw new Error('Desktop service survived window close');
    }
  } else {
    await browser?.close();
  }
}
