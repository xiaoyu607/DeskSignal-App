export const isChinese = (): boolean => document.documentElement.lang === 'zh-CN';
export function initLanguage(): void {
  const lang = new URLSearchParams(location.search).get('lang');
  const chinese = lang === 'zh' || lang === 'zh-CN';
  document.documentElement.lang = chinese ? 'zh-CN' : 'en';
  if (chinese) {
    document.title = 'LOL Pings-DeskSignal-App — 让桌面默契同步';
    for (const el of document.querySelectorAll<HTMLElement>('[data-zh]')) el.textContent = el.dataset.zh ?? '';
    for (const el of document.querySelectorAll<HTMLElement>('[data-zh-label]')) el.setAttribute('aria-label', el.dataset.zhLabel ?? '');
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', '桌面信号、表情与音效。自定义轮盘、GIF 配音频、带声音短视频，支持 Windows 和 Apple 芯片 Mac。');
    const guide = document.querySelector<HTMLAnchorElement>('[data-build-guide]');
    if (guide) guide.href = 'https://github.com/xiaoyu607/LOL-Pings-DeskSignal-App/blob/main/README.zh-CN.md#本地运行';
  }
  const link = document.querySelector<HTMLAnchorElement>('[data-language-link]');
  if (link) {
    const url = new URL(location.href);
    if (chinese) url.searchParams.delete('lang'); else url.searchParams.set('lang', 'zh-CN');
    link.href = url.pathname + url.search + url.hash;
    link.textContent = chinese ? 'English' : '简体中文';
    link.hreflang = chinese ? 'en' : 'zh-CN';
  }
}
