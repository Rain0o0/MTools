import { useEffect, useState } from 'react';
import { errorText, request } from './api';
import type { Schemas } from './api';
import { JobResult } from './media-workbench';

type Workflow = 'video-concat' | 'speech-transcriber' | 'subtitle-speaker';
type Artifact = Schemas['Artifact'];
const active = new Set(['queued', 'running', 'cancel_requested']);
const descriptions = {
  'video-concat':
    '按列表顺序拼接 2–16 段视频，自动统一画面和音轨，输出 MP4。总时长最多 1 小时。',
  'speech-transcriber':
    '使用本地 Whisper 识别音频或视频中的声音，生成带时间轴的字幕；素材不上传至识别服务。',
  'subtitle-speaker':
    '将 SRT 或 WebVTT 字幕变成配音，保留时间轴中的停顿，输出 WAV 或 MP3。',
};

export default function MediaWorkflows({ tool }: { tool: Workflow }) {
  const [sources, setSources] = useState<Artifact[]>([]);
  const [library, setLibrary] = useState<Artifact[]>([]);
  const [environment, setEnvironment] =
    useState<Schemas['SpeechEnvironment']>();
  const [job, setJob] = useState<Schemas['Job']>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [model, setModel] = useState('base');
  const [language, setLanguage] = useState('');
  const [audioStream, setAudioStream] = useState(0);
  const [format, setFormat] = useState(
    tool === 'speech-transcriber' ? 'srt' : 'wav',
  );
  const [engine, setEngine] = useState('auto');
  const [network, setNetwork] = useState(false);
  const [voice, setVoice] = useState('zh-CN-XiaoxiaoNeural');
  const [speaker, setSpeaker] = useState('Vivian');
  const [qwenLanguage, setQwenLanguage] = useState('Auto');
  const [instruct, setInstruct] = useState('');
  const [rate, setRate] = useState(0);
  const [fit, setFit] = useState('speed-up');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [fps, setFps] = useState(30);
  const concat = tool === 'video-concat';
  const tts = tool === 'subtitle-speaker';
  const selectedEngine =
    engine === 'auto' ? environment?.preferred_engine : engine;
  const validKind = (item: Artifact) =>
    concat
      ? item.info.kind === 'video'
      : tts
        ? item.info.kind === 'subtitle'
        : item.info.has_audio;
  const locked = busy || (!!job && active.has(job.status));

  useEffect(() => {
    const controller = new AbortController();
    request('/artifacts/library', 'ArtifactList', { signal: controller.signal })
      .then((value) => setLibrary(value.items))
      .catch((value: unknown) => {
        if (!controller.signal.aborted) setError(errorText(value));
      });
    if (tool !== 'video-concat') {
      request('/media/speech-environment', 'SpeechEnvironment', {
        signal: controller.signal,
      })
        .then(setEnvironment)
        .catch((value: unknown) => {
          if (!controller.signal.aborted) setError(errorText(value));
        });
    }
    return () => controller.abort();
  }, [tool]);

  useEffect(() => {
    if (!job || !active.has(job.status)) return;
    const controller = new AbortController();
    const timer = window.setInterval(() => {
      request(`/jobs/${job.job_id}`, 'Job', { signal: controller.signal })
        .then(setJob)
        .catch((value: unknown) => {
          if (!controller.signal.aborted) setError(errorText(value));
        });
    }, 1500);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [job]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    try {
      const items: Artifact[] = [];
      if (concat && sources.length + files.length > 16)
        throw new Error('最多拼接 16 段视频。');
      for (const file of Array.from(files)) {
        if (file.size > (tts ? 300000 : 256 * 1024 * 1024))
          throw new Error(
            tts ? '字幕不能超过 300 KB。' : '单文件不能超过 256 MiB。',
          );
        const item = await request(
          `/artifacts/upload?name=${encodeURIComponent(file.name)}`,
          'Artifact',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: file,
          },
        );
        if (!validKind(item)) throw new Error('文件类型与当前工具不符。');
        items.push(item);
      }
      setSources((value) => (concat ? [...value, ...items] : items.slice(-1)));
      if (tts) setText('');
      setLibrary((value) => [...items, ...value]);
    } catch (value) {
      setError(errorText(value));
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, direction: number) {
    setSources((value) => {
      const next = [...value];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      let parameters: Record<string, unknown>;
      let operation: string;
      if (concat) {
        operation = 'concat';
        parameters = {
          sources: sources.map((item) => ({ artifact_id: item.artifact_id })),
          fps,
          width: width ? Number(width) : null,
          height: height ? Number(height) : null,
        };
      } else if (tts) {
        operation = 'synthesize';
        parameters = {
          ...(text.trim()
            ? { subtitle_text: text }
            : { artifact_id: sources[0]?.artifact_id }),
          engine,
          allow_network: network,
          voice,
          speaker,
          language: qwenLanguage,
          instruct,
          rate,
          fit,
          output_format: format,
        };
      } else {
        operation = 'transcribe';
        parameters = {
          artifact_id: sources[0]?.artifact_id,
          model,
          language: language || null,
          audio_stream: audioStream,
          output_format: format,
        };
      }
      setJob(
        await request(`/tools/${tool}/operations/${operation}/execute`, 'Job', {
          method: 'POST',
          body: JSON.stringify({ contract_version: 1, parameters }),
        }),
      );
    } catch (value) {
      setError(errorText(value));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!job) return;
    try {
      setJob(
        await request(`/jobs/${job.job_id}/cancel`, 'Job', { method: 'POST' }),
      );
    } catch (value) {
      setError(errorText(value));
    }
  }

  return (
    <div className="media-workspace workflow-workspace">
      <header className="page-heading">
        <div>
          <p className="eyebrow">媒体工具</p>
          <h1>{concat ? '视频拼接' : tts ? '字幕生成音频' : '音视频转字幕'}</h1>
          <p>{descriptions[tool]}</p>
        </div>
      </header>
      <form className="panel" onSubmit={submit}>
        <fieldset disabled={locked}>
          <legend>
            {concat ? '视频与拼接顺序' : tts ? '字幕输入' : '音频或视频输入'}
          </legend>
          <label className="media-field">
            {concat
              ? '导入视频（可多选）'
              : tts
                ? '导入字幕文件（UTF-8）'
                : '导入音频或视频'}
            <input
              type="file"
              multiple={concat}
              accept={
                concat
                  ? '.mp4,.mov,.mkv,.webm'
                  : tts
                    ? '.srt,.vtt'
                    : '.mp3,.wav,.flac,.ogg,.m4a,.mp4,.mov,.mkv,.webm'
              }
              onChange={(event) => {
                void upload(event.target.files);
                event.target.value = '';
              }}
            />
          </label>
          <p className="muted">
            文件导入 MTools 资源库，原文件不覆盖。音视频单文件最多 256
            MiB，字幕最多 300 KB。
          </p>
          <label className="media-field">
            从资源库选择
            <select
              value=""
              onChange={(event) => {
                const item = library.find(
                  (entry) => entry.artifact_id === event.target.value,
                );
                if (item) {
                  setSources((value) =>
                    concat ? [...value, item].slice(0, 16) : [item],
                  );
                  if (tts) setText('');
                }
              }}
            >
              <option value="">选择已有文件…</option>
              {library
                .filter((item) => item.available && validKind(item))
                .map((item) => (
                  <option key={item.artifact_id} value={item.artifact_id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <ol className="workflow-sources">
            {sources.map((item, index) => (
              <li key={`${item.artifact_id}-${index}`}>
                <span>{item.name}</span>
                {concat && (
                  <>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={`上移第 ${index + 1} 段`}
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      disabled={index === sources.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={`下移第 ${index + 1} 段`}
                    >
                      下移
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setSources((value) =>
                      value.filter((_, position) => position !== index),
                    )
                  }
                >
                  移除
                </button>
              </li>
            ))}
          </ol>
          {tts && (
            <label className="media-field">
              或粘贴完整字幕（SRT / WebVTT，最多 200 条）
              <textarea
                rows={9}
                maxLength={100000}
                value={text}
                placeholder={
                  '1\n00:00:00,000 --> 00:00:05,000\n你好，欢迎使用 MTools。'
                }
                onChange={(event) => {
                  setText(event.target.value);
                  if (event.target.value) setSources([]);
                }}
              />
            </label>
          )}
        </fieldset>
        <fieldset disabled={locked}>
          <legend>输出设置</legend>
          {concat ? (
            <div className="media-row">
              <label className="media-field">
                输出宽度（留空用首段）
                <input
                  type="number"
                  min={2}
                  max={4096}
                  value={width}
                  onChange={(event) => setWidth(event.target.value)}
                />
              </label>
              <label className="media-field">
                输出高度（与宽度同时填写）
                <input
                  type="number"
                  min={2}
                  max={4096}
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                />
              </label>
              <label className="media-field">
                帧率
                <input
                  type="number"
                  min={1}
                  max={120}
                  required
                  value={fps}
                  onChange={(event) => setFps(Number(event.target.value))}
                />
              </label>
            </div>
          ) : (
            <>
              <label className="media-field">
                输出格式
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                >
                  {(tts ? ['wav', 'mp3'] : ['srt', 'vtt']).map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              {tts ? (
                <>
                  <label className="media-field">
                    语音引擎
                    <select
                      value={engine}
                      onChange={(event) => setEngine(event.target.value)}
                    >
                      <option value="auto">
                        自动（本地 Qwen 优先，其他环境用 Edge）
                      </option>
                      <option value="edge">Edge TTS（联网）</option>
                      <option value="qwen">
                        Qwen3-TTS 1.7B CustomVoice（本地）
                      </option>
                    </select>
                  </label>
                  <p role="status">
                    {environment
                      ? `自动选择：${environment.preferred_engine === 'qwen' ? '本地 Qwen' : 'Edge TTS'}`
                      : '正在检测语音环境…'}
                  </p>
                  {selectedEngine === 'edge' && (
                    <>
                      <label className="media-field">
                        Edge 音色
                        <input
                          value={voice}
                          pattern="[a-zA-Z0-9-]{1,100}"
                          required
                          onChange={(event) => setVoice(event.target.value)}
                        />
                      </label>
                      <label className="media-field">
                        语速百分比
                        <input
                          type="number"
                          min={-50}
                          max={100}
                          value={rate}
                          onChange={(event) =>
                            setRate(Number(event.target.value))
                          }
                        />
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={network}
                          onChange={(event) => setNetwork(event.target.checked)}
                        />
                        允许将字幕正文发送至微软在线语音服务
                      </label>
                      {environment && !environment.edge_available && (
                        <p className="notice">
                          尚未安装 Edge TTS，见
                          <a
                            href="https://github.com/rany2/edge-tts"
                            target="_blank"
                            rel="noreferrer"
                          >
                            安装说明
                          </a>
                          。
                        </p>
                      )}
                    </>
                  )}
                  {selectedEngine === 'qwen' && (
                    <>
                      <label className="media-field">
                        Qwen 音色
                        <select
                          value={speaker}
                          onChange={(event) => setSpeaker(event.target.value)}
                        >
                          {[
                            'Vivian',
                            'Serena',
                            'Uncle_Fu',
                            'Dylan',
                            'Eric',
                            'Ryan',
                            'Aiden',
                            'Ono_Anna',
                            'Sohee',
                          ].map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                      <label className="media-field">
                        语言
                        <select
                          value={qwenLanguage}
                          onChange={(event) =>
                            setQwenLanguage(event.target.value)
                          }
                        >
                          {[
                            'Auto',
                            'Chinese',
                            'English',
                            'Japanese',
                            'Korean',
                            'German',
                            'French',
                            'Russian',
                            'Portuguese',
                            'Spanish',
                            'Italian',
                          ].map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                      <label className="media-field">
                        表演指令（可选）
                        <input
                          maxLength={500}
                          value={instruct}
                          onChange={(event) => setInstruct(event.target.value)}
                          placeholder="例如：用平静、清晰的语气朗读"
                        />
                      </label>
                      {environment && !environment.qwen_available && (
                        <p className="notice">
                          本地模型或运行环境缺失。
                          <a
                            href={environment.qwen_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            下载官方模型
                          </a>{' '}
                          ·{' '}
                          <a
                            href={environment.runtime_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            安装运行环境
                          </a>
                        </p>
                      )}
                    </>
                  )}
                  <label className="media-field">
                    语音超出字幕时段时
                    <select
                      value={fit}
                      onChange={(event) => setFit(event.target.value)}
                    >
                      <option value="speed-up">
                        最多加速 4 倍，完整保留语音
                      </option>
                      <option value="strict">停止并提示延长字幕时间</option>
                    </select>
                  </label>
                  <p className="muted">
                    字幕按时间排序，不允许重叠；最多 200 条、20000 字、1
                    小时，处理限时 30 分钟。
                  </p>
                </>
              ) : (
                <>
                  <label className="media-field">
                    Whisper 模型
                    <select
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                    >
                      {[
                        'tiny',
                        'base',
                        'small',
                        'medium',
                        'large-v3',
                        'turbo',
                      ].map((value) => (
                        <option key={value} value={value}>
                          {value}
                          {environment?.whisper_models.includes(value)
                            ? '（本地已有）'
                            : '（需下载）'}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="media-field">
                    语言代码（留空自动识别）
                    <input
                      value={language}
                      pattern="[a-z]{2,3}"
                      placeholder="zh / en"
                      onChange={(event) => setLanguage(event.target.value)}
                    />
                  </label>
                  <label className="media-field">
                    音频流序号（从 0 开始）
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={audioStream}
                      onChange={(event) =>
                        setAudioStream(Number(event.target.value))
                      }
                    />
                  </label>
                  {environment &&
                    (!environment.whisper_available ||
                      !environment.whisper_models.includes(model)) && (
                      <p className="notice">
                        当前模型或 Whisper 运行环境尚未就绪。
                        <a
                          href={environment.whisper_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          官方安装和模型下载说明
                        </a>
                        ；不会自动下载。
                      </p>
                    )}
                </>
              )}
            </>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <button
          className="primary"
          disabled={
            locked ||
            (concat ? sources.length < 2 : !sources.length && !text.trim()) ||
            (tts && selectedEngine === 'edge' && !network)
          }
        >
          {busy
            ? '正在提交…'
            : concat
              ? '拼接视频'
              : tts
                ? '生成配音'
                : '生成字幕'}
        </button>
      </form>
      {job && (
        <JobResult
          job={job}
          onCancel={() => {
            void cancel();
          }}
        />
      )}
    </div>
  );
}
