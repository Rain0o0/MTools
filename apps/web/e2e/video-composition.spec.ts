import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const version = JSON.parse(
  readFileSync(resolve(root, 'apps/web/package.json'), 'utf8'),
).version;
const fixtures = resolve(root, '.runtime/media-fixtures');

test.beforeAll(() => {
  execFileSync(
    'uv',
    ['run', '--frozen', 'python', 'scripts/create_media_fixtures.py', fixtures],
    { cwd: root, windowsHide: true },
  );
});

test('一次完成片段重排、画面调整和多个定时水印，并可下载', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/tools/video-editor');
  await page
    .getByLabel('选择并上传媒体文件', { exact: true })
    .setInputFiles(resolve(fixtures, 'source.mp4'));
  await expect(page.locator('.media-input .media-file-name')).toContainText(
    'source.mp4',
  );
  await page.getByRole('button', { name: '添加剪辑片段', exact: true }).click();
  await page.getByLabel('片段 1 开始（秒）').fill('1');
  await page.getByLabel('片段 1 结束（秒）').fill('0.5');
  await expect(
    page.getByText('结束时间须晚于开始时间。', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('片段 1 开始（秒）').fill('0');
  await page.getByRole('button', { name: '添加剪辑片段', exact: true }).click();
  await page.getByLabel('片段 2 开始（秒）').fill('1');
  await page.getByLabel('片段 2 结束（秒）').fill('1.5');
  await page.getByRole('button', { name: '上移片段 2', exact: true }).click();
  await expect(page.getByLabel('片段 1 开始（秒）')).toHaveValue('1');
  await page
    .getByText('画面与速度：旋转、镜像、缩放、调色', { exact: true })
    .click();
  await page.getByLabel('播放速度（倍）').fill('2');
  await page.getByLabel('顺时针旋转').selectOption('90');
  await page.getByLabel('输出宽度（像素，留空不缩放）').fill('120');
  await page.getByLabel('水平镜像').check();
  await page.getByLabel('黑白画面').check();
  await page.getByLabel('裁剪画面', { exact: true }).check();
  await page.getByLabel('裁剪宽度（像素）', { exact: true }).fill('160');
  await page.getByLabel('裁剪高度（像素）', { exact: true }).fill('120');
  for (let i = 1; i <= 2; i++) {
    await page
      .getByLabel('选择水印 / 贴图', { exact: true })
      .setInputFiles(resolve(fixtures, 'overlay.png'));
    await expect(page.locator('.media-options .media-file-name')).toContainText(
      'overlay.png',
    );
    await page
      .getByRole('button', { name: '添加此水印到组合', exact: true })
      .click();
    await page.getByLabel(`水印 ${i} 宽度`, { exact: true }).fill('24');
    await page
      .getByLabel(`水印 ${i} 显示开始（秒）`, { exact: true })
      .fill(i === 1 ? '0' : '0.2');
    await page
      .getByLabel(`水印 ${i} 显示结束（秒，留空到结尾）`, { exact: true })
      .fill(i === 1 ? '0.2' : '0.4');
  }
  await page.getByLabel('移除原视频声音').check();
  await expect(page.getByText(/一次生成：2 段/)).toContainText('2 个水印');
  await mkdir(resolve(root, 'docs/assets/media-tools'), { recursive: true });
  await page.screenshot({
    path: resolve(
      root,
      `docs/assets/media-tools/2026-10-20-v${version}-video-composition.png`,
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
  await page.screenshot({
    path: resolve(
      root,
      `docs/assets/media-tools/2026-10-20-v${version}-video-mobile.png`,
    ),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  const submitted = page.waitForRequest(
    '**/tools/video-editor/operations/edit/execute',
  );
  await page.getByRole('button', { name: '生成视频', exact: true }).click();
  const parameters = (await submitted).postDataJSON().parameters;
  expect(parameters.segments).toEqual([
    { start_seconds: 1, end_seconds: 1.5 },
    { start_seconds: 0, end_seconds: 0.5 },
  ]);
  expect(parameters.watermarks).toHaveLength(2);
  const result = page.getByRole('region', { name: '处理任务' });
  await expect(result.getByText('处理完成', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(result.locator('video')).toHaveJSProperty('videoWidth', 120);
  await expect(result.locator('video')).toHaveJSProperty('videoHeight', 160);
  const downloaded = page.waitForEvent('download');
  await result.getByRole('link', { name: '下载处理结果' }).click();
  expect((await downloaded).suggestedFilename()).toContain('处理结果');
  expect(errors).toEqual([]);
});
