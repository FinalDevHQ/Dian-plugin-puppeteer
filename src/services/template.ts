/**
 * 模板渲染模块
 * 支持简单的 {{key}} 模板语法
 */

/**
 * 渲染模板
 * 将 HTML 中的 {{key}} 替换为 data 中对应的值
 * 
 * @param html - HTML 模板字符串
 * @param data - 模板数据对象
 * @returns 渲染后的 HTML 字符串
 * 
 * @example
 * ```ts
 * const html = '<h1>{{title}}</h1><p>{{content}}</p>';
 * const data = { title: 'Hello', content: 'World' };
 * renderTemplate(html, data);
 * // => '<h1>Hello</h1><p>World</p>'
 * ```
 */
export function renderTemplate(html: string, data?: Record<string, any>): string {
  if (!data) return html;

  return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/**
 * 深度渲染模板
 * 支持嵌套对象的模板渲染，使用点号分隔的路径
 * 
 * @param html - HTML 模板字符串
 * @param data - 模板数据对象（支持嵌套）
 * @returns 渲染后的 HTML 字符串
 * 
 * @example
 * ```ts
 * const html = '<p>{{user.name}} - {{user.age}}</p>';
 * const data = { user: { name: 'Alice', age: 25 } };
 * renderTemplateDeep(html, data);
 * // => '<p>Alice - 25</p>'
 * ```
 */
export function renderTemplateDeep(html: string, data?: Record<string, any>): string {
  if (!data) return html;

  return html.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
    const value = getNestedValue(data, path);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * 获取嵌套对象的值
 * 
 * @param obj - 对象
 * @param path - 点号分隔的路径，如 "user.name"
 * @returns 对应路径的值
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * 检查模板是否包含变量
 * 
 * @param html - HTML 模板字符串
 * @returns 是否包含模板变量
 */
export function hasTemplateVariables(html: string): boolean {
  return /\{\{(\w+)\}\}/.test(html);
}

/**
 * 提取模板中的所有变量名
 * 
 * @param html - HTML 模板字符串
 * @returns 变量名数组
 */
export function extractTemplateVariables(html: string): string[] {
  const matches = html.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  
  return [...new Set(matches.map(m => m.slice(2, -2)))];
}
