/**
 * Dian Puppeteer 渲染服务插件
 *
 * 功能：
 * - 提供 HTML/模板截图渲染 API
 * - 支持 URL、本地文件、HTML 字符串渲染
 * - 支持分页截图、自定义视口
 * - 其他插件可通过 HTTP 路由调用
 */

import "reflect-metadata";
import {
  Plugin,
  Handler,
  Interceptor,
  type EventContext,
  type PluginSetupContext,
} from "@myfinal/plugin-runtime";
import { loadConfig, saveConfig } from "./config.js";
import { browserManager } from "./services/browser-manager.js";
import { screenshot, renderHtml, screenshotUrl } from "./services/screenshot.js";
import {
  installChrome,
  uninstallChrome,
  getInstallProgress,
  isInstallingChrome,
  isChromeInstalled,
  getInstalledChromeInfo,
  getDefaultInstallPath,
  DEFAULT_CHROME_VERSION,
} from "./services/chrome-installer.js";
import type { PluginConfig, ScreenshotOptions } from "./types.js";

@Plugin({
  name: "puppeteer",
  description: "Puppeteer 渲染服务 - 提供 HTML/模板截图渲染 API",
  version: "1.0.0",
  author: "Dian",
  icon: "🎨",
})
export default class PuppeteerPlugin {
  /** 运行时配置 */
  private config: PluginConfig;

  constructor() {
    this.config = loadConfig();
  }

  // ── 消息 Handler：截图指令 ─────────────────────────────

  @Handler(/^#截图\s+(.+)$/i)
  async onScreenshot(ctx: EventContext): Promise<void> {
    const text = ctx.event.payload.text ?? "";
    const match = text.match(/^#截图\s+(.+)$/i);
    if (!match) return;

    const url = match[1].trim();
    if (!url) {
      await ctx.reply("请提供要截图的 URL");
      return;
    }

    await ctx.reply("正在截图，请稍候...");

    const result = await screenshot({
      file: url,
      file_type: 'auto',
      encoding: 'base64',
    });

    if (result.status) {
      // 发送图片（base64 格式）
      await ctx.reply(`[CQ:image,base64=${result.data}]`);
    } else {
      await ctx.reply(`截图失败: ${result.message}`);
    }
  }

  // ── 消息 Handler：渲染 HTML ─────────────────────────────

  @Handler(/^#渲染\s+([\s\S]+)$/i)
  async onRender(ctx: EventContext): Promise<void> {
    const text = ctx.event.payload.text ?? "";
    const match = text.match(/^#渲染\s+([\s\S]+)$/i);
    if (!match) return;

    const html = match[1].trim();
    if (!html) {
      await ctx.reply("请提供要渲染的 HTML 内容");
      return;
    }

    const result = await renderHtml(html);

    if (result.status) {
      await ctx.reply(`[CQ:image,base64=${result.data}]`);
    } else {
      await ctx.reply(`渲染失败: ${result.message}`);
    }
  }

  // ── 消息 Handler：浏览器状态 ─────────────────────────────

  @Handler("#浏览器状态")
  async onBrowserStatus(ctx: EventContext): Promise<void> {
    const status = await browserManager.getStatus();
    const lines = [
      `🎨 Puppeteer 渲染服务`,
      `━━━━━━━━━━━━━━━━━━`,
      `连接状态: ${status.connected ? '✅ 已连接' : '❌ 未连接'}`,
      `连接模式: ${status.mode === 'remote' ? '远程' : '本地'}`,
      `浏览器版本: ${status.version || '未知'}`,
      `当前页面数: ${status.pageCount}`,
      `总渲染次数: ${status.totalRenders}`,
      `失败次数: ${status.failedRenders}`,
    ];

    if (status.startTime) {
      const uptime = Math.floor((Date.now() - status.startTime) / 1000);
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;
      lines.push(`运行时长: ${hours}小时${minutes}分钟${seconds}秒`);
    }

    await ctx.reply(lines.join('\n'));
  }

  // ── 拦截器：日志 ──────────────────────────────────────

  @Interceptor(100)
  async logInterceptor(ctx: EventContext): Promise<void> {
    if (this.config.debug && ctx.event.type === 'message') {
      console.log(`[puppeteer] ${ctx.event.payload.text}`);
    }
  }

  // ── 生命周期：初始化 ──────────────────────────────────

  async onSetup(ctx: PluginSetupContext): Promise<void> {
    // 初始化浏览器
    if (this.config.enabled) {
      await browserManager.init(this.config.browser);
    }

    // ── HTTP API 路由 ────────────────────────────────────

    // GET /plugins/puppeteer/api/status
    ctx.route("GET", "/status", async (_req, reply) => {
      const status = await browserManager.getStatus();
      reply.send({
        code: 0,
        data: {
          enabled: this.config.enabled,
          browser: status,
        },
      });
    });

    // GET /plugins/puppeteer/api/info
    ctx.route("GET", "/info", (_req, reply) => {
      reply.send({
        code: 0,
        data: {
          name: "puppeteer",
          version: "1.0.0",
          description: "Puppeteer 渲染服务",
        },
      });
    });

    // POST /plugins/puppeteer/api/screenshot
    ctx.route("POST", "/screenshot", async (req, reply) => {
      const body = req.body as ScreenshotOptions;

      if (!body.file) {
        reply.status(400).send({ code: -1, message: '缺少 file 参数' });
        return;
      }

      const result = await screenshot(body);
      reply.send({
        code: result.status ? 0 : -1,
        data: result.data,
        time: result.time,
        message: result.message,
      });
    });

    // POST /plugins/puppeteer/api/render
    ctx.route("POST", "/render", async (req, reply) => {
      const body = req.body as { html: string; data?: Record<string, any> } & Partial<ScreenshotOptions>;

      if (!body.html) {
        reply.status(400).send({ code: -1, message: '缺少 html 参数' });
        return;
      }

      const result = await renderHtml(body.html, {
        data: body.data,
        ...body,
      });

      reply.send({
        code: result.status ? 0 : -1,
        data: result.data,
        time: result.time,
        message: result.message,
      });
    });

    // POST /plugins/puppeteer/api/browser/start
    ctx.route("POST", "/browser/start", async (_req, reply) => {
      const success = await browserManager.init(this.config.browser);
      reply.send({
        code: success ? 0 : -1,
        message: success ? '浏览器已启动' : '启动浏览器失败',
      });
    });

    // POST /plugins/puppeteer/api/browser/stop
    ctx.route("POST", "/browser/stop", async (_req, reply) => {
      await browserManager.close();
      reply.send({
        code: 0,
        message: '浏览器已关闭',
      });
    });

    // POST /plugins/puppeteer/api/browser/restart
    ctx.route("POST", "/browser/restart", async (_req, reply) => {
      const success = await browserManager.restart(this.config.browser);
      reply.send({
        code: success ? 0 : -1,
        message: success ? '浏览器已重启' : '重启浏览器失败',
      });
    });

    // GET /plugins/puppeteer/api/config
    ctx.route("GET", "/config", (_req, reply) => {
      reply.send({
        code: 0,
        data: this.config,
      });
    });

    // POST /plugins/puppeteer/api/config
    ctx.route("POST", "/config", async (req, reply) => {
      const body = req.body as Partial<PluginConfig>;

      // 合并配置
      if (body.browser) {
        this.config.browser = { ...this.config.browser, ...body.browser };
        delete body.browser;
      }
      this.config = { ...this.config, ...body } as PluginConfig;

      // 保存配置
      saveConfig(this.config);

      reply.send({
        code: 0,
        message: '配置已保存',
        data: this.config,
      });
    });

    // ── 命令注册（帮助菜单）──────────────────────────────

    ctx.command({
      name: "#截图",
      pattern: /^#截图\s+.+$/i,
      description: "截取网页截图",
      category: "工具",
    });

    ctx.command({
      name: "#渲染",
      pattern: /^#渲染\s+.+$/i,
      description: "渲染 HTML 并截图",
      category: "工具",
    });

    ctx.command({
      name: "#浏览器状态",
      pattern: "#浏览器状态",
      description: "查看浏览器连接状态",
      category: "工具",
    });

    // ── Chrome 安装管理 API ─────────────────────────────

    // GET /plugins/puppeteer/api/chrome/status
    ctx.route("GET", "/chrome/status", async (_req, reply) => {
      const info = await getInstalledChromeInfo();
      reply.send({
        code: 0,
        data: {
          installed: info.installed,
          executablePath: info.executablePath,
          version: info.version,
          installing: isInstallingChrome(),
          progress: getInstallProgress(),
          defaultVersion: DEFAULT_CHROME_VERSION,
          installPath: getDefaultInstallPath(),
        },
      });
    });

    // POST /plugins/puppeteer/api/chrome/install
    ctx.route("POST", "/chrome/install", async (req, reply) => {
      if (isInstallingChrome()) {
        reply.send({ code: -1, message: '已有安装任务正在进行中' });
        return;
      }

      const body = req.body as { version?: string } || {};

      // 异步安装，立即返回
      installChrome({
        version: body.version,
        onProgress: (p) => {
          console.log(`[ChromeInstaller] ${p.message}`);
        },
      }).then((result) => {
        if (result.success) {
          console.log(`[ChromeInstaller] 安装完成: ${result.executablePath}`);
        } else {
          console.error(`[ChromeInstaller] 安装失败: ${result.error}`);
        }
      });

      reply.send({
        code: 0,
        message: 'Chrome 安装任务已启动，请通过 /chrome/status 查询进度',
      });
    });

    // GET /plugins/puppeteer/api/chrome/progress
    ctx.route("GET", "/chrome/progress", (_req, reply) => {
      reply.send({
        code: 0,
        data: getInstallProgress(),
        installing: isInstallingChrome(),
      });
    });

    // POST /plugins/puppeteer/api/chrome/uninstall
    ctx.route("POST", "/chrome/uninstall", async (_req, reply) => {
      const result = await uninstallChrome();
      reply.send({
        code: result.success ? 0 : -1,
        message: result.success ? 'Chrome 已卸载' : (result.error || '卸载失败'),
      });
    });

    // ── Web UI ───────────────────────────────────────────
    ctx.ui({ staticDir: "./ui", entry: "index.html" });
  }
}
