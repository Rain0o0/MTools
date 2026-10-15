import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatform } from './context';
import { useDialog } from '../shared/dialog';

export const statusLabels = {
  available: '可使用',
  disabled: '已停用',
  unavailable: '暂不可用',
  incompatible: '环境不兼容',
};

export function CatalogPage() {
  const show = useDialog();
  const { catalog, capabilities, loading, error, reload } = usePlatform();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部工具');
  const entries = catalog?.items ?? [];
  const categories = [
    '全部工具',
    ...new Set(entries.map((entry) => entry.manifest.category)),
  ];
  const keyword = search.toLocaleLowerCase().trim();
  const filtered = entries.filter(
    ({ manifest }) =>
      (category === '全部工具' || manifest.category === category) &&
      [manifest.name, manifest.description, ...manifest.tags]
        .join(' ')
        .toLocaleLowerCase()
        .includes(keyword),
  );
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">你的日常工作台</p>
          <h1>工具目录</h1>
          <p>少一些重复，多一些顺手。找到工具，专注眼前的事。</p>
        </div>
        <Link className="environment" to="/settings">
          {capabilities?.mode === 'docker-web' ? '共享工作区' : '本机工作区'} ·{' '}
          {entries.filter((entry) => entry.status === 'available').length}{' '}
          个可用工具
        </Link>
      </header>
      <section className="welcome">
        <div>
          <span className="eyebrow">小工具，大作用</span>
          <h2>把繁琐留给工具</h2>
          <p>一个清爽的工作区，从整理第一段 JSON 开始。</p>
          <Link className="text-link" to="/tools/json-formatter">
            开始整理 →
          </Link>
        </div>
        <div className="welcome-art" aria-hidden="true">
          {'{ }'}
          <span>整齐 · 清晰 · 高效</span>
        </div>
      </section>
      <div className="catalog-toolbar">
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="搜索工具"
            placeholder="搜索名称、用途或标签…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className="quiet" onClick={reload} disabled={loading}>
          刷新目录
        </button>
      </div>
      <div className="filters" aria-label="工具分类">
        {categories.map((item) => (
          <button
            key={item}
            className={category === item ? 'filter active' : 'filter'}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <button onClick={reload}>重新连接</button>
        </div>
      )}
      {loading && !catalog ? (
        <p role="status">正在连接工具箱…</p>
      ) : (
        <>
          <p className="section-caption">
            {category}
            <span>{filtered.length} 项</span>
          </p>
          {entries.length === 0 && !error ? (
            <div className="empty">
              <h2>工具箱还是空的</h2>
              <p>添加内置工具后，便会出现在这里。</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <h2>没有找到匹配的工具</h2>
              <p>试试更短的关键词，或选择其他分类。</p>
              <button
                onClick={() => {
                  setSearch('');
                  setCategory('全部工具');
                }}
              >
                清除筛选
              </button>
            </div>
          ) : (
            <div className="tool-grid">
              {filtered.map(({ manifest, status, reason }) => (
                <article className="tool-card" key={manifest.tool_id}>
                  <div className="card-top">
                    <span className="tool-icon" aria-hidden="true">
                      {'{ }'}
                    </span>
                    <button
                      type="button"
                      className={`badge ${status}`}
                      onClick={() =>
                        show({
                          title: statusLabels[status],
                          body: (
                            <p>
                              {reason ||
                                '工具已就绪，可以直接使用，也可以在 AI 助手中查看接入方式。'}
                            </p>
                          ),
                        })
                      }
                    >
                      {statusLabels[status]}
                    </button>
                  </div>
                  <h2>{manifest.name}</h2>
                  <p>{manifest.description}</p>
                  <div className="tags">
                    {manifest.tags.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => setSearch(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  {status === 'available' ? (
                    <Link className="card-link" to={manifest.ui.route}>
                      打开工具 <span aria-hidden="true">↗</span>
                    </Link>
                  ) : (
                    <p className="unavailable">{reason}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <button
        type="button"
        className="privacy-note text-button"
        onClick={() =>
          show({
            title: '数据如何处理',
            body: (
              <p>
                桌面版在本机整理文本；共享工作区在提供该工作区的设备上处理。输入和结果不会自动保存为历史，也不会写入运行日志。通过
                AI 调用时，结果会返回给你连接的 AI 应用。
              </p>
            ),
          })
        }
      >
        <span aria-hidden="true">◇</span> 了解数据如何处理
      </button>
    </>
  );
}
