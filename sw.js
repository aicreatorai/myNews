/* ============================================================
   早间新闻 — Service Worker
   策略：
   1. 所有静态资源 → Cache First 或 Stale While Revalidate
   2. news-index.json → Cache First（后台网络更新），近实时+秒开
   3. 新闻 .md 文件 → Cache First（生成后永不改变）
   4. marked.js CDN → Cache First
   ============================================================ */

'use strict';

const CACHE_VERSION  = 'v20260513-214625';
const STATIC_CACHE   = 'news-static-' + CACHE_VERSION;
const NEWS_CACHE     = 'news-content-' + CACHE_VERSION;
const CDN_CACHE      = 'news-cdn-' + CACHE_VERSION;

// 最多缓存多少天的新闻文件
const MAX_CACHE_DAYS = 20;

// 核心静态资源（安装时预缓存）
// news-index.json 由 Stale While Revalidate 策略缓存在 NEWS_CACHE 中
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/app.js',
];

/* ============================================================
   安装：预缓存静态资源
   ============================================================ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] 部分静态资源预缓存失败:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

/* ============================================================
   激活：清理旧版本缓存
   ============================================================ */
self.addEventListener('activate', event => {
  const validCaches = [STATIC_CACHE, NEWS_CACHE, CDN_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !validCaches.includes(k))
          .map(k => {
            console.log('[SW] 删除旧缓存:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ============================================================
   拦截请求
   ============================================================ */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const path = url.pathname;

  // 非 GET 请求不缓存
  if (event.request.method !== 'GET') return;

  // 跳过非 HTTP(S) 请求（如 chrome-extension://）
  if (!url.protocol.startsWith('http')) return;

  // CDN 资源（marked.js 等）→ Cache First
  if (url.hostname !== self.location.hostname) {
    event.respondWith(cdnCacheFirst(event.request));
    return;
  }

  // sw.js 自身 → 始终走网络，确保 SW 可以正常更新
  if (path.endsWith('/sw.js')) {
    return; // 不拦截，直接走网络
  }

  // news-index.json → Stale While Revalidate（先返回缓存，后台更新索引）
  if (path.endsWith('news-index.json')) {
    event.respondWith(staleWhileRevalidate(event.request, NEWS_CACHE));
    return;
  }

  // 新闻 .md 文件 → Cache First（生成后永不改变，无需每次都请求）
  if (path.includes('/news/') && path.endsWith('.md')) {
    event.respondWith(newsCacheFirst(event.request));
    return;
  }

  // HTML/CSS/JS 静态资源 → Stale-While-Revalidate
  if (path === '/' || path.endsWith('.html') || path.endsWith('.css') || path.endsWith('.js')) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  // englishStudy/ 下所有请求 → Stale While Revalidate
  if (path.startsWith('/englishStudy/')) {
    event.respondWith(staleWhileRevalidate(event.request, NEWS_CACHE));
    return;
  }

  // manifest.json（根目录）→ Stale-While-Revalidate
  if (path.endsWith('manifest.json')) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }
  // 其他 .json → Stale-While-Revalidate 兜底
  if (path.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  // 其他请求：Stale While Revalidate 兜底
  event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
});

/* ============================================================
   缓存策略函数
   ============================================================ */

/**
 * CDN 资源 → Cache First（一次缓存长期使用）
 */
async function cdnCacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResp = await fetch(request);
    if (networkResp.ok) {
      const cache = await caches.open(CDN_CACHE);
      cache.put(request, networkResp.clone());
    }
    return networkResp;
  } catch (_) {
    return offlineFallback(request);
  }
}

/**
 * 新闻 .md 文件 → Cache First
 * 新闻文件生成后永不改变，直接读缓存即可
 * 缓存写入由首次访问或预缓存完成
 */
async function newsCacheFirst(request) {
  const cleanReq = stripQueryString(request);
  const cached = await caches.match(cleanReq) || await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const networkResp = await fetch(request);
    if (networkResp.ok) {
      const cache = await caches.open(NEWS_CACHE);
      cache.put(cleanReq, networkResp.clone());
      pruneOldNewsCache().catch(() => {});
    }
    return networkResp;
  } catch (_) {
    return offlineFallback(request);
  }
}

/**
 * Stale-While-Revalidate：立即返回缓存，后台静默更新
 * 用于 news-index.json 等需要近实时但允许毫秒级旧数据的场景
 */
async function staleWhileRevalidate(request, cacheName) {
  const cleanReq = stripQueryString(request);
  const cached = await caches.match(cleanReq) || await caches.match(request);

  const networkFetch = fetch(request).then(async resp => {
    if (resp.ok) {
      const cache = await caches.open(cacheName);
      cache.put(cleanReq, resp.clone());
    }
    return resp;
  }).catch(() => null);

  return cached || networkFetch || offlineFallback(request);
}

/* ============================================================
   清理超过 MAX_CACHE_DAYS 天的旧新闻缓存
   ============================================================ */
async function pruneOldNewsCache() {
  const cache = await caches.open(NEWS_CACHE);
  const keys  = await cache.keys();

  // 从 URL 提取日期字符串 "YYYYMMDD"
  const dated = keys.map(req => {
    const m = req.url.match(/(\d{8})_/);
    return { req, datestr: m ? m[1] : null };
  }).filter(x => x.datestr !== null);

  // 按日期倒序排列
  dated.sort((a, b) => b.datestr.localeCompare(a.datestr));

  // 超过 MAX_CACHE_DAYS 的删除
  if (dated.length > MAX_CACHE_DAYS) {
    const toDelete = dated.slice(MAX_CACHE_DAYS);
    await Promise.all(toDelete.map(x => cache.delete(x.req)));
    console.log(`[SW] 清理了 ${toDelete.length} 条旧新闻缓存`);
  }
}

/* ============================================================
   去掉 URL 的时间戳查询参数（?t=xxx），保证缓存命中
   ============================================================ */
function stripQueryString(request) {
  const url = new URL(request.url);
  url.search = '';
  return new Request(url.toString(), { method: request.method, headers: request.headers });
}

/* ============================================================
   离线降级响应
   ============================================================ */
async function offlineFallback(request) {
  const url = new URL(request.url);

  // HTML 请求：先尝试从缓存返回 index.html（SPA 通吃），再给降级提示页
  if (request.headers.get('accept')?.includes('text/html')) {
    const cachedIndex = await caches.match('./index.html') || await caches.match('./');
    if (cachedIndex) return cachedIndex;
    return new Response(
      `<!DOCTYPE html><html lang="zh-CN"><head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>📰 早间新闻 - 离线</title>
        <style>
          body{font-family:-apple-system,sans-serif;display:flex;align-items:center;
               justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;color:#333}
          .wrap{text-align:center;padding:2rem}
          .icon{font-size:4rem;margin-bottom:1rem}
          h2{margin:.5rem 0;font-size:1.3rem}
          p{color:#888;font-size:.9rem}
        </style>
      </head><body>
        <div class="wrap">
          <div class="icon">📡</div>
          <h2>当前处于离线状态</h2>
          <p>请先联网访问一次，之后就可以离线浏览最近20天的新闻</p>
        </div>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html;charset=utf-8' } }
    );
  }

  // JSON 请求离线时返回空索引（app.js 会检测 offline:true）
  if (url.pathname.endsWith('.json')) {
    return new Response(
      JSON.stringify({ updated: '', months: [], offline: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 其他资源返回 503
  return new Response('offline', { status: 503 });
}

/* ============================================================
   接收主线程消息
   ============================================================ */
self.addEventListener('message', event => {
  // 主线程发来"预缓存最近N天新闻"指令
  if (event.data && event.data.type === 'PRECACHE_NEWS') {
    const files = event.data.files || [];
    console.log('[SW] ▶ 收到预缓存指令，文件数:', files.length, files);
    precacheNewsFiles(files);
  }
  // 主线程发来"强制刷新缓存"指令
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(NEWS_CACHE).then(() => {
      event.source?.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});

/**
 * 主动预缓存一批新闻 .md 文件
 * 并发批量（每批 BATCH_SIZE 个），兼顾速度与内存
 */
const PRECACHE_BATCH = 5;
async function precacheNewsFiles(files) {
  if (!files.length) return;
  const cache = await caches.open(NEWS_CACHE);

  // 将相对路径转为绝对 URL（SW 中 fetch 相对路径可能解析错误）
  const toAbs = (f) => {
    if (f.startsWith('http')) return f;
    // self.location.href = https://aicreatorai.github.io/myNews/sw.js
    return new URL(f, self.location.href).toString();
  };
  const absFiles = files.map(toAbs);

  // 过滤已有缓存的文件，只下载缺失的
  const missing = [];
  for (const file of absFiles) {
    const existing = await cache.match(file);
    if (!existing) missing.push(file);
  }
  if (!missing.length) {
    console.log('[SW] ✅ 所有新闻文件已在缓存中，无需下载。文件列表:', absFiles.slice(0, 5).join(', ') + (absFiles.length > 5 ? ' ...' : ''));
    return;
  }

  console.log('[SW] ▶ 开始预缓存，需下载', missing.length, '个文件:', missing.slice(0, 8).join(', ') + (missing.length > 8 ? ' ...' : ''));

  let count = 0;
  let failCount = 0;
  for (let i = 0; i < missing.length; i += PRECACHE_BATCH) {
    const batch = missing.slice(i, i + PRECACHE_BATCH);
    await Promise.all(batch.map(async (file) => {
      try {
        const resp = await fetch(file);
        if (resp.ok) {
          await cache.put(file, resp.clone());
          count++;
          console.log('[SW] ✅ 预缓存成功 (' + count + '/' + missing.length + '):', file.split('/').slice(-2).join('/'));
        } else {
          failCount++;
          console.warn('[SW] ⚠️ 预缓存失败（HTTP ' + resp.status + '):', file);
        }
      } catch (e) {
        failCount++;
        console.warn('[SW] ⚠️ 预缓存失败:', file.split('/').slice(-2).join('/'), e.message || e);
      }
    }));
  }
  console.log(`[SW] ✅ 预缓存完成：成功 ${count}/${missing.length} 个文件` + (failCount > 0 ? `，失败 ${failCount} 个` : ''));
  if (count > 0) {
    pruneOldNewsCache().catch(() => {});
  }
}
