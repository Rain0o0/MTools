import { useEffect, useRef, useState } from 'react';
import { usePlatform } from '../platform/context';
import { ApiError, errorText } from './api';

type WorkbenchProps = {
  toolId: string;
  inputLabel: string;
  secondLabel?: string;
  sample: [string, string?] | ((choice: string) => [string, string?]);
  choices?: { label: string; value: string }[];
  choiceLabel?: string;
  filename: string;
  help: string;
  run: (
    text: string,
    second: string,
    choice: string,
    signal: AbortSignal,
  ) => Promise<{ text: string; summary: string }>;
};

export function TextWorkbench(props: WorkbenchProps) {
  const { catalog } = usePlatform();
  const manifest = catalog?.items.find(
    (entry) => entry.manifest.tool_id === props.toolId,
  )?.manifest;
  const [text, setText] = useState('');
  const [second, setSecond] = useState('');
  const [choice, setChoice] = useState(props.choices?.[0]?.value ?? '');
  const [result, setResult] = useState<{ text: string; summary: string }>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  useEffect(() => () => active.current?.abort(), []);

  function clearResult() {
    setResult(undefined);
    setError('');
    setNotice('');
  }

  async function execute(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    clearResult();
    const controller = new AbortController();
    active.current = controller;
    try {
      const value = await props.run(text, second, choice, controller.signal);
      if (!controller.signal.aborted) setResult(value);
    } catch (value) {
      if (!controller.signal.aborted)
        setError(
          `${errorText(value)}${value instanceof ApiError && value.requestId ? ` · 诊断编号 ${value.requestId}` : ''}`,
        );
    } finally {
      submitting.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob([result.text], { type: 'text/plain;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = props.filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`已生成下载文件 ${props.filename}`);
  }

  return (
    <>
      <header className="page-heading compact-heading">
        <div>
          <h1>{manifest?.name}</h1>
          <p>{manifest?.description}</p>
        </div>
        <a href="#tool-help" className="text-link">
          使用说明 ↘
        </a>
      </header>
      <form onSubmit={execute}>
        <div
          className={`editor-grid ${props.secondLabel ? 'comparison-inputs' : ''}`}
        >
          <section className="editor-panel">
            <div className="panel-heading">
              <label htmlFor="text-input">{props.inputLabel}</label>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => {
                  const sample =
                    typeof props.sample === 'function'
                      ? props.sample(choice)
                      : props.sample;
                  setText(sample[0]);
                  setSecond(sample[1] ?? '');
                  clearResult();
                }}
              >
                填入示例
              </button>
            </div>
            <textarea
              id="text-input"
              value={text}
              maxLength={props.secondLabel ? 50000 : 100000}
              spellCheck={false}
              disabled={busy}
              aria-invalid={!!error}
              onChange={(event) => {
                setText(event.target.value);
                clearResult();
              }}
              placeholder="在这里粘贴文本"
            />
            <p className="editor-footer">
              不自动保存输入<span>{text.length.toLocaleString()} 字符</span>
            </p>
          </section>
          {props.secondLabel && (
            <section className="editor-panel">
              <div className="panel-heading">
                <label htmlFor="second-input">{props.secondLabel}</label>
              </div>
              <textarea
                id="second-input"
                value={second}
                maxLength={50000}
                spellCheck={false}
                disabled={busy}
                onChange={(event) => {
                  setSecond(event.target.value);
                  clearResult();
                }}
                placeholder="粘贴修改后的文本"
              />
              <p className="editor-footer">
                保留行尾换行差异
                <span>{second.length.toLocaleString()} 字符</span>
              </p>
            </section>
          )}
          {!props.secondLabel && (
            <WorkbenchResult
              result={result}
              download={download}
              onNotice={setNotice}
            />
          )}
        </div>
        <div className="operation-bar">
          <div className="parameters">
            {props.choices && (
              <label>
                {props.choiceLabel ?? '处理方式'}{' '}
                <select
                  aria-label={props.choiceLabel ?? '处理方式'}
                  value={choice}
                  disabled={busy}
                  onChange={(event) => {
                    setChoice(event.target.value);
                    clearResult();
                  }}
                >
                  {props.choices.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button type="submit" className="primary" disabled={busy}>
            {busy
              ? '正在处理…'
              : props.secondLabel
                ? '比较文本 →'
                : '开始处理 →'}
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {result && (
        <p role="status" className="notice success">
          {result.summary}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {props.secondLabel && (
        <WorkbenchResult
          result={result}
          download={download}
          onNotice={setNotice}
        />
      )}
      <details className="tool-help" id="tool-help">
        <summary>输入要求与使用提示</summary>
        <p>{props.help}</p>
        <p>
          输入和结果不自动保存；离开前可复制或下载需要的内容。AI
          调用使用相同处理规则。
        </p>
      </details>
    </>
  );
}

function WorkbenchResult({
  result,
  download,
  onNotice,
}: {
  result: { text: string; summary: string } | undefined;
  download: () => void;
  onNotice: (value: string) => void;
}) {
  return (
    <section className="editor-panel">
      <div className="panel-heading">
        <label htmlFor="text-output">处理结果</label>
        <div className="result-actions">
          <button
            type="button"
            className="text-button"
            disabled={!result || !navigator.clipboard}
            onClick={() => {
              if (result)
                navigator.clipboard
                  .writeText(result.text)
                  .then(() => onNotice('结果已复制'))
                  .catch(() => onNotice('复制未成功，请选中结果手动复制'));
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
        id="text-output"
        value={result?.text ?? ''}
        readOnly
        spellCheck={false}
        placeholder={result ? '没有差异或结果为空' : '处理结果会显示在这里'}
      />
      <p className="editor-footer">
        {result ? '处理完成' : '等待处理'}
        <span>支持复制与下载</span>
      </p>
    </section>
  );
}
