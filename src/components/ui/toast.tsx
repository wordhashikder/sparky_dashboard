import { CheckCircle2, X, XCircle } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; tone: "success" | "error"; text: string };
type ToastContextValue = {
  success: (text: string) => void;
  error: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: Toast["tone"], text: string) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-3), { id, tone, text }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (text: string) => push("success", text),
      error: (text: string) => push("error", text),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm text-ink shadow-float",
              toast.tone === "error" ? "border-red-200" : "border-line",
            )}
          >
            {toast.tone === "success" ? (
              <CheckCircle2
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
            ) : (
              <XCircle
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-red-600"
              />
            )}
            <p className="flex-1">{toast.text}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="cursor-pointer text-subtle hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
