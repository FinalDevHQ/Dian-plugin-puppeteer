import { useState, useCallback, useRef } from "react"
import type { ToastType } from "../types"

interface Toast {
  id: number
  msg: string
  type: ToastType
}

const COLORS: Record<ToastType, string> = {
  success: "bg-emerald-500",
  error:   "bg-red-500",
  info:    "bg-indigo-500",
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
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`${COLORS[t.type]} text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  )

  return { showToast, ToastContainer }
}
