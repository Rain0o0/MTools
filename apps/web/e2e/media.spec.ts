import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

const root = resolve(import.meta.dirname, '../../..');
const version = JSON.parse(
  readFileSync(resolve(root, 'apps/web/package.json'), 'utf8'),
).version;
const fixtures = resolve(root, '.runtime/media-fixtures');
test('媒体组件展示视频编码方式并支持重新检测', async ({ page }) => {
  await page.goto('/jobs');
  const panel = page.locator('.media-environment');
  await expect(
    panel.getByText('媒体组件已就绪，支持图片、视频和音频处理。'),
  ).toBeVisible();
  await expect(panel.getByText(/^视频编码：/)).toBeVisible();
  await panel.getByRole('button', { name: '重新检测' }).click();
  await expect(panel.getByRole('button', { name: '重新检测' })).toBeEnabled({
    timeout: 45000,
  });
  await expect(
    panel.getByText(/画面裁剪、叠加与声音处理仍使用 CPU/),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(
      root,
      'docs/assets/media-tools/2026-10-16-v07-gpu-status.png',
    ),
    fullPage: true,
  });
});

test.beforeAll(() => {
  execFileSync(
    'uv',
    ['run', '--frozen', 'python', 'scripts/create_media_fixtures.py', fixtures],
    { cwd: root, windowsHide: true },
  );
});

test('三种媒体完成导入、编辑、预览、下载，并在任务页保留记录', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (value) => errors.push(value.message));
  await mkdir(resolve(root, 'docs/assets/media-tools'), { recursive: true });
  for (const [kind, file, title] of [
    ['image', 'source.png', '图片'],
    ['video', 'source.mp4', '视频'],
    ['audio', 'source.wav', '音频'],
  ]) {
    await page.goto(`/tools/${kind}-editor`);
    await page
      .getByLabel('选择并上传媒体文件', { exact: true })
      .setInputFiles(resolve(fixtures, file));
    await expect(page.locator('.media-file-name')).toContainText(file, {
      timeout: 15000,
    });
    if (kind !== 'audio') {
      await page.getByLabel('裁剪画面').check();
      await page.getByLabel('裁剪宽度（像素）', { exact: true }).fill('160');
      await page.getByLabel('裁剪高度（像素）', { exact: true }).fill('120');
      await page
        .getByLabel('选择水印 / 贴图', { exact: true })
        .setInputFiles(resolve(fixtures, 'overlay.png'));
      await expect(
        page.getByLabel('选择水印 / 贴图', { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.locator('.media-options .media-file-name'),
      ).toContainText('overlay.png', { timeout: 30000 });
    } else {
      await page
        .getByLabel('选择配乐 / 音效', { exact: true })
        .setInputFiles(resolve(fixtures, 'source.wav'));
      await expect(
        page.locator('.media-options .media-file-name'),
      ).toContainText('source.wav', { timeout: 30000 });
    }
    if (kind !== 'image')
      await page.getByLabel('结束时间（秒，留空到结尾）').fill('1');
    await page
      .getByRole('button', { name: `生成${title}`, exact: true })
      .click();
    const result = page.getByRole('region', { name: '处理任务' });
    await expect(result.getByText('处理完成', { exact: true })).toBeVisible({
      timeout: 20000,
    });
    if (kind === 'image') {
      await expect(result.locator('img')).toHaveJSProperty('naturalWidth', 160);
      await page
        .getByRole('button', { name: '提供给 AI 使用', exact: true })
        .click();
      await expect(page.getByLabel('文件编号（可复制给 AI）')).toHaveValue(
        /^[a-f0-9]{32}$/,
      );
      await page
        .getByRole('button', { name: '停止向 AI 共享', exact: true })
        .click();
    } else
      await expect(
        result.locator(kind === 'video' ? 'video' : 'audio'),
      ).toHaveJSProperty('readyState', 4);
    const download = page.waitForEvent('download');
    await result.getByRole('link', { name: '下载处理结果' }).click();
    expect((await download).suggestedFilename()).toContain('处理结果');
    await page.screenshot({
      path: resolve(
        root,
        `docs/assets/media-tools/2026-10-20-v${version}-source-${kind}.png`,
      ),
      fullPage: true,
    });
    for (const width of [900, 390]) {
      await page.setViewportSize({ width, height: 800 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1280, height: 800 });
  }
  await page.goto('/jobs');
  await expect(page.getByText('处理完成', { exact: true })).toHaveCount(3);
  await page.getByRole('button', { name: '重新检测', exact: true }).click();
  await expect(
    page.getByText('媒体组件已就绪，支持图片、视频和音频处理。'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('组件不可用时有明确说明与重新检测入口', async ({ page }) => {
  await page.route('**/api/v1/tools', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    for (const entry of data.items)
      if (entry.manifest.tool_id === 'video-editor') {
        entry.status = 'unavailable';
        entry.reason = '未找到完整的媒体组件';
        entry.available_operations = [];
      }
    await route.fulfill({ response, json: data });
  });
  await page.goto('/tools/video-editor');
  await expect(
    page.getByText('未找到完整的媒体组件', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '重新检测', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '生成视频', exact: true }),
  ).toHaveCount(0);
});
