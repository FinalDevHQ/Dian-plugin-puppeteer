/**
 * 截图服务模块
 * 提供 HTML/URL 截图的核心逻辑
 */

import { readFileSync, existsSync } from 'node:fs';
import type { Page } from 'puppeteer-core';
import { browserManager } from './browser-manager.js';
import { renderTemplate } from './template.js';
import type { ScreenshotOptions, RenderResult, Encoding, MultiPage } from '../types.js';

/** 日志前缀 */
const LOG_TAG = '[Puppeteer]';

/**
 * 日志输出
 */
function log(level: 'info' | 'warn' | 'error', msg: string, ...args: unknown[]): void {
  const fn = console[level] || console.log;
  fn(`${LOG_TAG} ${msg}`, ...args);
}

/**
 * 调试日志
 */
function logDebug(msg: string, ...args: unknown[]): void {
  if (process.env.DEBUG) {
    console.log(`${LOG_TAG} [DEBUG] ${msg}`, ...args);
  }
}

/**
 * 查找截图目标元素
 */
async function findTargetElement(page: Page, selector?: string) {
  const findDefault = async () => {
    const container = await page.$('#container');
    if (container) return container;
    const body = await page.$('body');
    return body!;
  };

  try {
    if (selector) {
      const element = await page.$(selector);
      if (element) return element;
    }
    return findDefault();
  } catch (error) {
    logDebug('查找元素失败:', error);
    return findDefault();
  }
}

/**
 * 核心截图函数
 */
export async function screenshot<
  T extends Encoding = 'base64',
  M extends MultiPage = false
>(options: ScreenshotOptions): Promise<RenderResult<T, M>> {
  const startTime = Date.now();
  browserManager.incrementRenderCount();

  logDebug('screenshot() 被调用, 参数:', JSON.stringify({
    file_type: options.file_type,
    file: options.file?.substring(0, 100) + (options.file?.length > 100 ? '...' : ''),
    encoding: options.encoding,
    selector: options.selector,
    fullPage: options.fullPage,
    multiPage: options.multiPage,
    setViewport: options.setViewport,
  }, null, 2));

  let page: Page | null = null;

  try {
    // 获取页面
    logDebug('正在获取页面...');
    page = await browserManager.acquirePage();
    logDebug('页面获取成功');

    const timeout = options.pageGotoParams?.timeout || 30000;

    // 设置视口
    if (options.setViewport) {
      logDebug('设置视口:', options.setViewport);
      await page.setViewport({
        width: options.setViewport.width || 800,
        height: options.setViewport.height || 600,
        deviceScaleFactor: options.setViewport.deviceScaleFactor || 1,
      });
    }

    // 设置额外的 HTTP 头
    if (options.headers) {
      logDebug('设置 HTTP 头:', options.headers);
      await page.setExtraHTTPHeaders(options.headers);
    }

    // 确定导航目标
    if (options.file_type === 'htmlString' ||
      (!options.file.startsWith('http://') &&
        !options.file.startsWith('https://') &&
        !options.file.startsWith('file://'))) {
      // HTML 字符串，需要先渲染模板
      logDebug('渲染 HTML 字符串, 长度:', options.file.length);
      let html = options.file;
      if (options.data) {
        logDebug('应用模板数据:', Object.keys(options.data));
        html = renderTemplate(html, options.data);
      }
      await page.setContent(html, {
        waitUntil: (options.pageGotoParams?.waitUntil || 'networkidle0') as any,
        timeout,
      });
      logDebug('HTML 内容已设置');
    } else {
      // URL 或 file:// 路径
      const targetUrl = options.file;

      // 处理 file:// 协议，读取文件并渲染模板
      if (targetUrl.startsWith('file://')) {
        const filePath = targetUrl.replace('file://', '');
        logDebug('读取本地文件:', filePath);
        if (existsSync(filePath)) {
          let html = readFileSync(filePath, 'utf-8');
          if (options.data) {
            logDebug('应用模板数据:', Object.keys(options.data));
            html = renderTemplate(html, options.data);
          }
          await page.setContent(html, {
            waitUntil: (options.pageGotoParams?.waitUntil || 'networkidle0') as any,
            timeout,
          });
          logDebug('本地文件内容已设置');
        } else {
          throw new Error(`文件不存在: ${filePath}`);
        }
      } else {
        logDebug('导航到 URL:', targetUrl);
        await page.goto(targetUrl, {
          waitUntil: options.pageGotoParams?.waitUntil || 'networkidle0',
          timeout,
        });
        logDebug('页面导航完成');
      }
    }

    // 等待指定选择器
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout });
    }

    // 等待指定时间
    if (options.waitForTimeout) {
      await new Promise(resolve => setTimeout(resolve, options.waitForTimeout));
    }

    // 截图选项
    const screenshotOptions: any = {
      type: options.type || 'png',
      encoding: options.encoding || 'base64',
      omitBackground: options.omitBackground || false,
    };

    if (options.type !== 'png' && options.quality) {
      screenshotOptions.quality = options.quality;
    }

    // 全页面截图
    if (options.fullPage) {
      logDebug('执行全页面截图');
      screenshotOptions.fullPage = true;
      screenshotOptions.captureBeyondViewport = true;

      const result = await page.screenshot(screenshotOptions);
      logDebug('全页面截图完成');

      return {
        status: true,
        data: result as any,
        time: Date.now() - startTime,
      };
    }

    // 获取目标元素
    logDebug('查找目标元素, selector:', options.selector || '默认');
    const element = await findTargetElement(page, options.selector);
    const box = await element.boundingBox();
    logDebug('元素边界:', box);

    // 更新视口以适应元素
    if (box) {
      await page.setViewport({
        width: Math.ceil(box.width) || 800,
        height: Math.ceil(box.height) || 600,
        deviceScaleFactor: options.setViewport?.deviceScaleFactor || 1,
      });
    }

    // 分页截图
    if (options.multiPage && box) {
      const pageHeight = typeof options.multiPage === 'number'
        ? options.multiPage
        : (box.height >= 2000 ? 2000 : box.height);

      const totalPages = Math.ceil(box.height / pageHeight);
      logDebug(`执行分页截图, 每页高度: ${pageHeight}, 总页数: ${totalPages}`);
      const results: any[] = [];

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        let y = pageIndex * pageHeight;
        let height = Math.min(pageHeight, box.height - pageIndex * pageHeight);

        if (pageIndex !== 0) {
          y -= 100;
          height += 100;
        }

        const clipOptions = {
          ...screenshotOptions,
          clip: { x: 0, y, width: box.width, height },
        };

        const screenshot = await element.screenshot(clipOptions);
        results.push(screenshot);
      }

      return {
        status: true,
        data: results as any,
        time: Date.now() - startTime,
      };
    }

    // 单页截图
    logDebug('执行单页截图');
    const result = await element.screenshot(screenshotOptions);
    const elapsed = Date.now() - startTime;
    logDebug(`截图完成, 耗时: ${elapsed}ms`);

    return {
      status: true,
      data: result as any,
      time: elapsed,
    };

  } catch (error) {
    browserManager.incrementFailedCount();
    const message = error instanceof Error ? error.message : String(error);
    log('error', '截图失败:', message);
    logDebug('截图失败详情:', error);

    return {
      status: false,
      data: '' as any,
      message,
      time: Date.now() - startTime,
    };
  } finally {
    if (page) {
      logDebug('释放页面');
      await browserManager.releasePage(page);
    }
  }
}

/**
 * 渲染 HTML 并截图（便捷方法）
 */
export async function renderHtml(
  html: string,
  options?: Partial<ScreenshotOptions>
): Promise<RenderResult<'base64', false>> {
  logDebug('renderHtml() 被调用, HTML 长度:', html.length);
  return screenshot({
    file: html,
    file_type: 'htmlString',
    encoding: 'base64',
    ...options,
  });
}

/**
 * 截图 URL（便捷方法）
 */
export async function screenshotUrl(
  url: string,
  options?: Partial<ScreenshotOptions>
): Promise<RenderResult<'base64', false>> {
  logDebug('screenshotUrl() 被调用, URL:', url);
  return screenshot({
    file: url,
    file_type: 'auto',
    encoding: 'base64',
    ...options,
  });
}
