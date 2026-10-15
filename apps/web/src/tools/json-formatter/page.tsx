import { useEffect, useRef, useState } from 'react';
import { ApiError, errorText, request } from '../../shared/api';
import type { Schemas } from '../../shared/api';

export default function JsonFormatterPage() {
  const [text, setText] = useState('');
  const [indent, setIndent] = useState<2 | 4>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [compact, setCompact] = useState(false);
  const [result, setResult] = useState<Schemas['JsonResult']>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const active = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  useEffect(() => () => active.current?.abort(), []);

  async function execute(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (!text.trim()) {
      setError('请先输入 JSON 文本');
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    setNotice('');
    const controller = new AbortController();
    active.current = controller;
    const body: Schemas['JsonExecuteRequest'] = {
      contract_version: 1,
      parameters: { text, indent, sort_keys: sortKeys, compact },
    };
    try {
      const value = await request(
        '/tools/json-formatter/operations/format/execute',
        'JsonResult',
        {
          method: 'POST',
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
      setResult(value);
    } catch (value) {
      setError(
        `${errorText(value)}${value instanceof ApiError && value.requestId ? ` · 诊断编号 ${value.requestId}` : ''}`,
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob([result.text], { type: 'application/json;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'formatted.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('已生成下载文件 formatted.json');
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">文本整理 / JSON</p>
          <h1>JSON 格式化</h1>
          <p>整理结构、校验格式，也可以压缩成一行。中文原样保留。</p>
        </div>
        <a className="text-link" href="#tool-help">
          使用说明 ↘
        </a>
      </header>
      <form onSubmit={execute}>
        <div className="editor-grid">
          <section className="editor-panel">
            <div className="panel-heading">
              <label htmlFor="json-input">输入 JSON</label>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setText(
                    '{"项目":"MTools","工具":["JSON 格式化"],"就绪":true}',
                  );
                  setError(undefined);
                }}
              >
                填入示例
              </button>
            </div>
            <textarea
              id="json-input"
              aria-describedby="input-hint"
              aria-invalid={!!error}
              value={text}
              maxLength={100000}
              onChange={(event) => {
                setText(event.target.value);
                setResult(undefined);
                setError(undefined);
              }}
              placeholder={'{\n  "你好": "世界"\n}'}
              spellCheck={false}
              disabled={busy}
            />
            <p id="input-hint" className="editor-footer">
              最多 100,000 字符 · 不自动保存输入
              <span>{text.length.toLocaleString()} 字符</span>
            </p>
          </section>
          <section className="editor-panel">
            <div className="panel-heading">
              <label htmlFor="json-output">处理结果</label>
              <div className="result-actions">
                <button
                  type="button"
                  className="text-button"
                  disabled={!result || !navigator.clipboard}
                  title={
                    !navigator.clipboard
                      ? '当前环境不支持复制，请选择结果手动复制'
                      : undefined
                  }
                  onClick={() => {
                    if (result)
                      navigator.clipboard
                        .writeText(result.text)
                        .then(() => setNotice('结果已复制'))
                        .catch(() =>
                          setNotice('复制未成功，请选中结果手动复制'),
                        );
                  }}
                >
                  复制
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={!result}
                  onClick={download}
                >
                  下载
                </button>
              </div>
            </div>
            <textarea
              id="json-output"
              value={result?.text ?? ''}
              readOnly
              placeholder="处理后的 JSON 会显示在这里"
              spellCheck={false}
            />
            <p className="editor-footer">
              {result ? '处理完成' : '等待处理'}
              <span>
                {result
                  ? `${result.output_bytes.toLocaleString()} 字节`
                  : '支持复制与下载'}
              </span>
            </p>
          </section>
        </div>
        <div className="operation-bar">
          <div className="parameters">
            <label>
              缩进{' '}
              <select
                value={indent}
                disabled={compact || busy}
                onChange={(event) =>
                  setIndent(event.target.value === '4' ? 4 : 2)
                }
              >
                <option value="2">2 个空格</option>
                <option value="4">4 个空格</option>
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={sortKeys}
                disabled={busy}
                onChange={(event) => setSortKeys(event.target.checked)}
              />
              按键名排序
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={compact}
                disabled={busy}
                onChange={(event) => setCompact(event.target.checked)}
              />
              压缩为一行
            </label>
          </div>
          <button className="primary" disabled={busy} type="submit">
            {busy ? '正在处理…' : compact ? '压缩 JSON' : '格式化 JSON'}{' '}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
      {busy && <p role="status">正在校验并处理文本…</p>}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {result && (
        <p className="notice success" role="status">
          JSON 处理完成，可以复制结果或下载文件。
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <section className="tool-help" id="tool-help">
        <h2>一点使用提示</h2>
        <details>
          <summary>哪些内容可以整理？</summary>
          <p>
            输入必须是标准 JSON。重复键、NaN、Infinity
            和过深嵌套会被拒绝；错误会提示位置或原因，输入始终保留。
          </p>
        </details>
        <details>
          <summary>大数字与保存结果</summary>
          <p>
            很长的数字或小数可能发生精度或书写形式变化。需要逐字保留大数精度时，请把数字放在双引号中。结果不会自动保存为历史记录，可通过复制或下载自行保存。
          </p>
        </details>
      </section>
    </>
  );
}
