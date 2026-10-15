import { TextWorkbench } from '../../shared/text-workbench';
import { request } from '../../shared/api';
import type { Schemas } from '../../shared/api';

const choices = [
  { label: 'Base64 编码', value: 'base64-encode' },
  { label: 'Base64 解码', value: 'base64-decode' },
  { label: 'URL 编码', value: 'url-encode' },
  { label: 'URL 解码', value: 'url-decode' },
  { label: 'SHA-256 摘要', value: 'sha256' },
] as const;

export default function TextCodecPage() {
  return (
    <TextWorkbench
      toolId="text-codec"
      inputLabel="输入文本"
      sample={(choice) => [
        choice === 'base64-decode'
          ? '5Lit5paH'
          : choice === 'url-decode'
            ? '%E4%B8%AD%E6%96%87'
            : choice === 'sha256'
              ? 'abc'
              : '你好，MTools！',
      ]}
      choices={[...choices]}
      filename="result.txt"
      help="最多 100,000 字符。仅处理 UTF-8 文本；Base64 使用标准字母表，不接受空白。URL 编码适用于单个参数值，解码保留加号。SHA-256 是单向摘要，Base64 与 URL 编码均不是加密，请勿用来隐藏密钥。"
      run={async (text, _second, choice, signal) => {
        const action =
          choices.find((item) => item.value === choice)?.value ??
          'base64-encode';
        const body: Schemas['CodecExecuteRequest'] = {
          contract_version: 1,
          parameters: { text, action },
        };
        const result = await request(
          '/tools/text-codec/operations/transform/execute',
          'CodecResult',
          { method: 'POST', body: JSON.stringify(body), signal },
        );
        return {
          text: result.text,
          summary: `处理完成，结果 ${result.output_bytes.toLocaleString()} 字节。`,
        };
      }}
    />
  );
}
