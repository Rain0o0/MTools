import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatform } from './context';
import { MediaEnvironmentPanel } from './media-environment';
import { errorText, request } from '../shared/api';
import type { Schemas } from '../shared/api';
import { JobResult } from '../shared/media-workbench';

const names: Record<string, string> = {
  'image-editor': '图片编辑',
  'video-editor': '视频编辑',
  'audio-editor': '音频编辑',
  'media-library': '媒体文件',
};

function readableParameters(text: string): string {
  const labels: Record<string, string> = {
    artifact_id: '原文件编号',
    overlay_id: '叠加文件编号',
    source_file_name: '原文件',
    overlay_file_name: '叠加文件',
    crop: '裁剪区域',
    x: '左侧位置',
    y: '顶部位置',
    width: '宽度',
    height: '高度',
    start_seconds: '开始时间（秒）',
    end_seconds: '结束时间（秒）',
    opacity: '透明度',
    overlay_x: '叠加左侧位置',
    overlay_y: '叠加顶部位置',
    overlay_width: '叠加宽度',
    resize_width: '输出宽度',
    rotate: '顺时针旋转角度',
    muted: '移除声音',
    volume: '主音量',
    overlay_volume: '叠加音量',
    overlay_start_seconds: '叠加开始位置（秒）',
    fade_in_seconds: '淡入（秒）',
    fade_out_seconds: '淡出（秒）',
    output_format: '保存格式',
    resource_id: '任务编号',
    name: '文件名',
    encoded_length: '文件编码字符数',
  };
  try {
    const parsed: unknown = JSON.parse(text);
    return JSON.stringify(
      parsed,
      (_key: string, value: unknown) => {
        if (value && typeof value === 'object' && !Array.isArray(value))
          return Object.fromEntries(
            Object.entries(value).map(([name, item]) => [
              labels[name] || name,
              item,
            ]),
          );
        return value;
      },
      2,
    );
  } catch {
    return '参数无法显示，请拒绝此请求并让 AI 重试。';
  }
}

export default function MediaJobsPage() {
  const retention = usePlatform().capabilities?.artifact_retention_hours ?? 24;
  const [jobs, setJobs] = useState<Schemas['JobList']>({ items: [] });
  const [approvals, setApprovals] = useState<Schemas['ApprovalList']>({
    items: [],
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const refresh = useCallback(async () => {
    const [nextJobs, nextApprovals] = await Promise.all([
      request('/jobs', 'JobList'),
      request('/ai/approvals', 'ApprovalList'),
    ]);
    setJobs(nextJobs);
    setApprovals(nextApprovals);
  }, []);
  useEffect(() => {
    let disposed = false;
    async function poll() {
      try {
        const [nextJobs, nextApprovals] = await Promise.all([
          request('/jobs', 'JobList'),
          request('/ai/approvals', 'ApprovalList'),
        ]);
        if (!disposed) {
          setJobs(nextJobs);
          setApprovals(nextApprovals);
        }
      } catch (value) {
        if (!disposed) setError(errorText(value));
      }
    }
    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);

  async function decide(id: string, approve: boolean) {
    setBusy(true);
    setError('');
    try {
      setApprovals(
        await request(`/ai/approvals/${id}`, 'ApprovalList', {
          method: 'POST',
          body: JSON.stringify({ approve }),
        }),
      );
    } catch (value) {
      setError(errorText(value));
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id: string) {
    try {
      await request(`/jobs/${id}/cancel`, 'Job', { method: 'POST' });
      await refresh();
    } catch (value) {
      setError(errorText(value));
    }
  }
  async function clear() {
    setBusy(true);
    setError('');
    try {
      setJobs(await request('/artifacts', 'JobList', { method: 'DELETE' }));
      setConfirmClear(false);
    } catch (value) {
      setError(errorText(value));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>任务</h1>
          <p>
            查看媒体处理结果，批准 AI 请求。记录和临时文件保留 {retention}{' '}
            小时。
          </p>
        </div>
        <button
          onClick={() => {
            void refresh().catch((value: unknown) =>
              setError(errorText(value)),
            );
          }}
        >
          刷新记录
        </button>
      </header>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {approvals.items.length > 0 && (
        <section className="panel media-approvals">
          <h2>AI 操作请求</h2>
          <p>
            批准仅适用于此处列出的参数，10 分钟内有效且只可使用一次。批准后让 AI
            用相同参数重试；可在使用前撤销。
          </p>
          {approvals.items.map((item) => (
            <article key={item.approval_id} className="media-approval">
              <h3>
                {names[item.operation.split('/')[0]] || '媒体操作'} ·{' '}
                {item.status === 'approved'
                  ? '已批准，等待 AI 重试'
                  : '等待批准'}
              </h3>
              <p>
                请求来源 {item.actor.slice(-8)} · 有效至{' '}
                {new Date(item.expires_at).toLocaleTimeString()}
              </p>
              <details>
                <summary>核对本次操作参数</summary>
                <pre>
                  {item.operation}
                  {'\n'}
                  {readableParameters(item.parameters_summary)}
                </pre>
              </details>
              <div className="media-row">
                {item.status === 'pending' && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => {
                      void decide(item.approval_id, true);
                    }}
                  >
                    批准本次请求
                  </button>
                )}
                <button
                  disabled={busy}
                  onClick={() => {
                    void decide(item.approval_id, false);
                  }}
                >
                  {item.status === 'approved' ? '撤销授权' : '拒绝'}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {jobs.items.length === 0 ? (
        <section className="empty">
          <h2>暂时没有处理任务</h2>
          <p>
            从<Link to="/tools/image-editor">图片编辑</Link>、
            <Link to="/tools/video-editor">视频编辑</Link>或
            <Link to="/tools/audio-editor">音频编辑</Link>开始。
          </p>
        </section>
      ) : (
        <div className="media-job-list">
          {jobs.items.map((job) => (
            <div key={job.job_id}>
              <div className="media-row">
                <Link to={`/tools/${job.tool_id}`}>{names[job.tool_id]}</Link>
                <time>{new Date(job.created_at).toLocaleString()}</time>
              </div>
              <JobResult
                job={job}
                onCancel={() => {
                  void cancel(job.job_id);
                }}
              />
            </div>
          ))}
        </div>
      )}
      <details className="tool-help">
        <summary>清理记录与临时文件</summary>
        <p>
          清理本工作区已结束的处理记录和闲置媒体文件。正在处理的输入与已下载到其他目录的文件会保留。AI
          自建临时文件会在保留期后清理；已加入资源库的文件和本机原文件引用会保留。
        </p>
        {confirmClear ? (
          <div className="media-row">
            <button
              disabled={busy}
              onClick={() => {
                void clear();
              }}
            >
              确认清理已结束记录与闲置文件
            </button>
            <button onClick={() => setConfirmClear(false)}>保留文件</button>
          </div>
        ) : (
          <button onClick={() => setConfirmClear(true)}>清理本工作区</button>
        )}
      </details>
      <MediaEnvironmentPanel />
    </>
  );
}
