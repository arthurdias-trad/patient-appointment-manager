"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Alert } from "@/components/ui/alert";

type Notice = { message: string; tone: "success" | "error" };

type NoticeContextValue = {
  notice: Notice | null;
  showNotice: (message: string, tone?: Notice["tone"]) => void;
  clearNotice: () => void;
};

const NoticeContext = createContext<NoticeContextValue | null>(null);

export function NoticeProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const showNotice = useCallback(
    (message: string, tone: Notice["tone"] = "success") =>
      setNotice({ message, tone }),
    [],
  );
  const clearNotice = useCallback(() => setNotice(null), []);
  const value = useMemo(
    () => ({ notice, showNotice, clearNotice }),
    [notice, showNotice, clearNotice],
  );

  return (
    <NoticeContext.Provider value={value}>{children}</NoticeContext.Provider>
  );
}

export function useNotice() {
  const context = useContext(NoticeContext);
  if (!context) {
    throw new Error("useNotice must be used within NoticeProvider");
  }
  return context;
}

export function NoticeBanner() {
  const { notice } = useNotice();
  if (!notice) return null;

  return (
    <Alert tone={notice.tone} id="list-notice" tabIndex={-1}>
      {notice.message}
    </Alert>
  );
}
