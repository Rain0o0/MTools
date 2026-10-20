import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatform } from '../platform/context';
import { errorText, request } from './api';
import type { Schemas } from './api';
import {
  initialComposition,
  VideoAdjustments,
  VideoTimeline,
  VideoTracks,
  VideoWatermarks,
} from './video-composition';
import type { VideoComposition } from './video-composition';

type Artifact = Schemas['Artifact'];
type Kind = 'image' | 'video' | 'audio';
type SourceTarget = 'source' | 'overlay';

declare global {
  interface Window {
    pywebview?: {
      api: { select_media_file: (kind: Kind) => Promise<string | null> };
    };
  }
}
const titles = { image: '图片编辑', video: '视频编辑', audio: '音频编辑' };
const accepted = {
  image: '.png,.jpg,.jpeg,.webp',
  video: '.mp4,.mov,.mkv,.webm',
  audio: '.mp3,.wav,.flac,.ogg,.m4a',
};
const active = new Set(['queued', 'running', 'cancel_requested']);

export function MediaPreview({ artifact }: { artifact: Artifact }) {
  const url = `/api/v1/artifacts/${artifact.artifact_id}/content`;
  if (artifact.info.kind === 'subtitle')
    return <p>字幕已生成，可下载后编辑或用于字幕配音。</p>;
  if (artifact.info.kind === 'image')
    return <img className="media-preview" src={url} alt={artifact.name} />;
  if (artifact.info.kind === 'video')
    return (
      <video className="media-preview" src={url} controls preload="metadata" />
    );
  return (
    <audio className="media-audio" src={url} controls preload="metadata" />
  );
}

export function JobResult({
  job,
  onCancel,
}: {
  job: Schemas['Job'];
  onCancel: () => void;
}) {
  return (
    <section className="panel media-result" aria-label="处理任务">
      <div className="media-row">
        <strong role="status">{job.stage}</strong>
        {active.has(job.status) && (
          <button
            onClick={onCancel}
            disabled={job.status === 'cancel_requested'}
          >
            取消处理
          </button>
        )}
      </div>
      {active.has(job.status) && (
        <p>
          可以切换工具，稍后到<Link to="/jobs">任务页</Link>查看结果。
        </p>
      )}
      {job.error && (
        <p role="alert" className="notice error">
          {job.error}
        </p>
      )}
      {job.video_processing && (
        <p className="muted">
          视频编码：{job.video_processing.label}
          {job.video_processing.fallback &&
            '（显卡处理未完成，已自动改用 CPU）'}
        </p>
      )}
      {job.speech_processing && (
        <p className="muted">
          语音引擎：{job.speech_processing.engine} ·{' '}
          {job.speech_processing.device === 'cuda'
            ? '显卡推理'
            : job.speech_processing.device === 'online'
              ? '在线服务'
              : 'CPU 推理'}
        </p>
      )}
      {job.result && (
        <>
          <MediaPreview artifact={job.result} />
          <a
            className="button primary"
            href={`/api/v1/artifacts/${job.result.artifact_id}/content?download=true`}
            download
          >
            下载处理结果
          </a>
          <p>
            {job.result.name} · {(job.result.size / 1024).toFixed(1)} KiB
          </p>
        </>
      )}
    </section>
  );
}

function Numeric({
  label,
  value,
  change,
  min = 0,
  max = 4096,
  step = 1,
}: {
  label: string;
  value: number | '';
  change: (value: number | '') => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="media-field">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        required={!label.includes('留空')}
        onChange={(event) =>
          change(event.target.value === '' ? '' : Number(event.target.value))
        }
      />
    </label>
  );
}

export default function MediaWorkbench({ kind }: { kind: Kind }) {
  const { capabilities } = usePlatform();
  const retention = capabilities?.artifact_retention_hours ?? 24;
  const [source, setSource] = useState<Artifact>();
  const [overlay, setOverlay] = useState<Artifact>();
  const [job, setJob] = useState<Schemas['Job']>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [persistentOnImport, setPersistentOnImport] = useState(false);
  const [library, setLibrary] = useState<Artifact[]>([]);
  const [libraryTarget, setLibraryTarget] = useState<SourceTarget>();
  const [removing, setRemoving] = useState<Artifact>();
  const [crop, setCrop] = useState(false);
  const [x, setX] = useState<number | ''>(0);
  const [y, setY] = useState<number | ''>(0);
  const [width, setWidth] = useState<number | ''>(100);
  const [height, setHeight] = useState<number | ''>(100);
  const [start, setStart] = useState<number | ''>(0);
  const [end, setEnd] = useState<number | ''>('');
  const [overlayX, setOverlayX] = useState<number | ''>(0);
  const [overlayY, setOverlayY] = useState<number | ''>(0);
  const [overlayWidth, setOverlayWidth] = useState<number | ''>('');
  const [opacity, setOpacity] = useState<number | ''>(1);
  const [resize, setResize] = useState<number | ''>('');
  const [rotate, setRotate] = useState('0');
  const [format, setFormat] = useState(kind === 'image' ? 'png' : 'mp3');
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<number | ''>(1);
  const [overlayVolume, setOverlayVolume] = useState<number | ''>(0.5);
  const [delay, setDelay] = useState<number | ''>(0);
  const [fadeIn, setFadeIn] = useState<number | ''>(0);
  const [fadeOut, setFadeOut] = useState<number | ''>(0);
  const [composition, setComposition] =
    useState<VideoComposition>(initialComposition);
  const outputDuration =
    (composition.segments.length
      ? composition.segments.reduce(
          (sum, s) => sum + s.end_seconds - (s.start_seconds ?? 0),
          0,
        )
      : Number(end === '' ? (source?.info.duration ?? 0) : end) -
        Number(start)) / composition.speed;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!job || !active.has(job.status)) return;
    let disposed = false;
    const timer = window.setInterval(() => {
      request(`/jobs/${job.job_id}`, 'Job')
        .then((value) => {
          if (!disposed) setJob(value);
        })
        .catch((value: unknown) => {
          if (!disposed) setError(errorText(value));
        });
    }, 1200);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [job]);

  async function upload(file: File | undefined, extra: boolean) {
    if (!file) return;
    if (file.size > 256 * 1024 * 1024) {
      setError('单文件不能超过 256 MiB，请先缩小文件。');
      return;
    }
    setBusy(true);
    setError('');
    setNotice(`正在导入 ${file.name}…`);
    try {
      const item = await request(
        `/artifacts/upload?name=${encodeURIComponent(file.name)}${!extra && persistentOnImport ? '&persistent=true' : ''}`,
        'Artifact',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: file,
        },
      );
      if (!mounted.current) return;
      if (item.info.kind !== (extra && kind !== 'audio' ? 'image' : kind))
        throw new Error('文件类型不符合当前用途，请重新选择。');
      if (extra) {
        setOverlay(item);
        setOverlayWidth(
          Math.min(item.info.width || 100, source?.info.width || 4096),
        );
      } else {
        setSource(item);
        setWidth(item.info.width);
        setComposition((value) => ({
          ...value,
          segments: [],
          tracks: [],
          subtitle_id: null,
          subtitle_name: '',
        }));
        setHeight(item.info.height);
        setStart(0);
        setEnd('');
        setX(0);
        setY(0);
        setJob(undefined);
      }
      setNotice('已建立媒体源。编辑只读取源文件，并将处理结果另存为新文件。');
    } catch (value) {
      if (mounted.current) {
        setError(errorText(value));
        setNotice('');
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function addTimelineTrack(
    file: File,
    trackKind: 'video' | 'image' | 'audio',
  ) {
    if (file.size > 256 * 1024 * 1024) {
      setError('单文件不能超过 256 MiB，请先缩小文件。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const item = await request(
        `/artifacts/upload?name=${encodeURIComponent(file.name)}`,
        'Artifact',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: file,
        },
      );
      if (item.info.kind !== trackKind)
        throw new Error('轨道素材格式与所选轨道类型不符。');
      setComposition((value) => ({
        ...value,
        tracks: [
          ...value.tracks,
          {
            key: crypto.randomUUID(),
            name: item.name,
            artifact_id: item.artifact_id,
            kind: trackKind,
            source_start_seconds: 0,
            source_end_seconds: trackKind === 'image' ? 5 : item.info.duration,
            timeline_start_seconds: 0,
            volume: 1,
            x: 0,
            y: 0,
            width: null,
            opacity: 1,
          },
        ],
      }));
    } catch (value) {
      setError(errorText(value));
    } finally {
      setBusy(false);
    }
  }

  async function addSubtitle(file: File) {
    if (file.size > 300000) {
      setError('字幕文件不能超过 300 KB。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const item = await request(
        `/artifacts/upload?name=${encodeURIComponent(file.name)}`,
        'Artifact',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: file,
        },
      );
      if (item.info.kind !== 'subtitle')
        throw new Error('请选择有效的 SRT 或 WebVTT 字幕。');
      setComposition((value) => ({
        ...value,
        subtitle_id: item.artifact_id,
        subtitle_name: item.name,
      }));
    } catch (value) {
      setError(errorText(value));
    } finally {
      setBusy(false);
    }
  }

  async function selectLocalOriginal(extra: boolean) {
    if (!window.pywebview) {
      setError(
        '当前运行方式不能直接引用本机路径，请在桌面版使用，或选择文件上传到资源库。',
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const path = await window.pywebview.api.select_media_file(
        extra && kind !== 'audio' ? 'image' : extra ? 'audio' : kind,
      );
      if (!path) return;
      const item = await request('/media/local-source', 'Artifact', {
        method: 'POST',
        body: JSON.stringify({ path }),
      });
      if (extra) setOverlay(item);
      else {
        setSource(item);
        setJob(undefined);
        setComposition((value) => ({
          ...value,
          segments: [],
          tracks: [],
          subtitle_id: null,
          subtitle_name: '',
        }));
      }
      setNotice('已引用本机原文件，不会复制或改写源文件。');
    } catch (value) {
      setError(errorText(value));
    } finally {
      setBusy(false);
    }
  }

  async function selectLibrary(target: SourceTarget) {
    setBusy(true);
    setError('');
    try {
      const result = await request('/artifacts/library', 'ArtifactList');
      setLibrary(
        result.items.filter(
          (item) =>
            item.available &&
            item.info.kind ===
              (target === 'source'
                ? kind
                : kind === 'audio'
                  ? 'audio'
                  : 'image'),
        ),
      );
      setLibraryTarget(target);
    } catch (value) {
      setError(errorText(value));
    } finally {
      setBusy(false);
    }
  }

  async function updatePersistence(item: Artifact, persistent: boolean) {
    try {
      const updated = await request(
        `/artifacts/${item.artifact_id}/persistence`,
        'Artifact',
        { method: 'PATCH', body: JSON.stringify({ persistent }) },
      );
      if (source?.artifact_id === item.artifact_id) setSource(updated);
      if (overlay?.artifact_id === item.artifact_id) setOverlay(updated);
      setNotice(
        persistent
          ? '已保存到资源库，清理临时文件时会保留。'
          : `已改为临时资源，${retention} 小时后自动清理。`,
      );
    } catch (value) {
      setError(errorText(value));
    }
  }

  async function removeLibrarySource(item: Artifact) {
    try {
      const result = await request(
        `/artifacts/${item.artifact_id}`,
        'ArtifactList',
        { method: 'DELETE' },
      );
      setLibrary(result.items);
      if (source?.artifact_id === item.artifact_id) setSource(undefined);
      if (overlay?.artifact_id === item.artifact_id) setOverlay(undefined);
      setComposition((value) => ({
        ...value,
        watermarks: value.watermarks.filter(
          (w) => w.artifact_id !== item.artifact_id,
        ),
        tracks: value.tracks.filter(
          (track) => track.artifact_id !== item.artifact_id,
        ),
        ...(value.subtitle_id === item.artifact_id
          ? { subtitle_id: null, subtitle_name: '' }
          : {}),
      }));
      setRemoving(undefined);
      setNotice(
        item.source_type === 'local'
          ? '已移除原文件引用；本机原文件未被删除。'
          : '已从资源库移除文件。',
      );
    } catch (value) {
      setError(errorText(value));
    }
  }

  async function execute() {
    if (!source) return;
    const tracksOutOfBounds = composition.tracks.some(
      (track) =>
        track.timeline_start_seconds +
          track.source_end_seconds -
          track.source_start_seconds >
        outputDuration,
    );
    if (
      kind === 'video' &&
      (composition.segments.some(
        (s) => s.end_seconds <= (s.start_seconds ?? 0),
      ) ||
        tracksOutOfBounds ||
        outputDuration <= 0 ||
        outputDuration > 3600)
    ) {
      setError(
        '请检查片段和轨道时间；轨道须位于成片范围内，变速后的总时长须在 0–3600 秒以内。',
      );
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    const cropValue = crop ? { x, y, width, height } : null;
    const visual = {
      crop: cropValue,
      overlay_x: overlayX,
      overlay_y: overlayY,
      overlay_width: overlayWidth === '' ? null : overlayWidth,
      opacity,
    };
    const parameters = {
      artifact_id: source.artifact_id,
      overlay_id: overlay?.artifact_id ?? null,
      ...(kind === 'image'
        ? {
            ...visual,
            rotate: Number(rotate),
            resize_width: resize === '' ? null : resize,
            output_format: format,
          }
        : kind === 'video'
          ? {
              ...visual,
              ...composition,
              watermarks: composition.watermarks.map(
                ({ key, name, ...mark }) => {
                  void key;
                  void name;
                  return mark;
                },
              ),
              tracks: composition.tracks.map(({ key, name, ...track }) => {
                void key;
                void name;
                return track;
              }),
              subtitle_id: composition.subtitle_id,
              start_seconds: composition.segments.length ? 0 : start,
              end_seconds:
                composition.segments.length || end === '' ? null : end,
              muted,
              volume,
              fade_in_seconds: fadeIn,
              fade_out_seconds: fadeOut,
            }
          : {
              start_seconds: start,
              end_seconds: end === '' ? null : end,
              volume,
              overlay_volume: overlayVolume,
              overlay_start_seconds: delay,
              fade_in_seconds: fadeIn,
              fade_out_seconds: fadeOut,
              output_format: format,
            }),
    };
    try {
      const value = await request(
        `/tools/${kind}-editor/operations/edit/execute`,
        'Job',
        {
          method: 'POST',
          body: JSON.stringify({ contract_version: 1, parameters }),
        },
      );
      if (mounted.current) setJob(value);
    } catch (value) {
      if (mounted.current) setError(errorText(value));
    } finally {
      if (mounted.current) setBusy(false);
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

  async function share() {
    if (!source) return;
    try {
      const item = await request(
        `/artifacts/${source.artifact_id}/share`,
        'Artifact',
        {
          method: 'PATCH',
          body: JSON.stringify({ shared_with_ai: !source.shared_with_ai }),
        },
      );
      setSource(item);
      setNotice(
        item.shared_with_ai
          ? '已允许本机 AI 读取此文件。将下面的文件编号发给 AI；生成结果仍需在任务页逐次批准。'
          : '已停止向 AI 共享此文件。',
      );
    } catch (value) {
      setError(errorText(value));
    }
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{titles[kind]}</h1>
          <p>选择处理来源并编辑；原文件保持不变，结果另存为新文件。</p>
        </div>
        <Link to="/jobs">查看全部任务 →</Link>
      </header>
      <div className={`media-layout${kind === 'video' ? ' video-layout' : ''}`}>
        <section className="panel media-input">
          <h2>原始文件</h2>
          {capabilities?.mode === 'desktop' && (
            <button
              disabled={busy}
              onClick={() => void selectLocalOriginal(false)}
            >
              直接选择本机原文件（不复制）
            </button>
          )}
          <button disabled={busy} onClick={() => void selectLibrary('source')}>
            从资源库选择
          </button>
          <label className="media-upload">
            {capabilities?.mode === 'desktop'
              ? '导入媒体副本'
              : '选择并上传媒体文件'}
            <input
              type="file"
              accept={accepted[kind]}
              disabled={busy || (!!job && active.has(job.status))}
              onChange={(event) => {
                void upload(event.target.files?.[0], false);
                event.target.value = '';
              }}
            />
          </label>
          <label className="media-field">
            <span>
              <input
                type="checkbox"
                checked={persistentOnImport}
                onChange={(event) =>
                  setPersistentOnImport(event.target.checked)
                }
              />{' '}
              长期保存在资源库
            </span>
          </label>
          <p className="muted">
            桌面版可直接引用原文件，不复制内容；浏览器运行需上传副本。临时文件保留{' '}
            {retention} 小时，资源库副本需手动移除。
          </p>
          {source ? (
            <>
              <MediaPreview artifact={source} />
              <p className="media-file-name">
                {source.name} ·{' '}
                {source.source_type === 'local'
                  ? '本机原文件引用'
                  : source.persistent
                    ? '资源库文件'
                    : `临时副本 · ${retention} 小时保留`}{' '}
                ·{' '}
                {source.info.width
                  ? `${source.info.width} × ${source.info.height}`
                  : ''}{' '}
                {source.info.duration
                  ? `${source.info.duration.toFixed(2)} 秒`
                  : ''}
              </p>
              <button
                onClick={() => {
                  void share();
                }}
              >
                {source.shared_with_ai ? '停止向 AI 共享' : '提供给 AI 使用'}
              </button>
              {source.source_type === 'managed' && (
                <button
                  onClick={() =>
                    void updatePersistence(source, !source.persistent)
                  }
                >
                  {source.persistent ? '改为临时资源' : '长期保存到资源库'}
                </button>
              )}
              <button onClick={() => setRemoving(source)}>移除资源引用</button>
              {source.shared_with_ai && (
                <label className="media-field">
                  文件编号（可复制给 AI）
                  <input
                    readOnly
                    value={source.artifact_id}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
              )}
            </>
          ) : (
            <div className="media-placeholder">选择文件后，这里显示预览。</div>
          )}
          {libraryTarget === 'source' && (
            <div className="media-source-list" aria-label="资源库媒体源">
              <strong>选择已有媒体源</strong>
              {library.map((item) => (
                <button
                  key={item.artifact_id}
                  onClick={() => {
                    setSource(item);
                    setComposition((value) => ({
                      ...value,
                      segments: [],
                      tracks: [],
                      subtitle_id: null,
                      subtitle_name: '',
                    }));
                    setLibraryTarget(undefined);
                    setJob(undefined);
                  }}
                >
                  {item.name} ·{' '}
                  {item.persistent || item.source_type === 'local'
                    ? '资源库'
                    : '临时'}
                </button>
              ))}
              {library.length === 0 && (
                <p>资源库中没有可用的{titles[kind]}来源。</p>
              )}
              <button onClick={() => setLibraryTarget(undefined)}>关闭</button>
            </div>
          )}
          {source && removing?.artifact_id === source.artifact_id && (
            <div className="notice">
              <p>
                {source.source_type === 'local'
                  ? '只移除 MTools 中的文件引用，本机原文件不会删除。'
                  : '这会移除资源库中的副本，不能撤销。'}
              </p>
              <button onClick={() => void removeLibrarySource(source)}>
                确认移除
              </button>
              <button onClick={() => setRemoving(undefined)}>取消</button>
            </div>
          )}
        </section>
        <section className="panel media-options">
          <h2>编辑选项</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void execute();
            }}
          >
            <fieldset
              disabled={!source || busy || (!!job && active.has(job.status))}
            >
              {kind === 'video' && (
                <VideoTimeline
                  value={composition}
                  change={setComposition}
                  duration={source?.info.duration || 3600}
                />
              )}
              {kind === 'video' && (
                <VideoTracks
                  value={composition}
                  change={setComposition}
                  duration={Math.max(0, outputDuration)}
                  addTrack={(file, trackKind) =>
                    void addTimelineTrack(file, trackKind)
                  }
                  addSubtitle={(file) => void addSubtitle(file)}
                />
              )}
              {kind !== 'image' &&
                !(kind === 'video' && composition.segments.length) && (
                  <>
                    <h3>截取片段</h3>
                    <div className="media-fields">
                      <Numeric
                        label="开始时间（秒）"
                        value={start}
                        change={setStart}
                        max={source?.info.duration || 3600}
                        step={0.01}
                      />
                      <Numeric
                        label="结束时间（秒，留空到结尾）"
                        value={end}
                        change={setEnd}
                        max={source?.info.duration || 3600}
                        step={0.01}
                      />
                    </div>
                  </>
                )}
              {kind !== 'audio' && (
                <>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={crop}
                      onChange={(event) => setCrop(event.target.checked)}
                    />
                    裁剪画面
                  </label>
                  {crop && (
                    <div className="media-fields">
                      <Numeric
                        label="左侧位置（像素）"
                        value={x}
                        change={setX}
                      />
                      <Numeric
                        label="顶部位置（像素）"
                        value={y}
                        change={setY}
                      />
                      <Numeric
                        label="裁剪宽度（像素）"
                        value={width}
                        change={setWidth}
                        min={1}
                      />
                      <Numeric
                        label="裁剪高度（像素）"
                        value={height}
                        change={setHeight}
                        min={1}
                      />
                    </div>
                  )}
                </>
              )}
              {kind === 'video' && (
                <VideoAdjustments value={composition} change={setComposition} />
              )}
              {kind === 'image' && (
                <div className="media-fields">
                  <Numeric
                    label="输出宽度（像素，留空不缩放）"
                    value={resize}
                    change={setResize}
                    min={1}
                  />
                  <label className="media-field">
                    顺时针旋转
                    <select
                      value={rotate}
                      onChange={(event) => setRotate(event.target.value)}
                    >
                      <option value="0">不旋转</option>
                      <option value="90">90°</option>
                      <option value="180">180°</option>
                      <option value="270">270°</option>
                    </select>
                  </label>
                </div>
              )}
              {kind === 'video' && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={muted}
                    onChange={(event) => setMuted(event.target.checked)}
                  />
                  移除原视频声音
                </label>
              )}
              {(kind === 'audio' || kind === 'video') && (
                <div className="media-fields">
                  <Numeric
                    label="主音量（倍）"
                    value={volume}
                    change={setVolume}
                    max={4}
                    step={0.1}
                  />
                  <Numeric
                    label="淡入（秒）"
                    value={fadeIn}
                    change={setFadeIn}
                    max={30}
                    step={0.1}
                  />
                  <Numeric
                    label="淡出（秒）"
                    value={fadeOut}
                    change={setFadeOut}
                    max={30}
                    step={0.1}
                  />
                </div>
              )}
              <h3>{kind === 'audio' ? '叠加音轨' : '叠加图片'}</h3>
              <label className="media-upload">
                {overlay
                  ? '替换叠加文件'
                  : kind === 'audio'
                    ? '选择配乐 / 音效'
                    : '选择水印 / 贴图'}
                <input
                  type="file"
                  accept={kind === 'audio' ? accepted.audio : accepted.image}
                  onChange={(event) => {
                    void upload(event.target.files?.[0], true);
                    event.target.value = '';
                  }}
                />
              </label>
              {capabilities?.mode === 'desktop' && (
                <button
                  disabled={busy}
                  onClick={() => void selectLocalOriginal(true)}
                  type="button"
                >
                  从本机原文件选择叠加素材
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => void selectLibrary('overlay')}
                type="button"
              >
                从资源库选择叠加素材
              </button>
              {libraryTarget === 'overlay' && (
                <div className="media-source-list" aria-label="资源库叠加素材">
                  <strong>选择叠加素材</strong>
                  {library.map((item) => (
                    <button
                      type="button"
                      key={item.artifact_id}
                      onClick={() => {
                        setOverlay(item);
                        setOverlayWidth(
                          Math.min(
                            item.info.width || 100,
                            source?.info.width || 4096,
                          ),
                        );
                        setLibraryTarget(undefined);
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                  {library.length === 0 && (
                    <p>资源库中没有符合当前叠加类型的媒体。</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setLibraryTarget(undefined)}
                  >
                    关闭
                  </button>
                </div>
              )}
              {overlay && (
                <>
                  <div className="media-row">
                    <span className="media-file-name">{overlay.name}</span>
                    <button type="button" onClick={() => setOverlay(undefined)}>
                      移除叠加
                    </button>
                  </div>
                  <div className="media-fields">
                    {kind === 'audio' ? (
                      <>
                        <Numeric
                          label="叠加开始位置（秒）"
                          value={delay}
                          change={setDelay}
                          max={3600}
                          step={0.01}
                        />
                        <Numeric
                          label="叠加音量（倍）"
                          value={overlayVolume}
                          change={setOverlayVolume}
                          max={4}
                          step={0.1}
                        />
                      </>
                    ) : (
                      <>
                        <Numeric
                          label="叠加左侧位置（像素）"
                          value={overlayX}
                          change={setOverlayX}
                        />
                        <Numeric
                          label="叠加顶部位置（像素）"
                          value={overlayY}
                          change={setOverlayY}
                        />
                        <Numeric
                          label="叠加宽度（像素）"
                          value={overlayWidth}
                          change={setOverlayWidth}
                          min={1}
                        />
                        <Numeric
                          label="透明度"
                          value={opacity}
                          change={setOpacity}
                          min={0.01}
                          max={1}
                          step={0.01}
                        />
                      </>
                    )}
                  </div>
                  {kind === 'video' && (
                    <button
                      type="button"
                      disabled={composition.watermarks.length >= 8}
                      onClick={() => {
                        setComposition({
                          ...composition,
                          watermarks: [
                            ...composition.watermarks,
                            {
                              key: crypto.randomUUID(),
                              name: overlay.name,
                              artifact_id: overlay.artifact_id,
                              x: Number(overlayX),
                              y: Number(overlayY),
                              width: overlayWidth === '' ? null : overlayWidth,
                              opacity: Number(opacity),
                              start_seconds: 0,
                              end_seconds: null,
                            },
                          ],
                        });
                        setOverlay(undefined);
                      }}
                    >
                      添加此水印到组合
                    </button>
                  )}
                </>
              )}
              {kind === 'video' && (
                <VideoWatermarks
                  value={composition}
                  change={setComposition}
                  duration={Math.max(0, outputDuration)}
                />
              )}
              {kind !== 'video' && (
                <label className="media-field">
                  保存格式
                  <select
                    value={format}
                    onChange={(event) => setFormat(event.target.value)}
                  >
                    {(kind === 'image'
                      ? ['png', 'jpg', 'webp']
                      : ['mp3', 'wav']
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {kind === 'video' && (
                <p className="notice" role="status">
                  一次生成：{composition.segments.length || 1} 段 ·{' '}
                  {composition.speed} 倍速 ·{' '}
                  {composition.watermarks.length + Number(!!overlay)} 个水印 ·{' '}
                  {muted ? '静音' : '保留声音'}，预计{' '}
                  {Math.max(0, outputDuration).toFixed(2)} 秒。
                  {composition.watermarks.length + Number(!!overlay) > 8 &&
                    ' 水印总数超过 8 个，请移除一个或添加到已有组合。'}
                </p>
              )}
              <button
                className="primary"
                type="submit"
                disabled={
                  kind === 'video' &&
                  composition.watermarks.length + Number(!!overlay) > 8
                }
              >
                生成
                {kind === 'image' ? '图片' : kind === 'video' ? '视频' : '音频'}
              </button>
            </fieldset>
          </form>
        </section>
      </div>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {job && (
        <JobResult
          job={job}
          onCancel={() => {
            void cancel();
          }}
        />
      )}
      <details className="tool-help">
        <summary>使用帮助与限制</summary>
        <p>
          所有坐标以像素计，相对裁剪、旋转和缩放后的画面。叠加图片必须完整放在画面内。视频输出
          MP4，音频混音以主音轨的截取时长为准；过长的淡入淡出会缩短到片段时长。单次处理最多
          5 分钟，可在任务页取消。临时文件保留 {retention} 小时，请及时下载。
        </p>
        <p>
          媒体组件安装和重新检测入口位于<Link to="/jobs">任务页</Link>
          。文件只在本机处理；主动共享给 AI 的内容可被你的 AI 客户端读取。
        </p>
      </details>
    </>
  );
}
