import { useEffect, useState } from 'react';
import { errorText, request } from '../shared/api';
import { useDialog } from '../shared/dialog';
import { usePlatform } from './context';

function ConnectionDetails() {
  const { capabilities } = usePlatform();
  const [value, setValue] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    request('/ai/connection', 'AiConnection')
      .then((connection) =>
        setValue(
          JSON.stringify({ mcpServers: { mtools: connection } }, null, 2),
        ),
      )
      .catch((error: unknown) => setNotice(errorText(error)));
  }, []);
  return (
    <>
      <p>
        在支持 MCP 的 AI
        客户端中添加以下连接信息。连接由客户端启动，无需让软件窗口一直开着。
      </p>
      {capabilities?.mode === 'docker-web' && (
        <p>
          此配置需在运行该容器的电脑上使用，并已安装 Docker
          命令。容器重新创建后，请重新获取连接信息。
        </p>
      )}
      <label htmlFor="ai-config">MTools 连接配置</label>
      <textarea
        id="ai-config"
        className="connection-config"
        value={value}
        readOnly
        rows={12}
      />
      <button
        disabled={!value || !navigator.clipboard}
        onClick={() =>
          navigator.clipboard
            .writeText(value)
            .then(() => setNotice('连接信息已复制'))
            .catch(() => setNotice('复制未成功，请选中上方内容手动复制'))
        }
      >
        复制连接信息
      </button>
      <p role="status">{notice}</p>
      <p>
        连接信息含本机程序位置，请仅用于你信任的 AI
        客户端。工具结果会交给该客户端，请按其隐私设置使用。
      </p>
    </>
  );
}

export function AiPage() {
  const { catalog } = usePlatform();
  const showDialog = useDialog();
  const available =
    catalog?.items.filter((item) => item.status === 'available') ?? [];
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">和你的 AI 一起工作</p>
          <h1>AI 助手</h1>
          <p>把工具交给熟悉的 AI，在对话里直接完成操作。</p>
        </div>
      </header>
      <section className="panel">
        <h2>让 AI 使用 MTools</h2>
        <p>
          连接后，可以对 AI 说：“用 MTools 把这段 JSON 整理一下，保留中文。”
        </p>
        <button
          className="primary"
          onClick={() =>
            showDialog({
              title: '连接你的 AI 助手',
              body: <ConnectionDetails />,
            })
          }
        >
          获取连接信息 →
        </button>
        <p className="muted-hint">
          支持 MCP 的客户端均可接入；软件不会自行连接任何 AI 服务。
        </p>
      </section>
      <h2 className="list-heading">AI 可以使用的工具</h2>
      <div className="help-grid">
        {available.map(({ manifest }) => (
          <button
            className="panel action-panel"
            key={manifest.tool_id}
            onClick={() =>
              showDialog({
                title: manifest.name,
                body: (
                  <>
                    <p>{manifest.description}</p>
                    <p>
                      {manifest.operations
                        .map((operation) => operation.description)
                        .join(' ')}
                    </p>
                    <p>
                      AI
                      与你手动操作使用相同的规则。此工具不会保存输入，也不会修改你的文件。
                    </p>
                  </>
                ),
              })
            }
          >
            <strong>
              {manifest.name} <span aria-hidden="true">↗</span>
            </strong>
            <span>{manifest.operations.length} 个操作 · 点击了解调用范围</span>
          </button>
        ))}
      </div>
      <details className="tool-help">
        <summary>AI 调用时，数据会怎样处理？</summary>
        <p>
          工具只接收本次明确传入的内容。关闭或停用的工具不会对 AI
          开放；格式错误会直接提示，不会悄悄换一种方式处理。
        </p>
        <p>
          当前已开放的操作不会写入文件。以后涉及写入、覆盖、删除或向外发送数据的工具，必须先接入明确授权流程；AI
          自行声称“已获授权”不能绕过限制。
        </p>
      </details>
    </>
  );
}
