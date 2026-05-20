# dian-plugin-puppeteer

Dian Puppeteer 渲染服务插件 - 提供 HTML/模板截图渲染 API。

## 功能特性

- 🖼️ **多种截图方式** - 支持 URL、HTML 字符串、本地文件截图
- 📐 **灵活的视口配置** - 自定义宽度、高度、设备像素比
- 🎯 **精准元素选择** - 支持 CSS 选择器定位截图元素
- 📄 **全页面截图** - 支持截取完整长页面
- 🔧 **模板渲染** - 支持 `{{key}}` 语法的模板替换
- 🌐 **Web UI 管理** - 浏览器状态监控、配置管理、截图测试
- 🔌 **HTTP API** - 供其他插件调用的截图接口

## 安装

### 方式一：插件市场安装

在 Dian 管理界面的插件市场中搜索 `dian-plugin-puppeteer` 并安装。

### 方式二：手动安装

1. 下载最新版本的 ZIP 文件
2. 在 Dian 管理界面上传 ZIP 文件
3. 重启 Dian 服务

## 使用方法

### 消息指令

| 指令 | 说明 | 示例 |
|------|------|------|
| `#截图 <url>` | 截取网页截图 | `#截图 https://example.com` |
| `#渲染 <html>` | 渲染 HTML 并截图 | `#渲染 <h1>Hello</h1>` |
| `#浏览器状态` | 查看浏览器连接状态 | `#浏览器状态` |

### HTTP API

所有 API 路径前缀：`/plugins/puppeteer/api`

#### 截图接口

```http
POST /screenshot
Content-Type: application/json

{
  "file": "https://example.com",
  "file_type": "auto",
  "selector": "body",
  "type": "png",
  "encoding": "base64",
  "fullPage": false
}
```

#### 渲染接口

```http
POST /render
Content-Type: application/json

{
  "html": "<h1>{{title}}</h1>",
  "data": { "title": "Hello World" }
}
```

#### 浏览器控制

```http
POST /browser/start    # 启动浏览器
POST /browser/stop     # 停止浏览器
POST /browser/restart  # 重启浏览器
GET  /status           # 获取状态
```

#### 配置管理

```http
GET  /config           # 获取配置
POST /config           # 更新配置
```

### Web UI

访问 `/plugins/puppeteer/ui/` 打开管理面板，可以：

- 查看浏览器连接状态
- 启动/停止/重启浏览器
- 测试截图功能
- 编辑配置

## 配置说明

```json
{
  "enabled": true,
  "browser": {
    "executablePath": "",
    "browserWSEndpoint": "",
    "headless": true,
    "args": ["--no-sandbox", "--disable-gpu"],
    "maxPages": 10,
    "timeout": 30000,
    "defaultViewportWidth": 800,
    "defaultViewportHeight": 600,
    "deviceScaleFactor": 1,
    "proxy": {
      "server": "http://127.0.0.1:7890",
      "username": "",
      "password": "",
      "bypassList": ""
    }
  },
  "debug": false
}
```

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `enabled` | 是否启用插件 | `true` |
| `browser.executablePath` | 浏览器可执行文件路径 | 自动检测 |
| `browser.browserWSEndpoint` | 远程浏览器 WebSocket 地址 | 空 |
| `browser.headless` | 是否无头模式 | `true` |
| `browser.maxPages` | 最大并发页面数 | `10` |
| `browser.timeout` | 默认超时时间（毫秒） | `30000` |
| `browser.defaultViewportWidth` | 默认视口宽度 | `800` |
| `browser.defaultViewportHeight` | 默认视口高度 | `600` |
| `browser.proxy.server` | 代理服务器地址 | 空 |

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 打包
npm run pack
```

## 浏览器安装

### Windows / macOS

通常系统已安装 Chrome 或 Edge，插件会自动检测。

### Linux (Docker)

```bash
# Debian/Ubuntu
apt-get update && apt-get install -y chromium

# Alpine
apk add chromium

# CentOS/RHEL
yum install -y chromium
```

### 远程浏览器

可以使用 Docker 运行远程浏览器：

```bash
docker run -d -p 3000:3000 browserless/chrome
```

然后在配置中设置 `browserWSEndpoint: "ws://localhost:3000"`。

## 依赖

- [puppeteer-core](https://pptr.dev/) - 浏览器自动化
- [@myfinal/plugin-runtime](https://github.com/FinalDevHQ/Dian-plugin-template) - Dian 插件运行时

## 许可证

MIT
