import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '../../..');
const mode = process.argv[2] ?? 'docker';
const version = JSON.parse(
  await readFile(resolve(root, 'apps/web/package.json'), 'utf8'),
).version;
const desktopDirectory =
  process.env.MTOOLS_DESKTOP_DIR ??
  resolve(root, `dist/desktop/v${version}/MTools`);
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
    const codexData = await mkdtemp(resolve(root, '.runtime/codex-delivery-'));
    processHandle = spawn(resolve(desktopDirectory, 'MTools.exe'), [], {
      cwd: data,
      windowsHide: false,
      env: {
        ...process.env,
        MTOOLS_DATA_DIR: data,
        CODEX_HOME: codexData,
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
  if (!native)
    await page.goto(process.env.MTOOLS_DOCKER_URL ?? 'http://127.0.0.1:18743/');
  await expect(
    page.getByRole('heading', { name: '工具目录', exact: true }),
  ).toBeVisible();
  origin = new URL(page.url()).origin;
  await expect(
    page.getByRole('link', { name: '打开工具' }).first(),
  ).toBeVisible();
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
      `docs/assets/platform-shell/2026-10-20-v${version}-${mode}-catalog.png`,
    ),
  });
  await page.getByRole('link', { name: '打开工具' }).first().click();
  await page.getByRole('button', { name: '填入示例' }).click();
  await page.getByRole('button', { name: '格式化 JSON' }).click();
  await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
    /MTools/,
  );
  await page.screenshot({
    path: resolve(
      root,
      `docs/assets/platform-shell/2026-10-20-v${version}-${mode}-json.png`,
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
  await page.getByRole('button', { name: '测试连接', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '工具连接正常' }),
  ).toContainText('4 项示例调用');
  if (native) {
    await expect(
      page.getByRole('button', { name: '添加到 Codex', exact: true }),
    ).toBeEnabled();
    await page
      .getByRole('button', { name: '添加到 Codex', exact: true })
      .click();
    await expect(page.getByText('配置已添加', { exact: true })).toBeVisible();
  }
  await page.screenshot({
    path: resolve(
      root,
      `docs/assets/platform-shell/2026-10-20-v${version}-${mode}-ai.png`,
    ),
  });
  await page.getByRole('button', { name: '获取连接信息' }).click();
  await expect(page.getByLabel('MTools 连接配置')).toHaveValue(/mcpServers/);
  const config = JSON.parse(
    await page.getByLabel('MTools 连接配置').inputValue(),
  );
  if (native) expect(config.mcpServers.mtools.command).toMatch(/MToolsAI.exe$/);
  else expect(config.mcpServers.mtools.command).toBe('docker');
  await page.getByRole('button', { name: '关闭说明' }).click();
  for (const [toolId, input, value, expected] of [
    ['text-codec', '输入文本', '中文', '5Lit5paH'],
    ['json-lines', '输入 JSON / JSONL', '[{"中文":true}]', '{"中文":true}\n'],
  ]) {
    await page.getByRole('link', { name: '工具目录', exact: true }).click();
    await page.locator(`a.card-link[href="/tools/${toolId}"]`).click();
    await page.getByLabel(input, { exact: true }).fill(value);
    await page.getByRole('button', { name: '开始处理' }).click();
    await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
      expected,
    );
  }
  await page.getByRole('link', { name: '工具目录', exact: true }).click();
  await page.locator('a.card-link[href="/tools/text-diff"]').click();
  await page.getByRole('button', { name: '填入示例' }).click();
  await page.getByRole('button', { name: '比较文本' }).click();
  await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
    /\+请使用中文回答，并给出验证方法/,
  );
  await page.screenshot({
    path: resolve(
      root,
      `docs/assets/platform-shell/2026-10-20-v${version}-${mode}-diff.png`,
    ),
  });
  const fixtures = resolve(root, '.runtime/media-fixtures');
  execFileSync(
    'uv',
    [
      'run',
      '--frozen',
      '--group',
      'desktop-build',
      'python',
      'scripts/create_media_fixtures.py',
      fixtures,
    ],
    { cwd: root, windowsHide: true },
  );
  await mkdir(resolve(root, 'docs/assets/media-tools'), { recursive: true });
  for (const [kind, filename, title] of [
    ['image', 'source.png', '图片'],
    ['video', 'source.mp4', '视频'],
    ['audio', 'source.wav', '音频'],
  ]) {
    await page.getByRole('link', { name: '工具目录', exact: true }).click();
    await page.locator(`a.card-link[href="/tools/${kind}-editor"]`).click();
    await page
      .getByLabel(native ? '导入媒体副本' : '选择并上传媒体文件', {
        exact: true,
      })
      .setInputFiles(resolve(fixtures, filename));
    await expect(page.locator('.media-input .media-file-name')).toContainText(
      filename,
      { timeout: 15000 },
    );
    if (kind !== 'audio') {
      await page.getByLabel('裁剪画面').check();
      await page.getByLabel('裁剪宽度（像素）', { exact: true }).fill('160');
      await page.getByLabel('裁剪高度（像素）', { exact: true }).fill('120');
      await page
        .getByLabel('选择水印 / 贴图', { exact: true })
        .setInputFiles(resolve(fixtures, 'overlay.png'));
      await expect(
        page.locator('.media-options .media-file-name'),
      ).toContainText('overlay.png', { timeout: 15000 });
    } else {
      await page
        .getByLabel('选择配乐 / 音效', { exact: true })
        .setInputFiles(resolve(fixtures, 'source.wav'));
      await expect(
        page.locator('.media-options .media-file-name'),
      ).toContainText('source.wav', { timeout: 15000 });
    }
    if (kind !== 'image')
      await page.getByLabel('结束时间（秒，留空到结尾）').fill('1');
    if (kind === 'video') {
      await page
        .getByRole('button', { name: '添加剪辑片段', exact: true })
        .click();
      await page.getByLabel('片段 1 结束（秒）').fill('0.5');
      await page
        .getByRole('button', { name: '添加剪辑片段', exact: true })
        .click();
      await page.getByLabel('片段 2 开始（秒）').fill('1');
      await page.getByLabel('片段 2 结束（秒）').fill('1.5');
      await page
        .getByText('画面与速度：旋转、镜像、缩放、调色', { exact: true })
        .click();
      await page.getByLabel('播放速度（倍）').fill('2');
      await page.getByLabel('顺时针旋转').selectOption('90');
      await page.getByLabel('输出宽度（像素，留空不缩放）').fill('120');
      await page.getByLabel('黑白画面').check();
      await page
        .getByRole('button', { name: '添加此水印到组合', exact: true })
        .click();
      await page.getByLabel('水印 1 显示结束（秒，留空到结尾）').fill('0.2');
      await page
        .getByLabel('选择水印 / 贴图', { exact: true })
        .setInputFiles(resolve(fixtures, 'overlay.png'));
      await expect(
        page.locator('.media-options .media-file-name'),
      ).toContainText('overlay.png');
      await page
        .getByRole('button', { name: '添加此水印到组合', exact: true })
        .click();
      await page.getByLabel('水印 2 显示开始（秒）').fill('0.2');
      await page.getByLabel('移除原视频声音').check();
    }
    await page
      .getByRole('button', { name: `生成${title}`, exact: true })
      .click();
    const result = page.getByRole('region', { name: '处理任务' });
    await expect(result.getByText('处理完成', { exact: true })).toBeVisible({
      timeout: 20000,
    });
    if (kind === 'image')
      await expect(result.locator('img')).toHaveJSProperty('naturalWidth', 160);
    else
      await expect(
        result.locator(kind === 'video' ? 'video' : 'audio'),
      ).toHaveJSProperty('readyState', 4);
    if (kind === 'video') {
      await expect(result.locator('video')).toHaveJSProperty('videoWidth', 120);
      await expect(result.locator('video')).toHaveJSProperty(
        'videoHeight',
        160,
      );
    }
    const downloadUrl = await result
      .getByRole('link', { name: '下载处理结果' })
      .getAttribute('href');
    const file = await page.evaluate(async (url) => {
      const response = await fetch(url);
      return {
        status: response.status,
        size: (await response.arrayBuffer()).byteLength,
      };
    }, downloadUrl);
    expect(file.status).toBe(200);
    expect(file.size).toBeGreaterThan(50);
    await page.screenshot({
      path: resolve(
        root,
        `docs/assets/media-tools/2026-10-20-v${version}-${mode}-${kind}.png`,
      ),
      fullPage: true,
    });
  }
  if (native)
    execFileSync(
      resolve(root, '.venv/Scripts/python.exe'),
      [
        'scripts/verify_windows_icon.py',
        '--directory',
        desktopDirectory,
        '--pid',
        String(processHandle.pid),
      ],
      { cwd: root, windowsHide: true, stdio: 'inherit' },
    );
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
