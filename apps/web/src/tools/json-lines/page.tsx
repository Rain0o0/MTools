import { TextWorkbench } from '../../shared/text-workbench';
import { request } from '../../shared/api';
import type { Schemas } from '../../shared/api';

export default function JsonLinesPage() {
  return (
    <TextWorkbench
      toolId="json-lines"
      inputLabel="输入 JSON / JSONL"
      sample={(choice) => [
        choice === 'jsonl-to-json'
          ? '{"角色":"用户","内容":"你好"}\n{"角色":"助手","内容":"有什么可以帮你？"}\n'
          : '[{"角色":"用户","内容":"你好"},{"角色":"助手","内容":"有什么可以帮你？"}]',
      ]}
      choices={[
        { label: 'JSON 数组 → JSONL', value: 'json-to-jsonl' },
        { label: 'JSONL → JSON 数组', value: 'jsonl-to-json' },
      ]}
      filename="converted.txt"
      help="最多 100,000 字符、2,000 条记录、64 层嵌套。转为 JSONL 时须输入数组；转为 JSON 时每行一个 JSON 值，空白行忽略。拒绝重复键与非有限数值；精度敏感的数字请使用字符串。"
      run={async (text, _second, choice, signal) => {
        const body: Schemas['JsonLinesExecuteRequest'] = {
          contract_version: 1,
          parameters: {
            text,
            direction:
              choice === 'jsonl-to-json' ? 'jsonl-to-json' : 'json-to-jsonl',
          },
        };
        const result = await request(
          '/tools/json-lines/operations/convert/execute',
          'JsonLinesResult',
          { method: 'POST', body: JSON.stringify(body), signal },
        );
        return {
          text: result.text,
          summary: `已转换 ${result.records} 条记录。`,
        };
      }}
    />
  );
}
