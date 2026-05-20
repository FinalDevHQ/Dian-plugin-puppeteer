/**
 * Chrome 浏览器安装服务
 * 参考 napcat-plugin-puppeteer 实现
 * 支持多平台：Windows、macOS、Linux（包括 ARM 架构）
 * 支持多种 Linux 发行版：Debian/Ubuntu、Fedora/RHEL/CentOS、Arch、openSUSE、Alpine
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';
import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const LOG_TAG = '[ChromeInstaller]';

function log(level: 'info' | 'warn' | 'error', msg: string, ...args: unknown[]): void {
  console[level](`${LOG_TAG} ${msg}`, ...args);
}

// ==================== 常量定义 ====================

/** Chrome 下载源 */
export const DOWNLOAD_SOURCES = {
  NPMMIRROR: 'https://cdn.npmmirror.com/binaries/chrome-for-testing',
  NPMMIRROR_REGISTRY: 'https://registry.npmmirror.com/-/binary/chrome-for-testing',
  GOOGLE: 'https://storage.googleapis.com/chrome-for-testing-public',
} as const;

/** 版本信息 JSON 地址 */
const VERSIONS_JSON_URLS = {
  NPMMIRROR: 'https://cdn.npmmirror.com/binaries/chrome-for-testing/known-good-versions-with-downloads.json',
  GOOGLE: 'https://googlechromelabs.github.io/chrome-for-testing/known-good-versions-with-downloads.json',
} as const;

/** 默认 Chrome 版本 */
export const DEFAULT_CHROME_VERSION = '131.0.6778.204';

// ==================== 类型定义 ====================

interface ChromePlatformDownload { platform: string; url: string; }
interface ChromeVersionInfo {
  version: string;
  revision: string;
  downloads: { chrome?: ChromePlatformDownload[]; };
}
interface KnownGoodVersionsWithDownloads {
  timestamp: string;
  versions: ChromeVersionInfo[];
}

export type InstallStatus = 'idle' | 'downloading' | 'extracting' | 'installing-deps' | 'completed' | 'failed';

export interface InstallProgress {
  status: InstallStatus;
  progress: number;
  message: string;
  error?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: string;
  eta?: string;
}

export interface InstallOptions {
  version?: string;
  source?: keyof typeof DOWNLOAD_SOURCES | string;
  installPath?: string;
  installDeps?: boolean;
  onProgress?: (progress: InstallProgress) => void;
}

// ==================== 平台检测 ====================

type PlatformValue = 'win32' | 'win64' | 'darwin' | 'darwin_arm' | 'linux' | 'linux_arm';

function getCurrentPlatform(): PlatformValue {
  const p = os.platform();
  const arch = os.arch();
  if (p === 'win32') return arch === 'x64' ? 'win64' : 'win32';
  if (p === 'darwin') return arch === 'arm64' ? 'darwin_arm' : 'darwin';
  if (p === 'linux') return (arch === 'arm64' || arch === 'arm') ? 'linux_arm' : 'linux';
  return 'linux';
}

function getPlatformForDownload(): string {
  const p = getCurrentPlatform();
  const map: Record<PlatformValue, string> = {
    win32: 'win32', win64: 'win64',
    darwin: 'mac-x64', darwin_arm: 'mac-arm64',
    linux: 'linux64', linux_arm: 'linux64',
  };
  return map[p] || 'linux64';
}

// ==================== Linux 发行版检测 ====================

enum LinuxDistro { DEBIAN = 'debian', FEDORA = 'fedora', SUSE = 'suse', ARCH = 'arch', ALPINE = 'alpine', UNKNOWN = 'unknown' }

async function detectLinuxDistro(): Promise<LinuxDistro> {
  if (os.platform() !== 'linux') return LinuxDistro.UNKNOWN;
  try {
    if (fs.existsSync('/etc/os-release')) {
      const r = fs.readFileSync('/etc/os-release', 'utf8');
      if (/ID=debian|ID=ubuntu|ID_LIKE=.*debian/i.test(r)) return LinuxDistro.DEBIAN;
      if (/ID=fedora|ID=rhel|ID=centos|ID_LIKE=.*fedora|ID=rocky|ID=almalinux|ID=amzn/i.test(r)) return LinuxDistro.FEDORA;
      if (/ID=opensuse|ID=suse|ID=sles|ID_LIKE=.*opensuse/i.test(r)) return LinuxDistro.SUSE;
      if (/ID=arch|ID=manjaro|ID_LIKE=.*arch/i.test(r)) return LinuxDistro.ARCH;
      if (/ID=alpine/i.test(r)) return LinuxDistro.ALPINE;
    }
    try { await execAsync('apt --version'); return LinuxDistro.DEBIAN; } catch {}
    try { await execAsync('dnf --version'); return LinuxDistro.FEDORA; } catch {}
    try { await execAsync('yum --version'); return LinuxDistro.FEDORA; } catch {}
    try { await execAsync('pacman --version'); return LinuxDistro.ARCH; } catch {}
    try { await execAsync('zypper --version'); return LinuxDistro.SUSE; } catch {}
    try { await execAsync('apk --version'); return LinuxDistro.ALPINE; } catch {}
    return LinuxDistro.UNKNOWN;
  } catch { return LinuxDistro.UNKNOWN; }
}

// ==================== 依赖安装 ====================

const DEBIAN_DEPS = [
  'ca-certificates', 'fonts-liberation', 'libasound2', 'libatk-bridge2.0-0', 'libatk1.0-0',
  'libatspi2.0-0', 'libc6', 'libcairo2', 'libcups2', 'libdbus-1-3', 'libdrm2', 'libexpat1',
  'libgbm1', 'libglib2.0-0', 'libgtk-3-0', 'libnspr4', 'libnss3', 'libpango-1.0-0',
  'libx11-6', 'libxcb1', 'libxcomposite1', 'libxdamage1', 'libxext6', 'libxfixes3',
  'libxkbcommon0', 'libxrandr2', 'wget', 'xdg-utils', 'fonts-noto-cjk', 'fonts-wqy-zenhei',
];

const FEDORA_DEPS = [
  'alsa-lib', 'atk', 'at-spi2-atk', 'at-spi2-core', 'cairo', 'cups-libs', 'dbus-libs',
  'expat', 'glib2', 'gtk3', 'libdrm', 'libgbm', 'libX11', 'libxcb', 'libXcomposite',
  'libXdamage', 'libXext', 'libXfixes', 'libxkbcommon', 'libXrandr', 'nspr', 'nss',
  'pango', 'wget', 'xdg-utils', 'google-noto-cjk-fonts', 'wqy-zenhei-fonts',
];

const ARCH_DEPS = [
  'alsa-lib', 'atk', 'at-spi2-atk', 'at-spi2-core', 'cairo', 'cups', 'dbus', 'expat',
  'glib2', 'gtk3', 'libdrm', 'libx11', 'libxcb', 'libxcomposite', 'libxdamage', 'libxext',
  'libxfixes', 'libxkbcommon', 'libxrandr', 'mesa', 'nspr', 'nss', 'pango', 'wget',
  'xdg-utils', 'noto-fonts-cjk', 'wqy-zenhei',
];

const SUSE_DEPS = [
  'alsa-lib', 'atk', 'at-spi2-atk', 'at-spi2-core', 'cairo', 'cups-libs', 'dbus-1',
  'expat', 'glib2', 'gtk3', 'libdrm2', 'libgbm1', 'libX11-6', 'libxcb1', 'libXcomposite1',
  'libXdamage1', 'libXext6', 'libXfixes3', 'libxkbcommon0', 'libXrandr2', 'mozilla-nspr',
  'mozilla-nss', 'pango', 'wget', 'xdg-utils', 'noto-sans-cjk-fonts',
];

const ALPINE_DEPS = ['chromium', 'nss', 'freetype', 'harfbuzz', 'ca-certificates', 'ttf-freefont', 'font-noto-cjk'];

async function hasRootAccess(): Promise<boolean> {
  if (process.getuid?.() === 0) return true;
  try { await execAsync('sudo -n true'); return true; } catch { return false; }
}

export async function installLinuxDependencies(
  onProgress?: (progress: InstallProgress) => void
): Promise<boolean> {
  if (os.platform() !== 'linux') { log('info', '非 Linux 系统，跳过依赖安装'); return true; }

  const distro = await detectLinuxDistro();
  log('info', `检测到 Linux 发行版: ${distro}`);

  const hasRoot = await hasRootAccess();
  if (!hasRoot) {
    log('warn', '没有 root 权限，跳过依赖安装。请手动安装 Chrome 依赖。');
    onProgress?.({ status: 'installing-deps', progress: 0, message: '没有 root 权限，跳过依赖安装' });
    return true;
  }

  onProgress?.({ status: 'installing-deps', progress: 0, message: '正在更新软件包列表...' });

  try {
    const prefix = process.getuid?.() === 0 ? '' : 'sudo ';
    switch (distro) {
      case LinuxDistro.DEBIAN:
        log('info', '更新软件包列表 (apt)...');
        await execAsync(`${prefix}apt-get update`);
        onProgress?.({ status: 'installing-deps', progress: 20, message: '正在安装 Chrome 依赖 (apt)...' });
        await execAsync(`${prefix}apt-get install -y --no-install-recommends ${DEBIAN_DEPS.join(' ')}`, { timeout: 300000 });
        break;
      case LinuxDistro.FEDORA:
        onProgress?.({ status: 'installing-deps', progress: 20, message: '正在安装 Chrome 依赖 (dnf/yum)...' });
        try { await execAsync(`${prefix}dnf install -y ${FEDORA_DEPS.join(' ')}`, { timeout: 300000 }); }
        catch { await execAsync(`${prefix}yum install -y ${FEDORA_DEPS.join(' ')}`, { timeout: 300000 }); }
        break;
      case LinuxDistro.ARCH:
        await execAsync(`${prefix}pacman -Sy --noconfirm`);
        onProgress?.({ status: 'installing-deps', progress: 20, message: '正在安装 Chrome 依赖 (pacman)...' });
        await execAsync(`${prefix}pacman -S --noconfirm --needed ${ARCH_DEPS.join(' ')}`, { timeout: 300000 });
        break;
      case LinuxDistro.SUSE:
        await execAsync(`${prefix}zypper refresh`);
        onProgress?.({ status: 'installing-deps', progress: 20, message: '正在安装 Chrome 依赖 (zypper)...' });
        await execAsync(`${prefix}zypper install -y ${SUSE_DEPS.join(' ')}`, { timeout: 300000 });
        break;
      case LinuxDistro.ALPINE:
        await execAsync(`${prefix}apk update`);
        onProgress?.({ status: 'installing-deps', progress: 20, message: '正在安装 Chrome 依赖 (apk)...' });
        await execAsync(`${prefix}apk add --no-cache ${ALPINE_DEPS.join(' ')}`, { timeout: 300000 });
        break;
      default:
        log('warn', `不支持的 Linux 发行版: ${distro}，跳过依赖安装`);
        onProgress?.({ status: 'installing-deps', progress: 100, message: `不支持的发行版 ${distro}，跳过依赖安装` });
        return true;
    }
    onProgress?.({ status: 'installing-deps', progress: 100, message: '依赖安装完成' });
    log('info', '依赖安装完成');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', '依赖安装失败:', message);
    onProgress?.({ status: 'failed', progress: 0, message: '依赖安装失败', error: message });
    return false;
  }
}

// ==================== 文件工具 ====================

function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    if (os.platform() === 'win32') return fs.existsSync(filePath);
    return false;
  }
}

function isDirectory(dirPath: string): boolean {
  try { return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory(); }
  catch { return false; }
}

// ==================== 浏览器搜索 ====================

function getSystemBrowserPaths(): string[] {
  const p = getCurrentPlatform();
  const paths: string[] = [];

  if (p === 'win32' || p === 'win64') {
    const pf = process.env['PROGRAMFILES'] || '';
    const pfx86 = process.env['PROGRAMFILES(X86)'] || '';
    const la = process.env['LOCALAPPDATA'] || '';
    paths.push(
      path.join(pf, 'Google/Chrome/Application/chrome.exe'),
      path.join(pfx86, 'Google/Chrome/Application/chrome.exe'),
      path.join(la, 'Google/Chrome/Application/chrome.exe'),
      path.join(pf, 'Microsoft/Edge/Application/msedge.exe'),
      path.join(pfx86, 'Microsoft/Edge/Application/msedge.exe'),
    );
  } else if (p === 'darwin' || p === 'darwin_arm') {
    paths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    );
  } else {
    paths.push(
      '/opt/google/chrome/chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
      '/opt/microsoft/msedge/msedge',
      '/headless-shell/headless-shell',
      '/chrome/chrome',
    );
  }

  return paths;
}

function findBrowserFromPath(): string[] {
  try {
    const paths: string[] = [];
    const envPath = process.env.PATH || '';
    const pathDirs = envPath.split(path.delimiter).filter(Boolean);
    const names = os.platform() === 'win32'
      ? ['chrome.exe', 'chromium.exe', 'msedge.exe']
      : ['google-chrome', 'chromium', 'chromium-browser', 'msedge', 'chrome'];

    for (const dir of pathDirs) {
      for (const name of names) {
        const browserPath = path.join(dir, name);
        if (isExecutable(browserPath) && !paths.includes(browserPath)) {
          paths.push(browserPath);
        }
      }
    }
    return paths;
  } catch { return []; }
}

function findChromeFromPuppeteerCache(): string[] {
  try {
    const paths: string[] = [];
    const browserName = os.platform() === 'win32' ? 'chrome.exe'
      : os.platform() === 'darwin' ? 'Chromium.app/Contents/MacOS/Chromium' : 'chrome';
    const cacheDir = path.join(os.homedir(), '.cache', 'puppeteer');

    if (!fs.existsSync(cacheDir)) return paths;

    const revisions = fs.readdirSync(cacheDir);
    for (const rev of revisions) {
      const revPath = path.join(cacheDir, rev);
      if (!isDirectory(revPath)) continue;
      const versions = fs.readdirSync(revPath);
      for (const ver of versions) {
        const verPath = path.join(revPath, ver);
        if (!isDirectory(verPath)) continue;
        const platforms = fs.readdirSync(verPath);
        for (const plat of platforms) {
          const platPath = path.join(verPath, plat);
          if (!isDirectory(platPath)) continue;
          const browserPath = path.join(platPath, browserName);
          if (isExecutable(browserPath)) paths.push(browserPath);
        }
      }
    }
    return paths;
  } catch { return []; }
}

/**
 * 获取所有可能的浏览器路径（用于自动检测）
 */
export function getDefaultBrowserPaths(): string[] {
  const paths: string[] = [];

  // 插件自己安装的 Chrome
  const installedPath = getChromeExecutablePath(getDefaultInstallPath());
  if (installedPath && fs.existsSync(installedPath)) {
    paths.push(installedPath);
  }

  // 系统默认路径
  paths.push(...getSystemBrowserPaths());

  // PATH 环境变量
  paths.push(...findBrowserFromPath());

  // Puppeteer 缓存
  paths.push(...findChromeFromPuppeteerCache());

  return paths;
}

// ==================== 下载功能 ====================

/** 版本信息缓存 */
let versionsCache: KnownGoodVersionsWithDownloads | null = null;
let versionsCacheTime = 0;
const VERSIONS_CACHE_TTL = 60 * 60 * 1000;

async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const requester = url.startsWith('https:') ? https : http;
    requester.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        fetchJson(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchVersionsInfo(): Promise<KnownGoodVersionsWithDownloads | null> {
  if (versionsCache && (Date.now() - versionsCacheTime < VERSIONS_CACHE_TTL)) return versionsCache;
  for (const url of Object.values(VERSIONS_JSON_URLS)) {
    try {
      const data = await fetchJson(url);
      versionsCache = data;
      versionsCacheTime = Date.now();
      return data;
    } catch { continue; }
  }
  return null;
}

function getDownloadUrl(version: string, source: string): string {
  const platform = getPlatformForDownload();
  const baseUrl = DOWNLOAD_SOURCES[source as keyof typeof DOWNLOAD_SOURCES] || source;
  return `${baseUrl}/${version}/${platform}/chrome-${platform}.zip`;
}

async function downloadFile(
  url: string,
  savePath: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileStream = fs.createWriteStream(savePath);

    const makeRequest = (requestUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) { reject(new Error('重定向次数过多')); return; }

      const urlObj = new URL(requestUrl);
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 30000,
      };

      const req = (requestUrl.startsWith('https:') ? https : http).request(options, (res) => {
        if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode)) {
          const loc = res.headers.location;
          if (loc) {
            const finalUrl = loc.startsWith('http') ? loc : new URL(loc, requestUrl).toString();
            makeRequest(finalUrl, redirectCount + 1);
            return;
          }
        }
        if (res.statusCode && res.statusCode >= 400) { reject(new Error(`HTTP 错误: ${res.statusCode}`)); return; }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        res.on('data', (chunk) => { downloadedBytes += chunk.length; onProgress?.(downloadedBytes, totalBytes); });
        res.pipe(fileStream);
        fileStream.on('finish', () => { fileStream.close(); resolve(); });
        fileStream.on('error', (err) => { fs.unlink(savePath, () => {}); reject(err); });
      });

      req.on('error', (err) => { fs.unlink(savePath, () => {}); reject(err); });
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
      req.end();
    };

    makeRequest(url);
  });
}

// ==================== 解压 ====================

async function extractZip(zipPath: string, extractPath: string): Promise<void> {
  if (!fs.existsSync(zipPath)) throw new Error(`ZIP 文件不存在: ${zipPath}`);
  if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath, { recursive: true });

  if (os.platform() === 'win32') {
    await execAsync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`);
  } else {
    await execAsync(`unzip -o "${zipPath}" -d "${extractPath}"`);
  }
}

// ==================== 主安装函数 ====================

let currentInstallProgress: InstallProgress = { status: 'idle', progress: 0, message: '' };
let maxProgressInStage = 0;
let isInstalling = false;

export function getInstallProgress(): InstallProgress { return { ...currentInstallProgress }; }
export function isInstallingChrome(): boolean { return isInstalling; }

export function getDefaultInstallPath(): string {
  if (os.platform() === 'win32') {
    return path.join(process.env.LOCALAPPDATA || 'C:\\', 'puppeteer', 'chrome');
  }
  return path.join(os.homedir(), '.cache', 'puppeteer', 'chrome');
}

export function getChromeExecutablePath(installPath: string): string {
  const platformDir = getPlatformForDownload();
  if (os.platform() === 'win32') {
    return path.join(installPath, `chrome-${platformDir}`, 'chrome.exe');
  } else if (os.platform() === 'darwin') {
    return path.join(installPath, `chrome-${platformDir}`, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
  }
  return path.join(installPath, `chrome-${platformDir}`, 'chrome');
}

export function isChromeInstalled(installPath?: string): boolean {
  const targetPath = installPath || getDefaultInstallPath();
  const execPath = getChromeExecutablePath(targetPath);
  return fs.existsSync(execPath);
}

export async function installChrome(options: InstallOptions = {}): Promise<{
  success: boolean;
  executablePath?: string;
  error?: string;
}> {
  if (isInstalling) return { success: false, error: '已有安装任务正在进行中' };

  // 检查是否已安装
  if (isChromeInstalled(options.installPath)) {
    const installPath = options.installPath || getDefaultInstallPath();
    const execPath = getChromeExecutablePath(installPath);
    log('info', `Chrome 已安装: ${execPath}`);
    return { success: true, executablePath: execPath };
  }

  isInstalling = true;
  currentInstallProgress = { status: 'idle', progress: 0, message: '' };
  maxProgressInStage = 0;

  const version = options.version || DEFAULT_CHROME_VERSION;
  const installPath = options.installPath || getDefaultInstallPath();
  const installDeps = options.installDeps !== false;

  const updateProgress = (progress: Partial<InstallProgress>) => {
    if (progress.status && progress.status !== currentInstallProgress.status) maxProgressInStage = 0;
    if (progress.progress !== undefined) {
      if (progress.status === 'downloading' || (currentInstallProgress.status === 'downloading' && !progress.status)) {
        if (progress.progress > maxProgressInStage) maxProgressInStage = progress.progress;
        else progress.progress = maxProgressInStage;
      }
    }
    currentInstallProgress = { ...currentInstallProgress, ...progress };
    options.onProgress?.(currentInstallProgress);
  };

  try {
    log('info', `开始安装 Chrome ${version}`);
    log('info', `安装路径: ${installPath}`);

    // 1. 安装系统依赖（仅 Linux）
    if (installDeps && os.platform() === 'linux') {
      updateProgress({ status: 'installing-deps', progress: 0, message: '正在安装系统依赖...' });
      await installLinuxDependencies((p) => {
        updateProgress({ status: 'installing-deps', progress: p.progress * 0.2, message: p.message });
      });
    }

    // 2. 下载 Chrome
    updateProgress({ status: 'downloading', progress: 20, message: '正在准备下载...' });

    const sources = ['NPMMIRROR', 'NPMMIRROR_REGISTRY', 'GOOGLE'] as const;
    let downloadSuccess = false;
    let lastError = '';
    const zipPath = path.join(os.tmpdir(), `chrome-${version}.zip`);

    for (const source of sources) {
      try {
        const url = getDownloadUrl(version, source);
        log('info', `尝试从 ${source} 下载: ${url}`);
        updateProgress({ status: 'downloading', message: `正在从 ${source} 下载 Chrome...` });

        const startTime = Date.now();
        let lastUpdate = startTime;

        await downloadFile(url, zipPath, (downloaded, total) => {
          const now = Date.now();
          if (now - lastUpdate < 500) return;
          lastUpdate = now;
          const elapsed = (now - startTime) / 1000;
          const speed = elapsed > 0 ? downloaded / elapsed : 0;

          if (total > 0) {
            const pct = (downloaded / total) * 100;
            const eta = speed > 0 ? (total - downloaded) / speed : 0;
            updateProgress({
              status: 'downloading', progress: 20 + pct * 0.5,
              message: `正在下载 Chrome... ${pct.toFixed(1)}%`,
              downloadedBytes: downloaded, totalBytes: total,
              speed: `${(speed / 1024 / 1024).toFixed(2)} MB/s`, eta: `${Math.ceil(eta)}s`,
            });
          } else {
            updateProgress({
              status: 'downloading',
              message: `正在下载 Chrome... ${(downloaded / 1024 / 1024).toFixed(1)} MB`,
              downloadedBytes: downloaded, speed: `${(speed / 1024 / 1024).toFixed(2)} MB/s`,
            });
          }
        });

        downloadSuccess = true;
        log('info', `从 ${source} 下载成功`);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        log('warn', `从 ${source} 下载失败: ${lastError}`);
        const nextIdx = sources.indexOf(source) + 1;
        if (nextIdx < sources.length) {
          updateProgress({ status: 'downloading', message: `${source} 下载失败，正在切换到 ${sources[nextIdx]}...` });
        }
      }
    }

    if (!downloadSuccess) throw new Error(`所有下载源都失败: ${lastError}`);

    // 3. 解压
    updateProgress({ status: 'extracting', progress: 70, message: '正在解压 Chrome...' });
    log('info', '正在解压...');
    await extractZip(zipPath, installPath);
    try { fs.unlinkSync(zipPath); } catch {}

    // 4. 设置执行权限（Linux/macOS）
    const execPath = getChromeExecutablePath(installPath);
    if (os.platform() !== 'win32' && fs.existsSync(execPath)) {
      await execAsync(`chmod +x "${execPath}"`);
    }

    // 5. 验证
    if (!fs.existsSync(execPath)) throw new Error('安装验证失败：Chrome 可执行文件不存在');

    updateProgress({ status: 'completed', progress: 100, message: 'Chrome 安装完成' });
    log('info', `Chrome 安装完成: ${execPath}`);
    return { success: true, executablePath: execPath };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', 'Chrome 安装失败:', message);
    updateProgress({ status: 'failed', progress: 0, message: '安装失败', error: message });
    return { success: false, error: message };
  } finally {
    isInstalling = false;
    maxProgressInStage = 0;
  }
}

/**
 * 获取已安装的 Chrome 信息
 */
export async function getInstalledChromeInfo(installPath?: string): Promise<{
  installed: boolean;
  executablePath?: string;
  version?: string;
}> {
  const targetPath = installPath || getDefaultInstallPath();
  const execPath = getChromeExecutablePath(targetPath);

  if (!fs.existsSync(execPath)) return { installed: false };

  try {
    const { stdout } = await execAsync(`"${execPath}" --version`);
    const version = stdout.trim().replace(/^Google Chrome\s*/i, '').replace(/^Chromium\s*/i, '');
    return { installed: true, executablePath: execPath, version };
  } catch {
    return { installed: true, executablePath: execPath };
  }
}

/**
 * 卸载 Chrome
 */
export async function uninstallChrome(installPath?: string): Promise<{ success: boolean; error?: string }> {
  if (isInstalling) return { success: false, error: '安装任务正在进行中，无法卸载' };
  const targetPath = installPath || getDefaultInstallPath();
  if (!fs.existsSync(targetPath)) return { success: false, error: 'Chrome 安装目录不存在' };

  try {
    log('info', `正在卸载 Chrome: ${targetPath}`);
    fs.rmSync(targetPath, { recursive: true, force: true });
    log('info', 'Chrome 卸载完成');
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log('error', `卸载失败: ${message}`);
    return { success: false, error: message };
  }
}
