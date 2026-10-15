import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { ApiError, request } from '../shared/api';
import type { Schemas } from '../shared/api';

type PlatformState = {
  catalog?: Schemas['Catalog'];
  capabilities?: Schemas['Capabilities'];
  loading: boolean;
  error?: string;
  reload: () => void;
};
const Context = createContext<PlatformState | undefined>(undefined);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<PlatformState, 'reload'>>({
    loading: true,
  });
  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, loading: true, error: undefined }));
    Promise.all([
      request('/tools', 'Catalog'),
      request('/capabilities', 'Capabilities'),
    ])
      .then(([catalog, capabilities]) =>
        setState({ catalog, capabilities, loading: false }),
      )
      .catch((error: unknown) =>
        setState((previous) => ({
          ...previous,
          loading: false,
          error:
            error instanceof ApiError
              ? `${error.message}${error.requestId ? ` · 诊断编号 ${error.requestId}` : ''}`
              : '连接失败，请重试',
        })),
      );
  }, []);
  useEffect(reload, [reload]);
  return (
    <Context.Provider value={{ ...state, reload }}>{children}</Context.Provider>
  );
}

export function usePlatform() {
  const context = useContext(Context);
  if (!context) throw new Error('平台上下文未建立');
  return context;
}
