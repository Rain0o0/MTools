import { useEffect, useState } from 'react';
import { usePlatform } from './context';
import { errorText, request } from '../shared/api';
import type { Schemas } from '../shared/api';

export function MediaEnvironmentPanel() {
  const { reload } = usePlatform();
  const [environment, setEnvironment] = useState<Schemas['MediaEnvironment']>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    request('/media/environment', 'MediaEnvironment')
      .then((value) => {
        if (active) setEnvironment(value);
      })
      .catch((value: unknown) => {
        if (active) setError(errorText(value));
      });
    return () => {
      active = false;
    };
  }, []);
  async function check() {
    setBusy(true);
    setError('');
    try {
      setEnvironment(
        await request('/media/environment/check', 'MediaEnvironment', {
          method: 'POST',
        }),
      );
      reload();
    } catch (value) {
      setError(errorText(value));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel media-environment">
      <div className="media-row">
        <h2>媒体组件</h2>
        <button
          disabled={busy}
          onClick={() => {
            void check();
          }}
        >
          {busy ? '正在检测…' : '重新检测'}
        </button>
      </div>
      <p role="status">{environment?.message || '正在读取组件状态…'}</p>
      {environment?.video_acceleration && (
        <>
          <p>
            视频编码：{environment.video_acceleration.label} ·{' '}
            {environment.video_acceleration.cached
              ? '已复用本机检测记录'
              : '本次检测已完成'}
          </p>
          <p className="muted">
            显卡不可用时自动使用 CPU。画面裁剪、叠加与声音处理仍使用 CPU。
          </p>
          {environment.video_acceleration.cache_warning && (
            <p role="status">{environment.video_acceleration.cache_warning}</p>
          )}
        </>
      )}
      {environment?.version && <p className="muted">{environment.version}</p>}
      {error && <p role="alert">{error}</p>}
      <details>
        <summary>换电脑或组件不可用时怎样处理？</summary>
        <p>
          首次检测会用短片实测常见显卡编码方式，并保存结果；后续直接复用。更换机器、FFmpeg
          或 Windows 显卡驱动后自动重新检测，点击“重新检测”也可更新记录。
        </p>
        <p>
          每次启动会自动检查 FFmpeg 和 FFprobe
          是否能运行，并核对所需编码器与处理组件。Windows
          目录包不会自动下载外部程序；请安装完整 FFmpeg，将包含
          ffmpeg.exe、ffprobe.exe 的 bin 目录加入系统 PATH，重新打开 MTools
          后再检测。便携安装也可放入 MTools.exe 同级的 media 文件夹。Docker
          镜像内已安装组件。
        </p>
        <p>
          重新检测只检查本机组件，不上传文件、不修改系统设置。组件不可用时，其他工具仍可使用。
        </p>
      </details>
    </section>
  );
}
