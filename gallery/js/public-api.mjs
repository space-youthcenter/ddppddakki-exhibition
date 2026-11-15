import {createMetricsClient} from './metrics.mjs';
export function validEndpoint(value) {
  if (!value) return null;
  const url = new URL(value, location.href);
  if (url.origin === location.origin && ['localhost','127.0.0.1'].includes(url.hostname)) return url;
  if (url.protocol === 'https:' && url.hostname === 'script.google.com' && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) return url;
  throw new Error('전시관 연결 주소를 확인해 주세요.');
}
// ContentService redirects to googleusercontent.com. Read-only public JSONP
// avoids claiming that a no-cors response was read successfully.
export function readPublic(endpoint, action, params = {}) {
  const base = validEndpoint(endpoint);
  if (!base) return Promise.reject(new Error('전시관을 준비하고 있습니다.'));
  if (!['catalog','room','artwork','guestbook','stats'].includes(action)) return Promise.reject(new Error('지원하지 않는 읽기 요청입니다.'));
  return new Promise((resolve,reject) => {
    const callback = '__ddg_'+crypto.randomUUID().replaceAll('-','');
    const script = document.createElement('script');
    const cleanup = () => { clearTimeout(timer); script.remove(); delete window[callback]; };
    const timer = setTimeout(() => { cleanup(); reject(new Error('연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.')); },25000);
    window[callback] = result => { cleanup(); result?.ok ? resolve(result.data) : reject(new Error(result?.error || '전시관을 불러오지 못했습니다.')); };
    script.onerror = () => { cleanup(); reject(new Error('전시관에 연결하지 못했습니다. 다시 시도해 주세요.')); };
    base.search = new URLSearchParams({action,...params,callback,_:String(Date.now())}).toString();
    script.referrerPolicy = 'no-referrer'; script.src=base.href; document.head.append(script);
  });
}

export const createMetrics=createMetricsClient;
