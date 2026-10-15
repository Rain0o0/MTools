import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type DialogContent = { title: string; body: ReactNode };
const DialogContext = createContext<(content: DialogContent) => void>(
  () => undefined,
);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<DialogContent>();
  const element = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (content && !element.current?.open) element.current?.showModal();
  }, [content]);
  return (
    <DialogContext.Provider value={setContent}>
      {children}
      <dialog
        ref={element}
        className="info-dialog"
        aria-labelledby="dialog-title"
        onClose={() => setContent(undefined)}
        onCancel={() => setContent(undefined)}
        onClick={(event) => {
          if (event.target === event.currentTarget) element.current?.close();
        }}
      >
        {content && (
          <>
            <header>
              <h2 id="dialog-title">{content.title}</h2>
              <button
                autoFocus
                aria-label="关闭说明"
                onClick={() => element.current?.close()}
              >
                关闭
              </button>
            </header>
            <div className="dialog-body">{content.body}</div>
          </>
        )}
      </dialog>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  return useContext(DialogContext);
}
