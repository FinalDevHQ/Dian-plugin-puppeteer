import { useState } from "react"
import { Card, CardHeader, CardContent, Label, Input, Button } from "../components"
import { API } from "../types"
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
      const res = await fetch(`${API}/screenshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        <CardContent className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">渲染类型</span>
            <select
              value={type}
              onChange={e => setType(e.target.value as "html" | "url")}
              className="flex h-9 w-full rounded-md border bg-input/30 px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="html">HTML 字符串</option>
              <option value="url">URL 地址</option>
            </select>
          </div>

          {type === "url" ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">URL 地址</span>
              <Input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="font-mono"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">HTML 内容</span>
              <textarea
                value={html}
                onChange={e => setHtml(e.target.value)}
                rows={10}
                placeholder="<h1>Hello World</h1>"
                className="flex w-full rounded-md border bg-input/30 px-3 py-2 text-xs font-mono outline-none resize-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">CSS 选择器（可选）</span>
            <Input
              value={selector}
              onChange={e => setSelector(e.target.value)}
              placeholder="body"
              className="font-mono"
            />
          </div>
        </CardContent>
        <div className="px-5 pb-5">
          <Button onClick={run} disabled={loading} className="w-full">
            {loading ? "渲染中…" : "▶ 执行渲染"}
          </Button>
        </div>
      </Card>

      {/* 右：结果 */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <Label>结果预览</Label>
          {result && (
            <span className="text-xs text-muted-foreground font-mono">耗时: {result.time}ms</span>
          )}
        </CardHeader>
        <CardContent className="flex-1 bg-muted/30 flex flex-col items-center justify-center overflow-auto">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              渲染中...
            </div>
          )}
          {!loading && !result && !errMsg && (
            <span className="text-muted-foreground text-sm">等待渲染...</span>
          )}
          {!loading && errMsg && (
            <div className="text-destructive p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-sm max-w-sm text-center">
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
