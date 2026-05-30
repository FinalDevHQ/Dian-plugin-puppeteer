import { useState, useCallback, useRef } from "react"
import type { ToastType } from "../types"

interface Toast {
  id: number
  msg: string
  type: ToastType
}

const COLORS: Record<ToastType, string> = {
  success: "bg-emerald-500 shadow-emerald-500/25",
  error:   "bg-red-500 shadow-red-500/25",
  info:    "bg-primary shadow-primary/25",
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const showToast = useCallback((msg: string, type: ToastType = "success") => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }, [])

  const ToastContainer = (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t, i) => (
        <div
          key={t.id}
          className={`${COLORS[t.type]} text-white pl-3.5 pr-4 py-2.5 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2.5 pointer-events-auto animate-slide-in`}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {ICONS[t.type]}
          {t.msg}
        </div>
      ))}
    </div>
  )

  return { showToast, ToastContainer }
}
