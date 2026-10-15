import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatform } from './context';
import { useDialog } from '../shared/dialog';
import { errorText, request } from '../shared/api';

const toolSymbols: Record<string, string> = {
  'json-formatter': '{ }',
  'text-diff': '↔',
  'json-lines': '[L]',
  'text-codec': '#',
};

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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [saving, setSaving] = useState(true);
  const [favoriteNotice, setFavoriteNotice] = useState('');
  const favoriteBusy = useRef(false);
  const [preferenceAttempt, setPreferenceAttempt] = useState(0);
  useEffect(() => {
    request('/preferences', 'Preferences')
      .then((value) => {
        setFavorites(value.favorite_tools ?? []);
        setSaving(false);
        setFavoriteNotice('');
      })
      .catch((error: unknown) => setFavoriteNotice(errorText(error)));
  }, [preferenceAttempt]);
  async function toggleFavorite(toolId: string) {
    if (favoriteBusy.current || saving) return;
    const updated = favorites.includes(toolId)
      ? favorites.filter((value) => value !== toolId)
      : [...favorites, toolId];
    if (updated.length > 12) {
      setFavoriteNotice('常用工具最多保留 12 项，请先取消一项。');
      return;
    }
    favoriteBusy.current = true;
    setSaving(true);
    try {
      const result = await request('/preferences', 'Preferences', {
        method: 'PATCH',
        body: JSON.stringify({ favorite_tools: updated }),
      });
      setFavorites(result.favorite_tools ?? []);
      setFavoriteNotice('常用工具已保存');
    } catch (error) {
      setFavoriteNotice(errorText(error));
    } finally {
      favoriteBusy.current = false;
      setSaving(false);
    }
  }
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
      <header className="page-heading compact-heading catalog-heading">
        <div>
          <h1>工具目录</h1>
        </div>
        <Link className="environment" to="/settings">
          {capabilities?.mode === 'docker-web' ? '共享工作区' : '本机工作区'} ·{' '}
          {entries.filter((entry) => entry.status === 'available').length}{' '}
          个可用工具
        </Link>
      </header>
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
      <section className="favorites-row" aria-label="常用工具">
        <span className="favorites-label">常用工具</span>
        {favorites
          .map((toolId) =>
            entries.find((entry) => entry.manifest.tool_id === toolId),
          )
          .filter((entry) => entry?.status === 'available')
          .map(
            (entry) =>
              entry && (
                <Link
                  key={entry.manifest.tool_id}
                  to={entry.manifest.ui.route}
                  className="favorite-shortcut"
                >
                  <span aria-hidden="true">
                    {toolSymbols[entry.manifest.tool_id] ?? '◇'}
                  </span>
                  {entry.manifest.name}
                </Link>
              ),
          )}
        {!saving && favorites.length === 0 && (
          <span className="muted-hint">点击工具卡片的 ☆，添加到这里。</span>
        )}
      </section>
      {favoriteNotice && (
        <p role="status" className="favorite-notice">
          {favoriteNotice}
          {saving && !favoriteBusy.current && (
            <button onClick={() => setPreferenceAttempt((value) => value + 1)}>
              重试读取偏好
            </button>
          )}
        </p>
      )}
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
                      {toolSymbols[manifest.tool_id] ?? '◇'}
                    </span>
                    <button
                      type="button"
                      className="favorite-toggle"
                      disabled={saving}
                      aria-label={`${favorites.includes(manifest.tool_id) ? '取消常用' : '设为常用'} ${manifest.name}`}
                      aria-pressed={favorites.includes(manifest.tool_id)}
                      onClick={() => {
                        void toggleFavorite(manifest.tool_id);
                      }}
                    >
                      {favorites.includes(manifest.tool_id) ? '★' : '☆'}
                    </button>
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
