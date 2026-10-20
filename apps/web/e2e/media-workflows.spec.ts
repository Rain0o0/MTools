import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const fixtures = resolve(root, '.runtime/workflow-fixtures');
const screenshots = resolve(root, 'docs/assets/media-workflows');

test.beforeAll(async () => {
  execFileSync(
    'uv',
    ['run', '--frozen', 'python', 'scripts/create_media_fixtures.py', fixtures],
    { cwd: root, windowsHide: true },
  );
  await mkdir(screenshots, { recursive: true });
});

test('视频拼接可调整顺序、完成任务并下载结果', async ({ page }) => {
  await page.goto('/tools/video-concat');
  const content = await readFile(resolve(fixtures, 'source.mp4'));
  await page.getByLabel('导入视频（可多选）').setInputFiles([
    { name: '第一段.mp4', mimeType: 'video/mp4', buffer: content },
    { name: '第二段.mp4', mimeType: 'video/mp4', buffer: content },
  ]);
  const list = page.locator('.workflow-sources');
  await expect(list.locator('li')).toHaveCount(2);
  await page.getByRole('button', { name: '上移第 2 段' }).click();
  await expect(list.locator('li').first()).toContainText('第二段.mp4');
  await page.getByRole('button', { name: '拼接视频', exact: true }).click();
  const result = page.getByRole('region', { name: '处理任务' });
  await expect(result.getByText('处理完成', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(result.locator('video')).toHaveJSProperty('readyState', 4);
  const download = page.waitForEvent('download');
  await result.getByRole('link', { name: '下载处理结果' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.mp4$/);
  await page.screenshot({
    path: resolve(screenshots, '2026-10-19-concat.png'),
    fullPage: true,
  });
});

test('字幕配音说明数据去向、缺模型链接及窄屏可用', async ({ page }) => {
  await page.goto('/tools/subtitle-speaker');
  await expect(page.getByText('自动选择：Edge TTS')).toBeVisible();
  await page
    .getByLabel('或粘贴完整字幕（SRT / WebVTT，最多 200 条）')
    .fill('1\n00:00:01,000 --> 00:00:08,000\n你好，这是示例字幕。');
  const submit = page.getByRole('button', { name: '生成配音', exact: true });
  await expect(submit).toBeDisabled();
  await page.getByLabel('允许将字幕正文发送至微软在线语音服务').check();
  await expect(submit).toBeEnabled();
  await page.getByLabel('语音引擎').selectOption('qwen');
  await expect(
    page.getByRole('link', { name: '下载官方模型' }),
  ).toHaveAttribute(
    'href',
    'https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice',
  );
  await submit.click();
  await expect(page.getByRole('alert')).toContainText('未找到可用的 Qwen3-TTS');
  await page.screenshot({
    path: resolve(screenshots, '2026-10-19-subtitle-speech.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(submit).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: resolve(screenshots, '2026-10-19-subtitle-speech-narrow.png'),
    fullPage: true,
  });
});

test('Whisper 页面在缺模型时保留输入并提供下载说明', async ({ page }) => {
  await page.goto('/tools/speech-transcriber');
  await page
    .getByLabel('导入音频或视频')
    .setInputFiles(resolve(fixtures, 'source.wav'));
  await expect(page.locator('.workflow-sources')).toContainText('source.wav', {
    timeout: 15000,
  });
  await page.getByRole('button', { name: '生成字幕', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Whisper');
  await expect(page.locator('.workflow-sources')).toContainText('source.wav');
  await expect(
    page.getByRole('link', { name: '官方安装和模型下载说明' }),
  ).toHaveAttribute('href', 'https://github.com/openai/whisper');
  await page.screenshot({
    path: resolve(screenshots, '2026-10-19-transcribe.png'),
    fullPage: true,
  });
});
