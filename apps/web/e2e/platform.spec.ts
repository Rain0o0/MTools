import { expect, test } from '@playwright/test';

test('卡片、标签、状态说明和 AI 接入可以操作', async ({ page }) => {
  await page.goto('/');
  const status = page
    .getByRole('button', { name: '可使用', exact: true })
    .first();
  await status.click();
  await expect(page.getByRole('dialog')).toContainText('工具已就绪');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(status).toBeFocused();
  await page.locator('.tags button').first().click();
  await expect(page.getByRole('textbox', { name: '搜索工具' })).not.toHaveValue(
    '',
  );
  await page
    .locator('.tool-card')
    .first()
    .click({ position: { x: 30, y: 95 } });
  await expect(page).toHaveURL(/tools\/json-formatter/);
  await page.getByRole('link', { name: 'AI 助手', exact: true }).click();
  await page.getByRole('button', { name: '获取连接信息' }).click();
  const config = page.getByLabel('MTools 连接配置');
  await expect(config).toHaveValue(/mcpServers/);
  const data: unknown = JSON.parse(await config.inputValue());
  expect(data).toMatchObject({
    mcpServers: { mtools: { args: ['-m', 'mtools', 'mcp'] } },
  });
  await page.getByRole('button', { name: '关闭说明' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('搜索、工具执行、错误恢复、下载与深层刷新', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: '工具目录', exact: true }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: '搜索工具' }).fill('不存在');
  await expect(
    page.getByRole('heading', { name: '没有找到匹配的工具' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '清除筛选' }).click();
  await page.getByRole('link', { name: '打开工具' }).first().click();
  await page.getByRole('button', { name: '填入示例' }).click();
  await page.getByRole('button', { name: '格式化 JSON' }).click();
  await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
    /"项目": "MTools"/,
  );
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('formatted.json');
  await page.getByLabel('输入 JSON', { exact: true }).fill('{');
  await page.getByRole('button', { name: '格式化 JSON' }).click();
  await expect(page.getByRole('alert')).toContainText('第 1 行');
  await expect(page.getByLabel('输入 JSON', { exact: true })).toHaveValue('{');
  await page
    .getByLabel('输入 JSON', { exact: true })
    .fill('{"b":2,"a":"中文"}');
  await page.getByLabel('按键名排序').check();
  await page.getByLabel('压缩为一行').check();
  await page.getByRole('button', { name: '压缩 JSON' }).click();
  await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
    '{"a":"中文","b":2}',
  );
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'JSON 格式化', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('主题、导航、窄屏与无横向溢出', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('界面主题').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByLabel('界面主题')).toHaveValue('dark');
  await page.getByLabel('界面主题').selectOption('light');
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 900, height: 600 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of [
      '/',
      '/tools/json-formatter',
      '/tools/text-diff',
      '/tools/json-lines',
      '/tools/text-codec',
      '/ai',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.getByRole('button', { name: '展开导航' }).click();
  await page.getByRole('link', { name: '帮助', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '帮助', exact: true }),
  ).toBeVisible();
});

test('连接失效保留输入，重连后可重新执行', async ({ page }) => {
  await page.goto('/tools/json-formatter');
  await page.getByRole('button', { name: '填入示例' }).click();
  await page.context().clearCookies();
  await page.getByRole('button', { name: '格式化 JSON' }).click();
  await expect(page.getByRole('alert')).toContainText('会话已失效');
  await expect(page.getByLabel('输入 JSON', { exact: true })).toHaveValue(
    /MTools/,
  );
  await page.getByRole('button', { name: '格式化 JSON' }).click();
  await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
    /MTools/,
  );
});

test('异常响应和停用工具提供恢复入口', async ({ page }) => {
  await page.route('**/api/v1/tools', (route) =>
    route.fulfill({ json: { items: 'invalid' } }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('无法识别的数据');
  await page.unroute('**/api/v1/tools');
  await page.getByRole('button', { name: '重新连接' }).click();
  await expect(
    page.getByRole('link', { name: '打开工具' }).first(),
  ).toBeVisible();
  await page.route('**/api/v1/tools', async (route) => {
    const response = await route.fetch();
    const json: unknown = await response.json();
    if (
      json &&
      typeof json === 'object' &&
      'items' in json &&
      Array.isArray(json.items)
    ) {
      for (const item of json.items) {
        item.status = 'disabled';
        item.reason = '此工具已由配置停用';
        item.available_operations = [];
      }
    }
    await route.fulfill({ json });
  });
  await page.goto('/tools/json-formatter');
  await expect(page.getByText('此工具已由配置停用')).toBeVisible();
  await expect(page.getByRole('button', { name: '格式化 JSON' })).toHaveCount(
    0,
  );
  await page.getByRole('link', { name: '返回目录' }).click();
  await expect(page.getByText('已停用', { exact: true }).first()).toBeVisible();
});

test('常用工具可调整并在主题切换和刷新后保留', async ({ page }) => {
  await page.goto('/');
  const shortcuts = page.getByRole('region', { name: '常用工具' });
  await expect(shortcuts.getByRole('link', { name: '文本差异' })).toBeVisible();
  await page
    .getByRole('button', { name: '取消常用 文本差异', exact: true })
    .click();
  await expect(shortcuts.getByRole('link', { name: '文本差异' })).toHaveCount(
    0,
  );
  await page.goto('/settings');
  await page.getByLabel('界面主题').selectOption('dark');
  await expect(page.getByLabel('界面主题')).toBeEnabled();
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: '设为常用 文本差异', exact: true }),
  ).toBeEnabled();
  await expect(shortcuts.getByRole('link', { name: '文本差异' })).toHaveCount(
    0,
  );
  await page
    .getByRole('button', { name: '设为常用 文本差异', exact: true })
    .click();
  await expect(shortcuts.getByRole('link', { name: '文本差异' })).toBeVisible();
  await shortcuts.getByRole('link', { name: '文本差异' }).click();
  await expect(
    page.getByRole('heading', { name: '文本差异', exact: true }),
  ).toBeVisible();
});

test('开发工具完成差异、数据转换、编码及错误恢复', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/tools/text-diff');
  await page.getByRole('button', { name: '填入示例' }).click();
  await page.getByRole('button', { name: '比较文本' }).click();
  await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
    /\+请使用中文回答，并给出验证方法/,
  );
  await page
    .getByLabel('修改后文本')
    .fill(await page.getByLabel('原始文本').inputValue());
  await page.getByRole('button', { name: '比较文本' }).click();
  await expect(page.getByRole('status')).toContainText('完全相同');
  await page.goto('/tools/json-lines');
  await page.getByLabel('输入 JSON / JSONL').fill('[{"中文":1},2]');
  await page.getByRole('button', { name: '开始处理' }).click();
  await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
    '{"中文":1}\n2\n',
  );
  await page.getByLabel('处理方式').selectOption('jsonl-to-json');
  await page.getByLabel('输入 JSON / JSONL').fill('{"中文":1}\n2');
  await page.getByRole('button', { name: '开始处理' }).click();
  await expect(page.getByRole('status')).toContainText('2 条记录');
  await page.goto('/tools/text-codec');
  await page.getByLabel('输入文本').fill('中文');
  await page.getByRole('button', { name: '开始处理' }).click();
  await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
    '5Lit5paH',
  );
  await page.getByLabel('处理方式').selectOption('base64-decode');
  await page.getByRole('button', { name: '开始处理' }).click();
  await expect(page.getByRole('alert')).toContainText('无法转换');
  await expect(page.getByLabel('输入文本')).toHaveValue('中文');
  await page.getByLabel('输入文本').fill('5Lit5paH');
  await page.getByRole('button', { name: '开始处理' }).click();
  await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
    '中文',
  );
  for (const [action, expected] of [
    ['base64-decode', '中文'],
    ['url-decode', '中文'],
    [
      'sha256',
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    ],
  ]) {
    await page.getByLabel('处理方式').selectOption(action);
    await page.getByRole('button', { name: '填入示例' }).click();
    await page.getByRole('button', { name: '开始处理' }).click();
    await expect(page.getByLabel('处理结果', { exact: true })).toHaveValue(
      expected,
    );
  }
  expect(errors).toEqual([]);
});

test('Codex 专用配置和真实连接测试', async ({ page }) => {
  await page.goto('/ai');
  await page.getByText('查看 Codex 专用配置', { exact: true }).click();
  await expect(page.getByLabel('Codex 连接配置', { exact: true })).toHaveValue(
    /\[mcp_servers.mtools\]/,
  );
  await expect(
    page.getByRole('button', { name: '添加到 Codex' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: '测试连接', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '工具连接正常' }),
  ).toContainText('4 项示例调用');
});
