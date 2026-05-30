import { useState } from "react"
import { Card, CardHeader, CardContent, Label, Input, Button } from "../components"
import { API, apiFetch } from "../types"
import type { ToastType } from "../types"

interface Props {
  showToast: (msg: string, type?: ToastType) => void
}

const DEFAULT_HTML = `<html>
<body style="padding:40px;font-family:sans-serif;background:#f0f5ff;">
  <h1 style="color:#6366f1;font-size:2.5em;">Hello Puppeteer!</h1>
  <p style="color:#666;margin-top:12px;">渲染测试页面</p>
  <div style="padding:20px;background:white;border-radius:12px;margin-top:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    测试卡片内容
  </div>
</body>
</html>`

export function TestPage({ showToast }: Props) {
  const [type, setType] = useState<"html" | "url">("html")
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [url, setUrl] = useState("")
  const [selector, setSelector] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ src: string; time: number } | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const run = async () => {
    if (type === "url" && !url.trim()) { showToast("请输入 URL", "error"); return }
    if (type === "html" && !html.trim()) { showToast("请输入 HTML 内容", "error"); return }

    setLoading(true)
    setResult(null)
    setErrMsg(null)

    const body: Record<string, any> = type === "url"
      ? { file: url, file_type: "auto" }
      : { file: html, file_type: "htmlString" }
    if (selector.trim()) body.selector = selector

    try {
      const t0 = Date.now()
      const res = await apiFetch(`${API}/screenshot`, {
        method: "POST",
        body: JSON.stringify(body),
      })
      const data = await res.json()
      const duration = data.time || (Date.now() - t0)

      if (data.code === 0) {
        const src = typeof data.data === "string"
          ? `data:image/png;base64,${data.data}`
          : data.data
        setResult({ src, time: duration })
        showToast(`渲染成功，耗时 ${duration}ms`)
      } else {
        setErrMsg(data.message || "渲染失败")
        showToast("渲染失败: " + (data.message || "未知错误"), "error")
      }
    } catch (e: any) {
      setErrMsg(e.message)
      showToast("渲染失败: " + e.message, "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2 grid md:grid-cols-2 gap-5" style={{ height: "calc(100vh - 160px)", minHeight: 500 }}>
      {/* 左：参数 */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader>
          <Label>测试参数</Label>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4 scrollbar-thin">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">渲染类型</span>
            <select
              value={type}
              onChange={e => setType(e.target.value as "html" | "url")}
              className="flex h-9 w-full rounded-lg border bg-background px-3 py-1 text-sm outline-none transition-all duration-150 focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]"
            >
              <option value="html">HTML 字符串</option>
              <option value="url">URL 地址</option>
            </select>
          </div>

          {type === "url" ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">URL 地址</span>
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="font-mono text-xs"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-medium text-muted-foreground">HTML 内容</span>
              <textarea
                value={html}
                onChange={e => setHtml(e.target.value)}
                rows={10}
                placeholder="<h1>Hello World</h1>"
                className="flex w-full flex-1 rounded-lg border bg-background px-3 py-2 text-xs font-mono outline-none resize-none transition-all duration-150 focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">CSS 选择器（可选）</span>
            <Input
              value={selector}
              onChange={e => setSelector(e.target.value)}
              placeholder="body"
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
        <div className="px-5 pb-5">
          <Button onClick={run} disabled={loading} className="w-full">
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                渲染中…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                执行渲染
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* 右：结果 */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <Label>结果预览</Label>
          {result && (
            <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
              {result.time}ms
            </span>
          )}
        </CardHeader>
        <CardContent className="flex-1 bg-muted/30 flex flex-col items-center justify-center overflow-auto rounded-b-xl">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
              <span className="text-xs font-medium">渲染中...</span>
            </div>
          )}
          {!loading && !result && !errMsg && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="text-xs">等待渲染...</span>
            </div>
          )}
          {!loading && errMsg && (
            <div className="text-destructive p-4 bg-destructive/5 rounded-lg border border-destructive/20 text-sm max-w-sm text-center">
              {errMsg}
            </div>
          )}
          {!loading && result && (
            <img src={result.src} alt="Result" className="max-w-full h-auto shadow-sm border rounded-lg" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
