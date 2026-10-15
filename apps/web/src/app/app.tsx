import { Suspense, useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';
import { AiPage } from '../platform/ai-connection';
import { CatalogPage } from '../platform/catalog';
import { usePlatform } from '../platform/context';
import { request, errorText } from '../shared/api';
import { useDialog } from '../shared/dialog';
import { ErrorBoundary } from '../shared/error-boundary';
import { toolPages } from './registry';

type Theme = 'light' | 'dark';

function ToolRoute() {
  const { toolId } = useParams();
  const { catalog, loading, error, reload } = usePlatform();
  if (loading && !catalog) return <p role="status">正在准备工具…</p>;
  if (error)
    return (
      <div role="alert" className="notice error">
        {error}
        <button onClick={reload}>重新连接</button>
      </div>
    );
  const entry = catalog?.items.find((item) => item.manifest.tool_id === toolId);
  if (!entry) return <NotFound />;
  if (entry.status !== 'available')
    return (
      <section className="empty">
        <h1>{entry.manifest.name}</h1>
        <p>{entry.reason}</p>
        <Link to="/">返回目录</Link>
      </section>
    );
  if (!toolId || !Object.hasOwn(toolPages, toolId))
    return (
      <section className="empty">
        <h1>工具暂时无法打开</h1>
        <p>请更新 MTools 后重试，其他工具仍可正常使用。</p>
        <Link to="/">返回工具目录</Link>
      </section>
    );
  const Page = toolPages[toolId as keyof typeof toolPages];
  return (
    <ErrorBoundary key={toolId}>
      <Suspense fallback={<p role="status">正在打开工具…</p>}>
        <Page />
      </Suspense>
    </ErrorBoundary>
  );
}

function NotFound() {
  return (
    <section className="empty">
      <h1>这里暂时没有内容</h1>
      <p>回到工具目录，重新选择你需要的工具。</p>
      <Link to="/">返回工具目录</Link>
    </section>
  );
}

function JobsPage() {
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">安心处理手头的事</p>
          <h1>任务</h1>
          <p>需要等待的工作，会在这里集中查看。</p>
        </div>
      </header>
      <section className="empty">
        <span className="empty-symbol" aria-hidden="true">
          ◷
        </span>
        <h2>暂时没有需要等待的任务</h2>
        <p>目前的工具会直接给出结果，在工具页就能查看、复制或保存。</p>
        <Link to="/">选一个工具开始 →</Link>
      </section>
      <details className="tool-help">
        <summary>这里会保存我的处理记录吗？</summary>
        <p>当前版本不保存任务历史。需要保留的结果，请在离开工具页前下载。</p>
      </details>
    </>
  );
}

function HelpPage() {
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">随手查阅</p>
          <h1>帮助</h1>
          <p>从输入到结果，只需几个步骤。</p>
        </div>
      </header>
      <div className="help-grid">
        <Link to="/tools/json-formatter" className="panel action-panel">
          <strong>试试第一个工具 →</strong>
          <span>打开 JSON 格式化，填入示例，就能看见整理后的结果。</span>
        </Link>
        <Link to="/ai" className="panel action-panel">
          <strong>让 AI 帮你处理 →</strong>
          <span>连接自己的 AI 助手，让它直接使用 MTools 中的工具。</span>
        </Link>
      </div>
      <details className="tool-help" open>
        <summary>我的内容会被保存或发送出去吗？</summary>
        <p>
          手动操作时，JSON 内容只在当前 MTools
          内处理，不会发给第三方，也不保存输入历史。使用 AI
          连接时，结果会返回你选用的 AI 客户端。
        </p>
      </details>
      <details className="tool-help">
        <summary>处理失败或窗口提示连接中断怎么办？</summary>
        <p>
          先检查输入提示，再点击重试。连接中断可在设置中选择“重新连接”。若仍有问题，向维护者提供提示中的问题编号，无需发送私密内容。
        </p>
      </details>
      <details className="tool-help">
        <summary>结果怎样保存？</summary>
        <p>
          点击工具里的“复制”或“下载”。刷新或离开工具页会清空当前输入和结果，请先保存需要的内容。
        </p>
      </details>
    </>
  );
}

function SettingsPage({
  theme,
  onTheme,
  saving,
  notice,
}: {
  theme: Theme;
  onTheme: (value: Theme) => void;
  saving: boolean;
  notice: string;
}) {
  const { capabilities, error, reload } = usePlatform();
  const showDialog = useDialog();
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">你的使用偏好</p>
          <h1>设置</h1>
          <p>让工作区更适合自己。</p>
        </div>
      </header>
      <section className="panel settings-panel">
        <h2>外观</h2>
        <label htmlFor="theme">界面主题</label>
        <select
          id="theme"
          value={theme}
          disabled={saving}
          onChange={(event) =>
            onTheme(event.target.value === 'dark' ? 'dark' : 'light')
          }
        >
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
        <p>偏好自动保存在这台设备上，下次打开仍会保留。</p>
        {notice && <p role="status">{notice}</p>}
      </section>
      <section className="panel settings-panel">
        <h2>工作状态</h2>
        <p>
          {error
            ? '工具箱暂时连接中断，你的当前输入仍在工具页中。'
            : capabilities
              ? '工具箱已准备好，可以开始使用。'
              : '正在准备工具箱…'}
        </p>
        <div className="settings-actions">
          <button onClick={reload}>重新连接</button>
          <button
            onClick={() =>
              showDialog({
                title: '关于你的数据',
                body: (
                  <>
                    <p>
                      工具输入不保存为历史记录，下载文件由你选择保存位置。主题等偏好存放在软件自己的数据目录。
                    </p>
                    <p>软件不会自动上传文件、收集使用内容或连接 AI 服务。</p>
                  </>
                ),
              })
            }
          >
            数据与隐私
          </button>
          <Link to="/ai">管理 AI 连接 →</Link>
        </div>
        {error && <p role="alert">{error}</p>}
      </section>
    </>
  );
}

export function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [saving, setSaving] = useState(true);
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { error, reload } = usePlatform();
  const showDialog = useDialog();
  useEffect(() => {
    request('/preferences', 'Preferences')
      .then((value) => setTheme(value.theme ?? 'light'))
      .catch(() => setNotice('暂时无法读取偏好，仍可选择本次使用的主题'))
      .finally(() => setSaving(false));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    setMenuOpen(false);
    document.getElementById('main-content')?.focus();
  }, [pathname]);
  const about = () =>
    showDialog({
      title: '关于 MTools',
      body: (
        <>
          <p>MTools 0.1.0 · 让工作更顺手的工具箱。</p>
          <p>
            在一个独立窗口中完成日常处理，也可以将工具连接到自己的 AI 助手。
          </p>
          <p>目前提供 JSON 格式化，更多工具按统一规则逐步加入。</p>
        </>
      ),
    });
  const changeTheme = (value: Theme) => {
    setTheme(value);
    setSaving(true);
    setNotice('');
    request('/preferences', 'Preferences', {
      method: 'PUT',
      body: JSON.stringify({ version: 1, theme: value }),
    })
      .then(() => setNotice('外观偏好已保存'))
      .catch((value: unknown) =>
        setNotice(`本次外观已切换，保存未成功：${errorText(value)}`),
      )
      .finally(() => setSaving(false));
  };
  const pageName = pathname.startsWith('/tools/')
    ? '工具工作区'
    : pathname === '/settings'
      ? '设置'
      : pathname === '/help'
        ? '帮助'
        : pathname === '/jobs'
          ? '任务'
          : pathname === '/ai'
            ? 'AI 助手'
            : '工具目录';
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <Link to="/" className="brand" aria-label="MTools 首页">
          <span className="brand-mark">M</span>
          <span>
            MTools<small>让工作更顺手</small>
          </span>
        </Link>
        <button
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '收起导航' : '展开导航'}
        </button>
        <nav id="main-navigation" aria-label="主要导航">
          <p className="nav-label">工作空间</p>
          <NavLink to="/" end>
            <span aria-hidden="true">▦</span>工具目录
          </NavLink>
          <NavLink to="/jobs">
            <span aria-hidden="true">◷</span>任务
          </NavLink>
          <NavLink to="/ai">
            <span aria-hidden="true">✧</span>AI 助手
          </NavLink>
          <p className="nav-label secondary-label">偏好与支持</p>
          <NavLink to="/settings">
            <span aria-hidden="true">⚙</span>设置
          </NavLink>
          <NavLink to="/help">
            <span aria-hidden="true">ⓘ</span>帮助
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <button
            className={error ? 'connection bad' : 'connection'}
            onClick={error ? reload : about}
          >
            {error ? '连接中断 · 点击重试' : 'MTools · 点击了解'}
          </button>
          <button className="version-button" onClick={about}>
            v0.1.0 · 关于软件
          </button>
        </div>
      </aside>
      <div className="main-column">
        <div className="topbar">
          <span>
            <Link to="/">工作空间</Link>
            <span className="separator">/</span>
            {pageName}
          </span>
          <button
            className="topbar-note text-button"
            onClick={() =>
              showDialog({
                title: '今天的小提示',
                body: (
                  <p>
                    点击工具卡片就能开始；点击标签可以筛选相似工具。需要解释的状态和提示旁，都有可点击的入口。
                  </p>
                ),
              })
            }
          >
            使用小提示 ⓘ
          </button>
        </div>
        <main id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/tools/:toolId" element={<ToolRoute />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/ai" element={<AiPage />} />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  theme={theme}
                  onTheme={changeTheme}
                  saving={saving}
                  notice={notice}
                />
              }
            />
            <Route path="/help" element={<HelpPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <button className="text-button" onClick={about}>
            MTools · 用工具整理日常
          </button>
          <Link to="/help">使用帮助 ↗</Link>
        </footer>
      </div>
    </div>
  );
}
