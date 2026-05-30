import { useState } from "react"
import { Badge } from "../components"

// ── 小型工具组件 ──────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: "GET" | "POST" }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide border ${
      method === "POST"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200"
    }`}>
      {method}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    string:  "bg-amber-50 text-amber-700 border-amber-200",
    number:  "bg-purple-50 text-purple-700 border-purple-200",
    boolean: "bg-pink-50 text-pink-700 border-pink-200",
    object:  "bg-blue-50 text-blue-700 border-blue-200",
    array:   "bg-teal-50 text-teal-700 border-teal-200",
  }
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono border ${colors[type] ?? "bg-muted text-muted-foreground border-border"}`}>
      {type}
    </span>
  )
}

function CodeBlock({ code, lang = "js" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="relative rounded-xl overflow-hidden border bg-[#1e1e2e] shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-white/10">
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">{lang}</span>
        <button
          onClick={copy}
          className="text-[10px] text-white/40 hover:text-white/80 transition-colors px-2 py-0.5 rounded border border-white/10 hover:border-white/30"
        >
          {copied ? "已复制 ✓" : "复制"}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-[#cdd6f4] overflow-x-auto leading-relaxed whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ── 参数表格 ──────────────────────────────────────────────────────────────────

interface Param {
  name: string
  type: string
  required: boolean
  desc: string
  default?: string
}

function ParamTable({ title, params }: { title: string; params: Param[] }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{title}</div>
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-36">参数名</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-24">类型</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground w-16">必须</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">说明</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p, i) => (
              <tr key={p.name} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                <td className="px-4 py-2.5 font-mono text-xs font-medium text-foreground">{p.name}</td>
                <td className="px-4 py-2.5"><TypeBadge type={p.type} /></td>
                <td className="px-4 py-2.5">
                  {p.required
                    ? <span className="text-[10px] font-bold text-red-500">YES</span>
                    : <span className="text-[10px] text-muted-foreground">NO</span>}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {p.desc}
                  {p.default && <span className="ml-1 text-muted-foreground/60">默认 {p.default}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 接口卡片 ──────────────────────────────────────────────────────────────────

interface EndpointDef {
  method: "GET" | "POST"
  path: string
  tag?: string
  summary: string
  desc?: string
  requestParams?: Param[]
  responseDesc?: string
  example?: { req?: string; res?: string }
}

function EndpointCard({ ep }: { ep: EndpointDef }) {
  const [open, setOpen] = useState(false)
  return (
    <div id={`ep-${ep.method.toLowerCase()}-${ep.path.replace(/\//g, "-").replace(/[{}]/g, "")}`} className="rounded-xl border overflow-hidden transition-shadow hover:shadow-sm">
      {/* 头部 - 始终可见 */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <MethodBadge method={ep.method} />
        <span className="font-mono text-sm font-medium">{ep.path}</span>
        {ep.tag && (
          <span className="ml-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 font-medium">
            {ep.tag}
          </span>
        )}
        <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">{ep.summary}</span>
        <span className="ml-auto text-muted-foreground/40 text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {/* 展开内容 */}
      {open && (
        <div className="border-t px-4 py-4 flex flex-col gap-5 bg-muted/10">
          {ep.desc && <p className="text-sm text-muted-foreground leading-relaxed">{ep.desc}</p>}

          {ep.requestParams && (
            <ParamTable title="Request Body (JSON)" params={ep.requestParams} />
          )}

          {ep.responseDesc && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Response</div>
              <p className="text-xs text-muted-foreground font-mono leading-relaxed">{ep.responseDesc}</p>
            </div>
          )}

          {ep.example?.req && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">请求示例</div>
              <CodeBlock code={ep.example.req} lang="json" />
            </div>
          )}
          {ep.example?.res && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">响应示例</div>
              <CodeBlock code={ep.example.res} lang="json" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 文档数据 ──────────────────────────────────────────────────────────────────

const SCREENSHOT_PARAMS: Param[] = [
  { name: "file",            type: "string",  required: true,  desc: "目标内容（URL / HTML 代码 / 文件路径）" },
  { name: "file_type",       type: "string",  required: false, desc: "内容类型：url | htmlString | file | auto（默认）", default: "auto" },
  { name: "selector",        type: "string",  required: false, desc: "CSS 选择器，只截取指定元素，默认 body", default: "body" },
  { name: "omitBackground",  type: "boolean", required: false, desc: "是否隐藏默认白色背景（透明截图）", default: "false" },
  { name: "data",            type: "object",  required: false, desc: "Handlebars 模板数据，仅 file 为模板时有效" },
  { name: "waitSelector",    type: "string",  required: false, desc: "等待该元素出现后再截图" },
  { name: "waitForTimeout",  type: "number",  required: false, desc: "截图前额外等待时间（毫秒）" },
  { name: "type",            type: "string",  required: false, desc: "截图格式：png | jpeg | webp", default: "png" },
  { name: "quality",         type: "number",  required: false, desc: "图片质量 1-100，仅 jpeg/webp 有效", default: "90" },
  { name: "fullPage",        type: "boolean", required: false, desc: "是否截取整个页面", default: "false" },
  { name: "encoding",        type: "string",  required: false, desc: "返回编码：base64 | binary", default: "base64" },
  { name: "multiPage",       type: "boolean", required: false, desc: "分页截图：false | true（2000px/页）| number（自定像素）", default: "false" },
  { name: "headers",         type: "object",  required: false, desc: "额外的 HTTP 请求头" },
  { name: "retry",           type: "number",  required: false, desc: "失败后重试次数", default: "1" },
  { name: "setViewport",     type: "object",  required: false, desc: "视口设置 { width, height, deviceScaleFactor }" },
  { name: "pageGotoParams",  type: "object",  required: false, desc: "页面导航参数 { waitUntil, timeout }" },
]

const CONFIG_PARAMS: Param[] = [
  { name: "browser.executablePath",       type: "string",  required: false, desc: "浏览器可执行路径，留空自动检测" },
  { name: "browser.browserWSEndpoint",    type: "string",  required: false, desc: "远程浏览器 WebSocket 地址" },
  { name: "browser.defaultViewportWidth", type: "number",  required: false, desc: "默认视口宽度", default: "800" },
  { name: "browser.defaultViewportHeight",type: "number",  required: false, desc: "默认视口高度", default: "600" },
  { name: "browser.maxPages",             type: "number",  required: false, desc: "最大并发页面数", default: "10" },
  { name: "browser.proxy.server",         type: "string",  required: false, desc: "代理服务器地址，如 http://127.0.0.1:7890" },
  { name: "browser.proxy.username",       type: "string",  required: false, desc: "代理认证用户名" },
  { name: "browser.proxy.password",       type: "string",  required: false, desc: "代理认证密码" },
  { name: "browser.proxy.bypassList",     type: "string",  required: false, desc: "不走代理的域名，逗号分隔" },
]

interface Section {
  id: string
  title: string
  emoji: string
  endpoints: EndpointDef[]
}

const SECTIONS: Section[] = [
  {
    id: "core",
    title: "核心服务",
    emoji: "②",
    endpoints: [
      {
        method: "POST",
        path: "/screenshot",
        tag: "核心",
        summary: "截图 / 渲染（万能入口）",
        desc: "通用截图接口，支持 URL、本地文件路径或直接传入 HTML 字符串进行渲染。返回 Base64 编码的图片数据。",
        requestParams: SCREENSHOT_PARAMS,
        responseDesc: `{ code: 0, data: "<base64>", time: 123 }  // 成功\n{ code: -1, message: "错误原因" }  // 失败`,
        example: {
          req: `{
  "file": "<h1>Hello World</h1>",
  "file_type": "htmlString",
  "selector": "body",
  "encoding": "base64"
}`,
          res: `{
  "code": 0,
  "data": "iVBORw0KGgoAAAANSUhEUgAA...",
  "time": 342
}`,
        },
      },
      {
        method: "POST",
        path: "/render",
        tag: "核心",
        summary: "渲染 HTML 字符串（快捷方式）",
        desc: "直接传入 HTML 字符串进行渲染，等价于 /screenshot 且 file_type=htmlString。",
        requestParams: [
          { name: "html", type: "string", required: true, desc: "要渲染的 HTML 内容" },
          { name: "selector", type: "string", required: false, desc: "CSS 选择器", default: "body" },
          { name: "encoding", type: "string", required: false, desc: "返回编码", default: "base64" },
        ],
        example: {
          req: `{
  "html": "<div style='padding:20px'>Hello</div>",
  "selector": "div"
}`,
        },
      },
    ],
  },
  {
    id: "browser",
    title: "浏览器控制",
    emoji: "③",
    endpoints: [
      {
        method: "POST",
        path: "/browser/start",
        summary: "启动浏览器",
        desc: "启动浏览器实例。",
        example: {
          res: `{ "code": 0, "message": "浏览器启动成功" }`,
        },
      },
      {
        method: "POST",
        path: "/browser/stop",
        summary: "停止浏览器",
        desc: "停止并关闭浏览器实例。",
        example: {
          res: `{ "code": 0, "message": "浏览器停止成功" }`,
        },
      },
      {
        method: "POST",
        path: "/browser/restart",
        summary: "重启浏览器",
        desc: "重启浏览器实例。",
        example: {
          res: `{ "code": 0, "message": "浏览器重启成功" }`,
        },
      },
    ],
  },
  {
    id: "config",
    title: "系统配置",
    emoji: "④",
    endpoints: [
      {
        method: "GET",
        path: "/config",
        summary: "读取当前插件配置",
        responseDesc: "返回完整的插件配置对象，包含浏览器配置和代理设置。",
      },
      {
        method: "POST",
        path: "/config",
        summary: "更新插件配置",
        desc: "支持部分更新，只需传入需要修改的字段。修改后需重启浏览器才能生效。",
        requestParams: CONFIG_PARAMS,
        example: {
          req: `{
  "browser": {
    "defaultViewportWidth": 1280,
    "defaultViewportHeight": 720,
    "proxy": {
      "server": "http://127.0.0.1:7890"
    }
  }
}`,
        },
      },
      {
        method: "GET",
        path: "/status",
        summary: "获取服务整体状态",
        desc: "返回插件启用状态及浏览器状态，可用于健康检查。",
        example: {
          res: `{
  "code": 0,
  "data": {
    "enabled": true,
    "browser": { "connected": true, "mode": "local", ... }
  }
}`,
        },
      },
      {
        method: "GET",
        path: "/info",
        summary: "获取插件信息",
        desc: "返回插件名称、版本、描述等元信息。",
        example: {
          res: `{
  "code": 0,
  "data": {
    "name": "puppeteer",
    "version": "1.0.0",
    "description": "..."
  }
}`,
        },
      },
    ],
  },
  {
    id: "chrome",
    title: "Chrome 管理",
    emoji: "⑤",
    endpoints: [
      {
        method: "GET",
        path: "/chrome/status",
        summary: "获取 Chrome 安装状态",
        desc: "返回 Chrome 安装信息及当前安装进度。",
        example: {
          res: `{
  "code": 0,
  "data": {
    "installed": true,
    "version": "Chrome/148.0.0.0",
    "progress": null
  }
}`,
        },
      },
      {
        method: "POST",
        path: "/chrome/install",
        summary: "安装 Chrome",
        desc: "异步安装 Chrome，可选传入 version 指定版本。",
        requestParams: [
          { name: "version", type: "string", required: false, desc: "Chrome 版本号，留空使用最新版" },
        ],
        example: {
          req: `{ "version": "stable" }`,
          res: `{ "code": 0, "message": "安装已开始" }`,
        },
      },
      {
        method: "GET",
        path: "/chrome/progress",
        summary: "获取安装进度",
        desc: "返回当前 Chrome 安装进度。",
        example: {
          res: `{ "code": 0, "data": { "percent": 42, "status": "downloading" } }`,
        },
      },
      {
        method: "POST",
        path: "/chrome/uninstall",
        summary: "卸载 Chrome",
        desc: "卸载已安装的 Chrome。",
        example: {
          res: `{ "code": 0, "message": "卸载成功" }`,
        },
      },
    ],
  },
]

const QUICK_START_CODE = `// 在其他插件中调用（无需认证）
const response = await fetch('http://localhost:3000/plugins/puppeteer/api/screenshot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    file: \`<div style="padding:20px;background:#FFF;">
      <h1>Hello {{name}}</h1>
    </div>\`,
    file_type: 'htmlString',
    data: { name: 'World' },
    encoding: 'base64',
  }),
});

const result = await response.json();
// result.data 为 Base64 编码图片数据`

// ── 左侧目录 ──────────────────────────────────────────────────────────────────

const TOC_ITEMS = [
  { id: "start",   label: "快速开始", children: [{ id: "quick-start", label: "调用说明" }] },
  { id: "core",    label: "核心服务", children: SECTIONS[0].endpoints.map(e => ({ id: `ep-${e.method.toLowerCase()}-${e.path.replace(/\//g, "-").replace(/[{}]/g, "")}`, label: `${e.method} ${e.path}` })) },
  { id: "browser", label: "浏览器控制", children: SECTIONS[1].endpoints.map(e => ({ id: `ep-${e.method.toLowerCase()}-${e.path.replace(/\//g, "-").replace(/[{}]/g, "")}`, label: `${e.method} ${e.path}` })) },
  { id: "config",  label: "系统配置", children: SECTIONS[2].endpoints.map(e => ({ id: `ep-${e.method.toLowerCase()}-${e.path.replace(/\//g, "-").replace(/[{}]/g, "")}`, label: `${e.method} ${e.path}` })) },
  { id: "chrome",  label: "Chrome 管理", children: SECTIONS[3].endpoints.map(e => ({ id: `ep-${e.method.toLowerCase()}-${e.path.replace(/\//g, "-").replace(/[{}]/g, "")}`, label: `${e.method} ${e.path}` })) },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

// ── 主页面 ────────────────────────────────────────────────────────────────────

export function DocsPage() {
  const [activeSection, setActiveSection] = useState("quick-start")

  return (
    <div className="flex gap-6 mt-2" style={{ height: "calc(100vh - 120px)" }}>

      {/* ── 左侧目录 ── */}
      <aside className="w-44 shrink-0 overflow-y-auto scrollbar-thin">
        {TOC_ITEMS.map(group => (
          <div key={group.id} className="mb-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2.5 mb-1.5">
              {group.label}
            </div>
            {group.children.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); scrollTo(item.id) }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 font-mono ${
                  activeSection === item.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* ── 右侧内容 ── */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-8 pr-2 scrollbar-thin">

        {/* 快速开始 */}
        <section id="quick-start" className="flex flex-col gap-4 scroll-mt-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs">⚡</span>
            <h2 className="text-base font-bold tracking-tight">快速开始</h2>
          </div>

          {/* API 路径说明 */}
          <div className="rounded-xl border p-4 flex flex-col gap-3">
            <div className="text-sm font-semibold">API 路径说明</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold shrink-0">RECOMMENDED</Badge>
                <span className="text-xs text-muted-foreground">无认证 API（供其他插件调用）</span>
              </div>
              <div className="rounded-lg bg-muted/50 border px-3 py-2 font-mono text-xs">
                <span className="text-muted-foreground">{"{host}"}</span>
                <span className="text-primary font-medium">/plugins/puppeteer/api/</span>
                <span className="text-amber-600">{"{endpoint}"}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold shrink-0">WEBUI</Badge>
                <span className="text-xs text-muted-foreground">需认证 API（WebUI 管理界面）</span>
              </div>
              <div className="rounded-lg bg-muted/50 border px-3 py-2 font-mono text-xs">
                <span className="text-muted-foreground">{"{host}"}</span>
                <span className="text-primary font-medium">/api/Plugin/ext/puppeteer/</span>
                <span className="text-amber-600">{"{endpoint}"}</span>
              </div>
            </div>
          </div>

          {/* 调用示例 */}
          <div className="rounded-xl border p-4 flex flex-col gap-3">
            <div className="text-sm font-semibold">调用示例</div>
            <CodeBlock code={QUICK_START_CODE} lang="javascript" />
          </div>
        </section>

        {/* 各接口分组 */}
        {SECTIONS.map(sec => (
          <section key={sec.id} className="flex flex-col gap-3 scroll-mt-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{sec.emoji}</span>
              <h2 className="text-base font-bold tracking-tight">{sec.title}</h2>
            </div>
            {sec.endpoints.map(ep => (
              <EndpointCard key={ep.path} ep={ep} />
            ))}
          </section>
        ))}

        {/* 底部留白 */}
        <div className="h-8" />
      </div>
    </div>
  )
}
