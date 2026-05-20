/**
 * 浏览器管理模块
 * 负责浏览器的生命周期管理（启动、关闭、重启、状态查询）
 */

import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import puppeteer from 'puppeteer-core';
import type { Browser, Page } from 'puppeteer-core';
import type { BrowserConfig, BrowserStatus } from '../types.js';
import { DEFAULT_BROWSER_CONFIG } from '../config.js';
import {
  getDefaultBrowserPaths,
  installChrome,
  isChromeInstalled,
  getDefaultInstallPath,
  getChromeExecutablePath,
  isInstallingChrome,
  getInstallProgress,
} from './chrome-installer.js';

/** 日志前缀 */
const LOG_TAG = '[Puppeteer]';

/**
 * 浏览器管理器
 */
class BrowserManager {
  /** 浏览器实例 */
  private browser: Browser | null = null;
  /** 当前打开的页面数 */
  private currentPageCount = 0;
  /** 页面等待队列 */
  private pageQueue: Array<() => void> = [];
  /** 是否正在关闭 */
  private isClosing = false;

  /** 统计信息 */
  private stats = {
    totalRenders: 0,
    failedRenders: 0,
    startTime: 0,
  };

  /**
   * 日志输出
   */
  private log(level: 'info' | 'warn' | 'error', msg: string, ...args: unknown[]): void {
    const fn = console[level] || console.log;
    fn(`${LOG_TAG} ${msg}`, ...args);
  }

  /**
   * 调试日志
   */
  private logDebug(msg: string, ...args: unknown[]): void {
    if (process.env.DEBUG) {
      console.log(`${LOG_TAG} [DEBUG] ${msg}`, ...args);
    }
  }

  /**
   * 查找可用的浏览器路径
   */
  findBrowserPath(configPath?: string): string | undefined {
    // 优先使用配置的路径
    if (configPath && existsSync(configPath)) {
      return configPath;
    }

    // 检查插件自动安装的 Chrome
    const installedPath = getChromeExecutablePath(getDefaultInstallPath());
    if (installedPath && existsSync(installedPath)) {
      this.log('info', `检测到已安装的集成浏览器: ${installedPath}`);
      return installedPath;
    }

    // 自动检测系统浏览器
    const defaultPaths = getDefaultBrowserPaths();
    for (const browserPath of defaultPaths) {
      if (browserPath && existsSync(browserPath)) {
        this.log('info', `自动检测到浏览器: ${browserPath}`);
        return browserPath;
      }
    }

    return undefined;
  }

  /**
   * 自动下载安装 Chrome（找不到浏览器时调用）
   */
  async autoInstallChrome(): Promise<string | undefined> {
    if (isInstallingChrome()) {
      this.log('warn', '已有 Chrome 安装任务进行中');
      return undefined;
    }

    this.log('info', '未检测到可用浏览器，正在自动下载 Chrome...');

    const result = await installChrome({
      onProgress: (p) => {
        if (p.message) this.log('info', `[安装] ${p.message}`);
      },
    });

    if (result.success && result.executablePath) {
      this.log('info', `Chrome 自动安装完成: ${result.executablePath}`);
      return result.executablePath;
    } else {
      this.log('error', `Chrome 自动安装失败: ${result.error}`);
      return undefined;
    }
  }

  /**
   * 获取默认视口配置
   */
  private getDefaultViewport(config: BrowserConfig, overrides?: { width?: number; height?: number; deviceScaleFactor?: number }) {
    return {
      width: overrides?.width ?? config.defaultViewportWidth ?? DEFAULT_BROWSER_CONFIG.defaultViewportWidth!,
      height: overrides?.height ?? config.defaultViewportHeight ?? DEFAULT_BROWSER_CONFIG.defaultViewportHeight!,
      deviceScaleFactor: overrides?.deviceScaleFactor ?? config.deviceScaleFactor ?? DEFAULT_BROWSER_CONFIG.deviceScaleFactor!,
    };
  }

  /**
   * 获取浏览器启动参数
   */
  private getBrowserArgs(config: BrowserConfig): string[] {
    if (config.args?.length) {
      return config.args;
    }

    const width = config.defaultViewportWidth ?? DEFAULT_BROWSER_CONFIG.defaultViewportWidth;
    const height = config.defaultViewportHeight ?? DEFAULT_BROWSER_CONFIG.defaultViewportHeight;

    return [
      ...(DEFAULT_BROWSER_CONFIG.args || []),
      `--window-size=${width},${height}`,
    ];
  }

  /**
   * 初始化浏览器
   */
  async init(config: BrowserConfig): Promise<boolean> {
    this.logDebug('init() 被调用');

    if (this.browser) {
      this.log('warn', '浏览器已初始化，跳过');
      return true;
    }

    try {
      // 优先使用远程浏览器连接
      if (config.browserWSEndpoint) {
        this.log('info', `正在连接远程浏览器: ${config.browserWSEndpoint}`);

        this.browser = await puppeteer.connect({
          browserWSEndpoint: config.browserWSEndpoint,
          defaultViewport: this.getDefaultViewport(config),
        });

        this.stats.startTime = Date.now();
        this.log('info', '远程浏览器连接成功');
        this.logDebug('浏览器版本:', await this.browser.version());
        return true;
      }

      // 本地浏览器启动
      let executablePath = this.findBrowserPath(config.executablePath);

      if (!executablePath) {
        // 尝试自动安装 Chrome
        executablePath = await this.autoInstallChrome();
        if (!executablePath) {
          this.log('error', '未找到可用的浏览器且自动安装失败，请在配置中指定浏览器路径或远程浏览器地址(browserWSEndpoint)');
          return false;
        }
      }

      this.log('info', `正在启动本地浏览器: ${executablePath}`);

      const launchOptions: any = {
        executablePath,
        headless: config.headless !== false,
        args: this.getBrowserArgs(config),
        defaultViewport: this.getDefaultViewport(config),
      };

      // 应用代理配置
      if (config.proxy?.server) {
        const proxyServer = config.proxy.server;
        this.log('info', `配置代理服务器: ${proxyServer}`);

        const existingArgs = launchOptions.args || [];
        const filteredArgs = existingArgs.filter(
          (arg: string) => !arg.startsWith('--proxy-')
        );

        launchOptions.args = [
          `--proxy-server=${proxyServer}`,
          ...filteredArgs,
        ];

        if (config.proxy.bypassList) {
          launchOptions.args.push(`--proxy-bypass-list=${config.proxy.bypassList}`);
        }
      }

      this.browser = await puppeteer.launch(launchOptions);

      this.stats.startTime = Date.now();
      this.log('info', '浏览器启动成功');
      this.logDebug('浏览器版本:', await this.browser.version());
      return true;
    } catch (error) {
      this.log('error', '启动/连接浏览器失败:', error);
      this.browser = null;
      return false;
    }
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    this.logDebug('close() 被调用');

    this.isClosing = true;

    if (this.browser) {
      try {
        await this.browser.close();
        this.log('info', '浏览器已关闭');
      } catch (error) {
        this.log('error', '关闭浏览器失败:', error);
      } finally {
        this.browser = null;
        this.currentPageCount = 0;
        this.pageQueue = [];
        this.isClosing = false;
      }
    } else {
      this.logDebug('浏览器未运行，无需关闭');
      this.isClosing = false;
    }
  }

  /**
   * 重启浏览器
   */
  async restart(config: BrowserConfig): Promise<boolean> {
    this.logDebug('restart() 被调用');
    await this.close();
    return this.init(config);
  }

  /**
   * 获取浏览器状态
   */
  async getStatus(): Promise<BrowserStatus> {
    this.logDebug('getStatus() 被调用');

    if (!this.browser) {
      return {
        connected: false,
        mode: 'local',
        pageCount: 0,
        totalRenders: this.stats.totalRenders,
        failedRenders: this.stats.failedRenders,
      };
    }

    try {
      const version = await this.browser.version();
      const pages = await this.browser.pages();

      return {
        connected: true,
        mode: 'local',
        version,
        pageCount: pages.length,
        startTime: this.stats.startTime,
        totalRenders: this.stats.totalRenders,
        failedRenders: this.stats.failedRenders,
      };
    } catch (error) {
      return {
        connected: false,
        mode: 'local',
        pageCount: 0,
        totalRenders: this.stats.totalRenders,
        failedRenders: this.stats.failedRenders,
      };
    }
  }

  /**
   * 获取页面（带并发控制）
   */
  async acquirePage(maxPages: number = 10): Promise<Page> {
    // 如果达到最大并发，等待
    if (this.currentPageCount >= maxPages) {
      await new Promise<void>((resolve) => {
        this.pageQueue.push(resolve);
      });
    }

    this.currentPageCount++;

    if (!this.browser) {
      throw new Error('浏览器未就绪');
    }

    const page = await this.browser.newPage();

    return page;
  }

  /**
   * 释放页面
   */
  async releasePage(page: Page): Promise<void> {
    try {
      await page.close();
    } catch (error) {
      this.logDebug('关闭页面失败:', error);
    }

    this.currentPageCount--;

    // 唤醒等待的任务
    if (this.pageQueue.length > 0) {
      const next = this.pageQueue.shift();
      next?.();
    }
  }

  /**
   * 增加渲染计数
   */
  incrementRenderCount(): void {
    this.stats.totalRenders++;
  }

  /**
   * 增加失败计数
   */
  incrementFailedCount(): void {
    this.stats.failedRenders++;
  }

  /**
   * 检查浏览器是否已连接
   */
  isConnected(): boolean {
    return this.browser !== null;
  }
}

/** 导出单例 */
export const browserManager = new BrowserManager();
