import { TextWorkbench } from '../../shared/text-workbench';
import { request } from '../../shared/api';
import type { Schemas } from '../../shared/api';

export default function TextDiffPage() {
  return (
    <TextWorkbench
      toolId="text-diff"
      inputLabel="原始文本"
      secondLabel="修改后文本"
      sample={[
        '你是一个开发助手。\n请使用中文回答。\n',
        '你是一个开发助手。\n请使用中文回答，并给出验证方法。\n',
      ]}
      filename="changes.diff"
      help="每份文本最多 50,000 字符、2,000 行。以行为单位比较，保留空格与行尾换行差异；结果中 + 表示新增，- 表示删除。默认保留 3 行上下文。"
      run={async (old_text, new_text, _choice, signal) => {
        const body: Schemas['DiffExecuteRequest'] = {
          contract_version: 1,
          parameters: { old_text, new_text, context_lines: 3 },
        };
        const result = await request(
          '/tools/text-diff/operations/compare/execute',
          'DiffResult',
          { method: 'POST', body: JSON.stringify(body), signal },
        );
        return {
          text: result.text,
          summary: result.identical
            ? '两份文本完全相同。'
            : `新增 ${result.added_lines} 行，删除 ${result.removed_lines} 行。`,
        };
      }}
    />
  );
}
