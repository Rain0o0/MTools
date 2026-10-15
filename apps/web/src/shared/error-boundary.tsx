import { Component } from 'react';
import type { ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <section className="notice error" role="alert">
          <h2>这个页面暂时无法显示</h2>
          <p>可以重新载入页面，或返回工具目录。</p>
          <button onClick={() => this.setState({ failed: false })}>
            重试页面
          </button>
          <a href="/">返回工具目录</a>
        </section>
      );
    }
    return this.props.children;
  }
}
