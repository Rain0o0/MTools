import type { Schemas } from './api';

type Mark = Schemas['VideoWatermark'] & { key: string; name: string };
type Track = Schemas['VideoTrack'] & { key: string; name: string };
export type VideoComposition = {
  segments: Schemas['VideoSegment'][];
  watermarks: Mark[];
  tracks: Track[];
  subtitle_id: string | null;
  subtitle_name: string;
  speed: number;
  rotate: 0 | 90 | 180 | 270;
  resize_width: number | null;
  flip_horizontal: boolean;
  flip_vertical: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: boolean;
};

export const initialComposition: VideoComposition = {
  segments: [],
  watermarks: [],
  tracks: [],
  subtitle_id: null,
  subtitle_name: '',
  speed: 1,
  rotate: 0,
  resize_width: null,
  flip_horizontal: false,
  flip_vertical: false,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  grayscale: false,
};

type Props = {
  value: VideoComposition;
  change: (value: VideoComposition) => void;
  duration: number;
};

function NumberField({
  label,
  value,
  change,
  min = 0,
  max = 4096,
  step = 1,
  optional = false,
}: {
  label: string;
  value: number | null | undefined;
  change: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  optional?: boolean;
}) {
  return (
    <label className="media-field">
      {label}
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        required={!optional}
        onChange={(event) =>
          change(event.target.value === '' ? null : Number(event.target.value))
        }
      />
    </label>
  );
}

export function VideoTimeline({ value, change, duration }: Props) {
  const segments = value.segments;
  function update(index: number, patch: Partial<Schemas['VideoSegment']>) {
    change({
      ...value,
      segments: segments.map((segment, i) =>
        i === index ? { ...segment, ...patch } : segment,
      ),
    });
  }
  function move(index: number, offset: number) {
    const next = [...segments];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    change({ ...value, segments: next });
  }
  return (
    <section aria-label="多片段剪辑" className="video-composition">
      <h3>多片段剪辑</h3>
      <p className="muted">
        按列表顺序保留原视频中的片段并合并，可重排、重复，最多 16
        段。列表为空时使用下方单段截取。
      </p>
      {segments.map((segment, index) => (
        <fieldset key={index} className="video-composition-item">
          <legend>片段 {index + 1}</legend>
          <div className="media-fields">
            <NumberField
              label={`片段 ${index + 1} 开始（秒）`}
              value={segment.start_seconds ?? 0}
              min={0}
              max={duration}
              step={0.01}
              change={(v) => update(index, { start_seconds: v ?? 0 })}
            />
            <NumberField
              label={`片段 ${index + 1} 结束（秒）`}
              value={segment.end_seconds}
              min={0.01}
              max={duration}
              step={0.01}
              change={(v) => update(index, { end_seconds: v ?? 0 })}
            />
          </div>
          {segment.end_seconds <= (segment.start_seconds ?? 0) && (
            <p role="alert">结束时间须晚于开始时间。</p>
          )}
          <div className="media-row">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              上移片段 {index + 1}
            </button>
            <button
              type="button"
              disabled={index === segments.length - 1}
              onClick={() => move(index, 1)}
            >
              下移片段 {index + 1}
            </button>
            <button
              type="button"
              onClick={() =>
                change({
                  ...value,
                  segments: segments.filter((_, i) => i !== index),
                })
              }
            >
              移除片段 {index + 1}
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={segments.length >= 16}
        onClick={() =>
          change({
            ...value,
            segments: [
              ...segments,
              { start_seconds: 0, end_seconds: duration },
            ],
          })
        }
      >
        添加剪辑片段
      </button>
      {segments.length > 0 && (
        <p role="status">
          合并并变速后约{' '}
          {(
            segments.reduce(
              (sum, s) => sum + s.end_seconds - (s.start_seconds ?? 0),
              0,
            ) / value.speed
          ).toFixed(2)}{' '}
          秒
        </p>
      )}
    </section>
  );
}

export function VideoTracks({
  value,
  change,
  duration,
  addTrack,
  addSubtitle,
}: Props & {
  addTrack: (file: File, kind: 'video' | 'image' | 'audio') => void;
  addSubtitle: (file: File) => void;
}) {
  function update(index: number, patch: Partial<Track>) {
    change({
      ...value,
      tracks: value.tracks.map((track, i) =>
        i === index ? { ...track, ...patch } : track,
      ),
    });
  }
  return (
    <section className="video-composition" aria-label="多轨时间线">
      <h3>多轨时间线（{value.tracks.length}/8）</h3>
      <p className="muted">
        上传视频、图片或音频片段，分别设置素材起止和成片起点。视频与图片按添加顺序叠放，音频与主轨混音。
      </p>
      {value.tracks.map((track, index) => (
        <fieldset className="video-composition-item" key={track.key}>
          <legend>
            {track.kind === 'video'
              ? '视频'
              : track.kind === 'image'
                ? '图片'
                : '音频'}
            轨道 · {track.name}
          </legend>
          <div className="media-fields">
            <NumberField
              label="素材开始（秒）"
              value={track.source_start_seconds}
              max={3600}
              step={0.01}
              change={(v) => update(index, { source_start_seconds: v ?? 0 })}
            />
            <NumberField
              label="素材结束（秒）"
              value={track.source_end_seconds}
              min={0.01}
              max={3600}
              step={0.01}
              change={(v) => update(index, { source_end_seconds: v ?? 0.01 })}
            />
            <NumberField
              label="放入成片的位置（秒）"
              value={track.timeline_start_seconds}
              max={duration}
              step={0.01}
              change={(v) => update(index, { timeline_start_seconds: v ?? 0 })}
            />
            {track.kind === 'audio' ? (
              <NumberField
                label="轨道音量（倍）"
                value={track.volume}
                max={4}
                step={0.1}
                change={(v) => update(index, { volume: v ?? 1 })}
              />
            ) : (
              <>
                <NumberField
                  label="左侧位置（像素）"
                  value={track.x}
                  max={4096}
                  change={(v) => update(index, { x: v ?? 0 })}
                />
                <NumberField
                  label="顶部位置（像素）"
                  value={track.y}
                  max={4096}
                  change={(v) => update(index, { y: v ?? 0 })}
                />
                <NumberField
                  label="输出宽度（像素，可留空）"
                  value={track.width}
                  min={1}
                  max={4096}
                  optional
                  change={(v) => update(index, { width: v })}
                />
                <NumberField
                  label="透明度"
                  value={track.opacity}
                  min={0.01}
                  max={1}
                  step={0.01}
                  change={(v) => update(index, { opacity: v ?? 1 })}
                />
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              change({
                ...value,
                tracks: value.tracks.filter((_, i) => i !== index),
              })
            }
          >
            移除此轨道片段
          </button>
        </fieldset>
      ))}
      <div className="media-row">
        {(['video', 'image', 'audio'] as const).map((kind) => (
          <label className="media-upload" key={kind}>
            添加{kind === 'video' ? '视频' : kind === 'image' ? '图片' : '音频'}
            轨道
            <input
              type="file"
              accept={
                kind === 'video'
                  ? 'video/mp4,video/quicktime,video/x-matroska,video/webm'
                  : kind === 'image'
                    ? 'image/png,image/jpeg,image/webp'
                    : 'audio/mpeg,audio/wav,audio/flac,audio/ogg,audio/mp4'
              }
              disabled={value.tracks.length >= 8}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) addTrack(file, kind);
                event.target.value = '';
              }}
            />
          </label>
        ))}
      </div>
      <h3>字幕烧录</h3>
      <p className="muted">
        上传 UTF-8 SRT 或 WebVTT 字幕，时间按最终成片计算；FFmpeg 需启用
        libass。
      </p>
      <label className="media-upload">
        {value.subtitle_name || '选择字幕文件'}
        <input
          type="file"
          accept=".srt,.vtt,text/vtt,application/x-subrip"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) addSubtitle(file);
            event.target.value = '';
          }}
        />
      </label>
      {value.subtitle_id && (
        <button
          type="button"
          onClick={() =>
            change({ ...value, subtitle_id: null, subtitle_name: '' })
          }
        >
          移除字幕
        </button>
      )}
    </section>
  );
}

export function VideoAdjustments({ value, change }: Omit<Props, 'duration'>) {
  function patch(update: Partial<VideoComposition>) {
    change({ ...value, ...update });
  }
  return (
    <details className="video-composition">
      <summary>画面与速度：旋转、镜像、缩放、调色</summary>
      <p className="muted">
        顺序：剪辑 → 变速 → 裁剪 → 旋转与镜像 → 缩放 → 调色 →
        水印。声音同步变速并保持音调。
      </p>
      <div className="media-fields">
        <NumberField
          label="播放速度（倍）"
          value={value.speed}
          min={0.25}
          max={4}
          step={0.05}
          change={(v) => patch({ speed: v ?? 1 })}
        />
        <label className="media-field">
          顺时针旋转
          <select
            value={value.rotate}
            onChange={(e) => {
              const rotate = Number(e.target.value);
              if (
                rotate === 0 ||
                rotate === 90 ||
                rotate === 180 ||
                rotate === 270
              )
                patch({ rotate });
            }}
          >
            <option value={0}>不旋转</option>
            <option value={90}>90°</option>
            <option value={180}>180°</option>
            <option value={270}>270°</option>
          </select>
        </label>
        <NumberField
          label="输出宽度（像素，留空不缩放）"
          value={value.resize_width}
          min={2}
          optional
          change={(v) => patch({ resize_width: v })}
        />
        <NumberField
          label="亮度（-1 至 1）"
          value={value.brightness}
          min={-1}
          max={1}
          step={0.05}
          change={(v) => patch({ brightness: v ?? 0 })}
        />
        <NumberField
          label="对比度（倍）"
          value={value.contrast}
          max={2}
          step={0.05}
          change={(v) => patch({ contrast: v ?? 1 })}
        />
        <NumberField
          label="饱和度（倍）"
          value={value.saturation}
          max={3}
          step={0.05}
          change={(v) => patch({ saturation: v ?? 1 })}
        />
      </div>
      {(['flip_horizontal', 'flip_vertical', 'grayscale'] as const).map(
        (key, i) => (
          <label className="check" key={key}>
            <input
              type="checkbox"
              checked={value[key]}
              onChange={(e) => patch({ [key]: e.target.checked })}
            />
            {['水平镜像', '垂直镜像', '黑白画面'][i]}
          </label>
        ),
      )}
    </details>
  );
}

export function VideoWatermarks({ value, change, duration }: Props) {
  function patch(index: number, update: Partial<Mark>) {
    change({
      ...value,
      watermarks: value.watermarks.map((mark, i) =>
        i === index ? { ...mark, ...update } : mark,
      ),
    });
  }
  return (
    <section className="video-composition" aria-label="水印组合">
      <h3>水印组合（{value.watermarks.length}/8）</h3>
      <p className="muted">
        从上方选择图片并添加到组合，可重复使用同一图片。列表越靠后越在上层；显示时间相对剪辑和变速后的成片。
      </p>
      {value.watermarks.map((mark, index) => (
        <fieldset className="video-composition-item" key={mark.key}>
          <legend>
            水印 {index + 1}：{mark.name}
          </legend>
          <div className="media-fields">
            <NumberField
              label={`水印 ${index + 1} 左侧位置`}
              value={mark.x ?? 0}
              change={(v) => patch(index, { x: v ?? 0 })}
            />
            <NumberField
              label={`水印 ${index + 1} 顶部位置`}
              value={mark.y ?? 0}
              change={(v) => patch(index, { y: v ?? 0 })}
            />
            <NumberField
              label={`水印 ${index + 1} 宽度`}
              value={mark.width}
              min={1}
              optional
              change={(v) => patch(index, { width: v })}
            />
            <NumberField
              label={`水印 ${index + 1} 透明度`}
              value={mark.opacity ?? 1}
              min={0.01}
              max={1}
              step={0.01}
              change={(v) => patch(index, { opacity: v ?? 1 })}
            />
            <NumberField
              label={`水印 ${index + 1} 显示开始（秒）`}
              value={mark.start_seconds ?? 0}
              max={duration}
              step={0.01}
              change={(v) => patch(index, { start_seconds: v ?? 0 })}
            />
            <NumberField
              label={`水印 ${index + 1} 显示结束（秒，留空到结尾）`}
              value={mark.end_seconds}
              min={0.01}
              max={duration}
              step={0.01}
              optional
              change={(v) => patch(index, { end_seconds: v })}
            />
          </div>
          <div className="media-row">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => {
                const marks = [...value.watermarks];
                [marks[index], marks[index - 1]] = [
                  marks[index - 1],
                  marks[index],
                ];
                change({ ...value, watermarks: marks });
              }}
            >
              下移水印 {index + 1} 图层
            </button>
            <button
              type="button"
              onClick={() =>
                change({
                  ...value,
                  watermarks: value.watermarks.filter((_, i) => i !== index),
                })
              }
            >
              移除水印 {index + 1}
            </button>
          </div>
        </fieldset>
      ))}
    </section>
  );
}
