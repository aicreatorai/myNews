/* ============================================================
   早间新闻 — app.js (v3.0 纯Markdown渲染版)
   核心逻辑：直接加载 .md 文件，用 marked.js 渲染
   不再解析字段，格式随便变都显示完整
   ============================================================ */

'use strict';

/* ============================================================
   1. 🔧 CATEGORIES 配置（用于导航和搜索过滤）
   ============================================================ */
const CATEGORIES = [
  { key:'今日头条',   emoji:'🔥', name:'今日头条',     desc:'当日最重要、影响最广泛的头版资讯' },
  { key:'科技热点',   emoji:'🤖', name:'科技热点',     desc:'互联网、消费科技与行业动态最新进展' },
  { key:'AI与前沿科技',emoji:'🧠', name:'AI与前沿科技', desc:'大模型、AI产品与前沿技术突破' },
  { key:'软件开发',   emoji:'💻', name:'软件开发',     desc:'架构设计、工程实践与开发效率工具' },
  { key:'开发语言',   emoji:'🔤', name:'开发语言',     desc:'编程语言新版本、特性更新与社区动向' },
  { key:'华为开发生态',emoji:'🔶', name:'华为开发生态', desc:'鸿蒙系统、DevEco Studio 与华为开发者资讯' },
  { key:'iOS开发生态', emoji:'🍎', name:'iOS开发生态',  desc:'Swift、Xcode 及苹果平台开发者动态' },
  { key:'Android开发生态',emoji:'🤖', name:'Android开发生态', desc:'Android SDK、Jetpack 与谷歌开发者资讯' },
  { key:'跨平台开发生态',emoji:'🌐', name:'跨平台开发生态', desc:'Flutter、RN、Electron 等多端框架动态' },
  { key:'移动端生态', emoji:'📲', name:'移动端生态',   desc:'移动应用市场、用户趋势与平台政策' },
  { key:'AI开发生态', emoji:'🧩', name:'AI开发生态',   desc:'AI框架、开发工具链与智能应用落地资讯' },
  { key:'GitHub实用Skills',emoji:'⭐', name:'GitHub实用Skills', desc:'精选优质开源项目与实用工具库' },
  { key:'AI知识点',   emoji:'💡', name:'AI知识点',       desc:'当前最火热的AI核心概念、原理与实践技巧' },
  { key:'产品发布',   emoji:'📱', name:'产品发布',     desc:'新品发布、版本更新与产品动态' },
  { key:'国内热点',   emoji:'🏠', name:'国内热点',     desc:'国内科技、经济与社会热点事件' },
  { key:'国际大事件', emoji:'🌍', name:'国际大事件',   desc:'全球政经格局、科技竞争与重大事件' },
  { key:'财经市场',   emoji:'📈', name:'财经市场',     desc:'A股、港股、美股及宏观经济数据动态' },
];

/* ============================================================
   2. 📦 全局状态
   ============================================================ */
const state = {
  index: null,         // news-index.json
  currentDate: null,   // '20260513'
  currentType: 'morning',
  currentCat: 'all',
  cache: {},           // { key: htmlString }
  allNews: [],         // 全文搜索索引
  isLoading: false,
  isOffline: false,
};

/* ============================================================
   3. 🏠 DOM 快捷引用
   ============================================================ */
const $ = id => document.getElementById(id);
const DOM = {
  header:$('appHeader'), dateStrip:$('dateStrip'), main:$('appMain'),
  newsList:$('newsList'), skeleton:$('skeletonWrap'), categoryTabs:$('categoryTabs'),
  todayHeadline:$('todayHeadline'), headlineText:$('headlineText'),
  navArchive:$('navArchive'), navToday:$('navToday'), navSearch:$('navSearch'),
  drawerOverlay:$('drawerOverlay'), archiveDrawer:$('archiveDrawer'),
  drawerContent:$('drawerContent'), btnCloseDrawer:$('btnCloseDrawer'),
  searchPanel:$('searchPanel'), searchInput:$('searchInput'),
  searchResults:$('searchResults'), btnSearchBack:$('btnSearchBack'),
  sidebarContent:$('sidebarContent'), sidebarSearch:$('sidebarSearchInput'),
  btnTheme:$('btnTheme'), btnEnglish:$('btnEnglish'),
};

/* ============================================================
   4. 🌗 主题
   ============================================================ */
function initTheme() {
  const s = localStorage.getItem('news-theme');
  const d = window.matchMedia('(prefers-color-scheme: dark)').matches;
  apply(s || (d ? 'dark' : 'light'), false);
}
function apply(t, save) {
  document.documentElement.setAttribute('data-theme', t);
  const icon = DOM.btnTheme?.querySelector('.theme-icon');
  if (icon) icon.textContent = t === 'dark' ? '☀️' : '🌙';
  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#161b22' : '#ffffff');
  if (save !== false) localStorage.setItem('news-theme', t);
}
function toggleTheme() { apply(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }

/* ============================================================
   5. 📡 离线
   ============================================================ */
function initOffline() {
  const b = document.getElementById('offlineBanner');
  const fn = () => { state.isOffline = !navigator.onLine; if(b) b.style.display = state.isOffline ? 'flex' : 'none'; };
  window.addEventListener('online', fn); window.addEventListener('offline', fn); fn();
}

/* ============================================================
   6. 📥 加载索引
   ============================================================ */
async function loadIndex() {
  try {
    const r = await fetch('news-index.json?t='+Date.now());
    if (!r.ok) throw Error('HTTP '+r.status);
    state.index = await r.json();
    return true;
  } catch(e) { showError('无法加载新闻索引'); return false; }
}

/* ============================================================
   7. 📄 核心：加载 markdown 并渲染
   ============================================================ */

/**
 * 加载指定日期的新闻 — 直接渲染 Markdown
 * 兼容三种情况：单文件、多文件目录、自动回退
 */
async function loadNews(entry) {
  const key = entry.date + '_' + entry.type;
  if (state.cache[key]) return state.cache[key];

  let fullMd, sections;

  // 情况A：多文件目录 → 为每个板块加上 ## 标题并保留 cat 信息
  if (entry.dir) {
    const raw = await loadMultiFileMd(entry.dir);
    if (raw) {
      sections = raw.map(s => ({
        header: `## ${s.cat.emoji} ${s.cat.name}`,
        md: `## ${s.cat.emoji} ${s.cat.name}\n\n${s.md}`,
        cat: s.cat,
      }));
      fullMd = sections.map(s => s.md).join('\n\n');
    }
  }
  // 情况B：单文件
  else if (entry.file) {
    fullMd = await fetchMd(entry.file);
    // 单文件自动分解为 sections
    sections = splitSections(fullMd);
  }

  // 情况C：单文件失败时自动回退到目录
  if (!fullMd && entry.file) {
    const dir = guessDir(entry.file);
    if (dir) {
      sections = await loadMultiFileMd(dir);
      if (sections) fullMd = sections.map(s => s.md).join('\n\n');
    }
  }

  if (!fullMd) return null;

  // 渲染为 HTML
  const result = renderFullMd(fullMd, sections, entry);
  state.cache[key] = result;
  return result;
}

/** 获取单个 .md 文件内容 */
async function fetchMd(path) {
  try {
    const r = await fetch(path + '?t=' + Date.now());
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

/** 从单文件路径推测 dir 路径 */
function guessDir(p) {
  const m = p.match(/^(.*?)(\d{8})_/);
  return m ? m[1] + m[2] + '/' : null;
}

/** 从目录加载多文件，合并为一个 markdown 字符串列表 */
async function loadMultiFileMd(dir) {
  const results = [];
  const fetched = await Promise.allSettled(
    CATEGORIES.map(async (cat, idx) => {
      const num = String(idx+1).padStart(2,'0');
      for (const name of [`${num}_${cat.name}.md`,`${num}_${cat.key}.md`]) {
        try {
          const r = await fetch(dir + encodeURIComponent(name) + '?t='+Date.now());
          if (!r.ok) continue;
          const md = await r.text();
          return { cat, md, idx };
        } catch { continue; }
      }
      return null;
    })
  );
  for (const r of fetched) {
    if (r.status === 'fulfilled' && r.value) results.push(r.value);
  }
  if (!results.length) return null;
  results.sort((a,b) => a.idx - b.idx);
  return results;
}

/**
 * 从 markdown 中提取 ## 章节
 */
function splitSections(md) {
  if (!md) return [];
  const lines = md.split('\n');
  const sections = [];
  let cur = [], curHeader = '';

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (cur.length) sections.push({ header: curHeader, md: cur.join('\n') });
      cur = [line];
      curHeader = line;
    } else {
      cur.push(line);
    }
  }
  if (cur.length) sections.push({ header: curHeader, md: cur.join('\n') });
  return sections;
}

/** 匹配分类 */
function matchCat(text) {
  // 先用全名
  for (const c of CATEGORIES) if (text.includes(c.name)) return c;
  for (const c of CATEGORIES) if (text.includes(c.key)) return c;
  for (const c of CATEGORIES) if (text.includes(c.emoji)) return c;
  return null;
}

/**
 * 将 markdown 渲染为 HTML 并分类
 * 返回: { html, categories, headline }
 */
function renderFullMd(fullMd, sections, entry) {
  const result = { html: '', categories: [], headline: '' };

  if (!sections) sections = splitSections(fullMd);

  let allHtml = '';

  for (const sec of sections) {
    const cat = sec.cat || matchCat(sec.header);
    const catKey = cat ? cat.key : '';
    const catEmoji = cat ? cat.emoji : '';
    const catName = cat ? cat.name : '';

    const isSummary = sec.header.includes('要点速览');
    const cardHtml = wrapItemsInCards(sec.md, catKey);
    const sectionHtml = `<div class="md-section${isSummary ? ' summary-section' : ''}" data-cat-key="${catKey}">${cardHtml}</div>`;
    allHtml += sectionHtml;

    if (cat) {
      result.categories.push({ catKey, catEmoji, catName, count: countItems(sec.md) });
    }
  }

  result.html = allHtml;

  // 提取 headline
  for (const line of fullMd.split('\n')) {
    if (line.includes('🔥') && line.includes('今日头条') && line.includes('：')) {
      result.headline = line.replace(/\*\*/g,'').replace(/^.*?[：:]/,'').trim().substring(0,120);
      break;
    }
  }

  return result;
}

/** 将 ### 新闻条目包裹为卡片 */
function wrapItemsInCards(md, catKey) {
  const lines = md.split('\n');
  const parts = [];
  let cur = [];

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (cur.length) parts.push(cur.join('\n'));
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) parts.push(cur.join('\n'));

  if (parts.length <= 1) {
    // 没有 ### 项，直接渲染整个段
    return marked.parse(md);
  }

  // 第一部分（### 之前的内容）直接渲染
  let html = parts[0] ? marked.parse(parts[0]) : '';

  // 剩余每个 ### 项包裹为卡片
  for (let i = 1; i < parts.length; i++) {
    const itemHtml = marked.parse(parts[i]);
    html += `<div class="md-card" data-cat-key="${catKey}">${itemHtml}</div>`;
  }

  return html;
}

/** 统计 ### 条目数 */
function countItems(md) {
  return (md.match(/^### /gm) || []).length;
}

/* ============================================================
   8. 🖼️ 渲染 UI
   ============================================================ */

// 日期条
function renderDateStrip() {
  if (!state.index) return;
  DOM.dateStrip.innerHTML = '';
  const days = [];
  for (const m of state.index.months) {
    for (const d of m.days) {
      if (!days.find(x => x.date===d.date && x.type===d.type)) days.push(d);
    }
  }
  days.slice(0,14).reverse().forEach(d => {
    const b = document.createElement('button');
    b.className = 'date-btn' + (d.type==='weekly'?' has-weekly':'');
    if (d.date===state.currentDate && d.type===state.currentType) b.classList.add('active');
    b.textContent = parseInt(d.date.substring(4,6))+'/'+parseInt(d.date.substring(6,8));
    b.dataset.date = d.date; b.dataset.type = d.type;
    b.addEventListener('click', () => selectDate(d));
    DOM.dateStrip.appendChild(b);
  });
  setTimeout(() => {
    const a = DOM.dateStrip.querySelector('.date-btn.active');
    if (a) a.scrollIntoView({inline:'center',behavior:'smooth'});
  }, 100);
}

// 侧边栏 & 抽屉
function buildArchive(container, cls, onSelect) {
  if (!state.index) return;
  container.innerHTML = '';
  state.index.months.forEach((month, mi) => {
    const el = document.createElement('div');
    el.className = cls + '-month' + (mi===0?' open':'');
    const hdr = document.createElement('div');
    hdr.className = cls + '-month-header';
    hdr.innerHTML = `<span class="${cls}-month-title">${month.label}</span><span class="${cls}-month-arrow">▼</span>`;
    hdr.addEventListener('click', () => el.classList.toggle('open'));
    const days = document.createElement('div');
    days.className = cls + '-days';
    month.days.forEach(d => {
      const item = document.createElement('div');
      item.className = cls + '-day-item';
      if (d.date===state.currentDate && d.type===state.currentType) item.classList.add('active');
      item.innerHTML = `<span>${d.label}</span><span class="${cls}-day-type">${d.typeCN||d.type}</span>`;
      item.addEventListener('click', () => onSelect(d));
      days.appendChild(item);
    });
    el.appendChild(hdr); el.appendChild(days); container.appendChild(el);
  });
}
function renderSidebar() { buildArchive(DOM.sidebarContent,'sidebar', d => selectDate(d)); }
function renderDrawer() { buildArchive(DOM.drawerContent,'drawer', d => { selectDate(d); closeDrawer(); }); }

// 分类 Tab
function renderTabs(parsed) {
  DOM.categoryTabs.innerHTML = '';
  const add = (key, emoji, label, active) => {
    const b = document.createElement('button');
    b.className = 'cat-tab' + (key===state.currentCat?' active':'');
    b.dataset.cat = key;
    b.innerHTML = `<span class="tab-emoji">${emoji}</span>${label}`;
    b.addEventListener('click', () => filterCat(key));
    DOM.categoryTabs.appendChild(b);
  };
  add('all', '📰', '全部', state.currentCat==='all');

  const cats = parsed?.categories || [];
  const used = {};
  cats.forEach(c => { used[c.catKey] = true; });

  // 有内容才显示 Tab
  CATEGORIES.forEach(c => {
    if (!used[c.key] && cats.length) return;
    add(c.key, c.emoji, c.name.substring(0,6), state.currentCat===c.key);
  });
}

// 过滤分类
function filterCat(key) {
  state.currentCat = key;
  DOM.categoryTabs.querySelectorAll('.cat-tab').forEach(t => t.classList.toggle('active', t.dataset.cat===key));
  if (key !== 'all') window.scrollTo({top:0,behavior:'smooth'});
  // 显示/隐藏章节
  document.querySelectorAll('.md-section').forEach(el => {
    el.style.display = (key==='all' || el.dataset.catKey===key) ? '' : 'none';
  });
  document.querySelectorAll('.md-card').forEach(el => {
    el.style.display = (key==='all' || el.dataset.catKey===key) ? '' : 'none';
  });
}

// 渲染新闻主体
function renderNews(parsed, entry) {
  DOM.newsList.innerHTML = '';
  if (!parsed || !parsed.html) {
    DOM.newsList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">暂无内容</div></div>`;
    return;
  }
  const d = parseDate(entry.date);
  const hdr = document.createElement('div');
  hdr.className = 'date-page-header';
  hdr.innerHTML = `<div class="date-page-title">${d.year}年${d.month}月${d.day}日 ${d.weekday}</div>
    <div class="date-page-meta">${entry.typeCN||'早间'}新闻简报</div>`;
  DOM.newsList.appendChild(hdr);

  // 直接插入渲染好的 Markdown HTML
  const wrapper = document.createElement('div');
  wrapper.className = 'md-render';
  wrapper.innerHTML = parsed.html;
  DOM.newsList.appendChild(wrapper);

  filterCat(state.currentCat);
}

/* ============================================================
   9. 🎯 选择日期
   ============================================================ */
async function selectDate(entry) {
  if (state.isLoading) return;
  state.isLoading = true;
  state.currentDate = entry.date;
  state.currentType = entry.type;

  DOM.dateStrip.querySelectorAll('.date-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.date===entry.date && b.dataset.type===entry.type);
  });
  state.currentCat = 'all';

  DOM.newsList.innerHTML = '';
  if (DOM.skeleton) DOM.skeleton.style.display = '';
  if (DOM.skeleton) DOM.newsList.appendChild(DOM.skeleton);
  if (DOM.todayHeadline) DOM.todayHeadline.style.display = 'none';

  const parsed = await loadNews(entry);
  DOM.skeleton.remove();
  state.isLoading = false;

  if (!parsed) {
    DOM.newsList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">加载失败</div></div>`;
    return;
  }

  renderTabs(parsed);
  renderNews(parsed, entry);

  if (parsed.headline && DOM.todayHeadline) {
    if (DOM.headlineText) DOM.headlineText.textContent = parsed.headline;
    DOM.todayHeadline.style.display = 'flex';
  }
  refreshArchive();
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ============================================================
   10. 🔍 搜索
   ============================================================ */
function openSearch() { DOM.searchPanel.classList.add('open'); document.body.style.overflow='hidden'; setTimeout(()=>DOM.searchInput.focus(),300); setNav('search'); }
function closeSearch() { DOM.searchPanel.classList.remove('open'); document.body.style.overflow=''; setNav('today'); DOM.searchInput.value=''; DOM.searchResults.innerHTML='<div class="search-placeholder">输入关键词开始搜索</div>'; }

let st = null;
function handleSearch(q) { clearTimeout(st); if(!q.trim()){ DOM.searchResults.innerHTML='<div class="search-placeholder">输入关键词开始搜索</div>'; return; } st=setTimeout(()=>doSearch(q.trim()),300); }

async function doSearch(q) {
  DOM.searchResults.innerHTML = '<div class="loading-text">搜索中...</div>';
  if (!state.allNews.length) await buildSearchIdx();
  const kw = q.toLowerCase();
  const res = state.allNews.filter(i => i.text.toLowerCase().includes(kw));
  if (!res.length) { DOM.searchResults.innerHTML=`<div class="search-no-result">没有找到"${esc(q)}"相关新闻</div>`; return; }
  DOM.searchResults.innerHTML = '';
  res.slice(0,50).forEach(i => {
    const el = document.createElement('div');
    el.className = 'search-result-item';
    el.innerHTML = `<div class="search-result-title">${highlight(esc(i.text.substring(0,80)),esc(q))}</div>`;
    el.addEventListener('click', async () => { closeSearch(); const de = findDay(i.date); if(de) await selectDate(de); });
    DOM.searchResults.appendChild(el);
  });
}

async function buildSearchIdx() {
  if (!state.index) return;
  for (const m of state.index.months) {
    for (const d of m.days) {
      const key = d.date+'_'+d.type;
      let parsed = state.cache[key];
      if (!parsed) parsed = await loadNews(d);
      if (!parsed || !parsed.html) continue;
      // 提取纯文本
      const tmp = document.createElement('div');
      tmp.innerHTML = parsed.html;
      state.allNews.push({ date: d.date, text: tmp.textContent || '' });
    }
  }
}
function findDay(d) { for(const m of state.index?.months||[]){for(const day of m.days){if(day.date===d) return day;}}return null; }

/* ============================================================
   11. 🧰 工具函数
   ============================================================ */
function parseDate(d) {
  const y=d.substring(0,4),m=parseInt(d.substring(4,6)),day=parseInt(d.substring(6,8));
  const dt=new Date(parseInt(y),m-1,day);
  return {year:y,month:m,day,weekday:['周日','周一','周二','周三','周四','周五','周六'][dt.getDay()]};
}
function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
function highlight(t,k) { if(!k||!t) return t||''; return t.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'), m=>`<span class="search-highlight">${m}</span>`); }
function showError(m) { DOM.newsList.innerHTML=`<div class="empty-state"><div class="empty-state-icon">😢</div><div class="empty-state-text">${esc(m)}</div></div>`; }
function setNav(t) { [DOM.navArchive,DOM.navToday,DOM.navSearch].forEach(e=>e.classList.remove('active')); if(t==='archive') DOM.navArchive.classList.add('active'); else if(t==='search') DOM.navSearch.classList.add('active'); else DOM.navToday.classList.add('active'); }
function refreshArchive() { renderSidebar(); renderDrawer(); }
function openDrawer() { renderDrawer(); DOM.drawerOverlay.classList.add('open'); DOM.archiveDrawer.classList.add('open'); document.body.style.overflow='hidden'; setNav('archive'); }
function closeDrawer() { DOM.drawerOverlay.classList.remove('open'); DOM.archiveDrawer.classList.remove('open'); document.body.style.overflow=''; setNav('today'); }
function getLatest() { return state.index?.months?.[0]?.days?.[0] || null; }

// SW 预缓存
function schedulePrecache() {
  if (!('serviceWorker' in navigator) || !state.index) return;
  let retry=0;
  function run() {
    navigator.serviceWorker.ready.then(reg => {
      if(!reg||!reg.active){ if(retry++<5){setTimeout(run,1000*retry);return;} return; }
      const paths = [];
      for(const m of state.index.months) for(const d of m.days) {
        if(d.file) paths.push(d.file);
        else if(d.dir) CATEGORIES.forEach((_,i)=>paths.push(d.dir+String(i+1).padStart(2,'0')+'_'+CATEGORIES[i].name+'.md'));
      }
      reg.active.postMessage({type:'PRECACHE_NEWS',files:paths.slice(0,20)});
    });
  }
  setTimeout(run,500);
}

/* ============================================================
   12. 🚀 启动
   ============================================================ */
async function init() {
  initTheme(); initOffline();
  DOM.btnTheme?.addEventListener('click', toggleTheme);
  DOM.btnEnglish?.addEventListener('click', e => { e.preventDefault(); window.location.assign('englishStudy/index.html'); });

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
  }

  DOM.navArchive?.addEventListener('click', openDrawer);
  DOM.navToday?.addEventListener('click', () => { closeDrawer(); closeSearch(); setNav('today'); });
  DOM.navSearch?.addEventListener('click', openSearch);
  DOM.btnCloseDrawer?.addEventListener('click', closeDrawer);
  DOM.drawerOverlay?.addEventListener('click', closeDrawer);

  let ty=0;
  DOM.archiveDrawer?.addEventListener('touchstart', e=>{ty=e.touches[0].clientY;}, {passive:true});
  DOM.archiveDrawer?.addEventListener('touchend', e=>{if(e.changedTouches[0].clientY-ty>80) closeDrawer();}, {passive:true});

  DOM.btnSearchBack?.addEventListener('click', closeSearch);
  DOM.searchInput?.addEventListener('input', e => handleSearch(e.target.value));
  DOM.searchInput?.addEventListener('keydown', e => { if(e.key==='Escape') closeSearch(); });

  const ok = await loadIndex();
  if (!ok) return;
  schedulePrecache();
  renderDateStrip();
  renderSidebar();
  renderTabs(null);
  initSpy();
  initTabDrag();
  initHideHeader();

  const latest = getLatest();
  if (latest) await selectDate(latest);
  else showError('暂无新闻数据');
}

// 拖拽
function makeDrag(el) {
  let d=false,sx=0,sl=0,mv=false;
  el.addEventListener('mousedown',e=>{d=true;mv=false;sx=e.pageX-el.offsetLeft;sl=el.scrollLeft;el.style.cursor='grabbing';el.style.userSelect='none';});
  el.addEventListener('mouseleave',()=>{d=false;el.style.cursor='';el.style.userSelect='';});
  el.addEventListener('mouseup',()=>{d=false;el.style.cursor='';el.style.userSelect='';});
  el.addEventListener('mousemove',e=>{if(!d)return;e.preventDefault();const x=e.pageX-el.offsetLeft;if(Math.abs(x-sx)>3)mv=true;el.scrollLeft=sl-(x-sx);});
  el.addEventListener('click',e=>{if(mv){e.stopPropagation();mv=false;}},true);
}
function initTabDrag() { makeDrag(DOM.categoryTabs); makeDrag(DOM.dateStrip); }

// 滚动联动
function initSpy() {
  let ob=null, last='all';
  function attach() {
    if(ob) ob.disconnect();
    if(state.currentCat!=='all') return;
    const cards = Array.from(document.querySelectorAll('.md-section[data-cat-key]')).filter(e=>e.style.display!=='none');
    if(!cards.length) return;
    ob = new IntersectionObserver(entries=>{
      const v = entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top - b.boundingClientRect.top);
      if(v.length) {
        const k = v[0].target.dataset.catKey;
        if(k&&k!==last){last=k;
          DOM.categoryTabs.querySelectorAll('.cat-tab').forEach(t=>t.classList.toggle('active',t.dataset.cat===k));
          const a=DOM.categoryTabs.querySelector(`.cat-tab[data-cat="${CSS.escape(k)}"]`);
          if(a) a.scrollIntoView({inline:'center',behavior:'smooth',block:'nearest'});
        }
      }
    },{rootMargin:'-160px 0px -40% 0px',threshold:0});
    cards.forEach(c=>ob.observe(c));
  }
  state._attachSpyObserver = attach;
}

// 头部隐藏
function initHideHeader() {
  let ly=0, tk=false;
  window.addEventListener('scroll',()=>{
    if(tk) return; tk=true;
    requestAnimationFrame(()=>{
      const y=window.pageYOffset||document.documentElement.scrollTop||0;
      const ab=(window.innerHeight+y)>=(document.documentElement.scrollHeight-5);
      if(y<=0||ab) document.body.classList.remove('hide-topbar');
      else if(y>ly&&y>10) document.body.classList.add('hide-topbar');
      else if(y<ly) document.body.classList.remove('hide-topbar');
      ly=y; tk=false;
    });
  },{passive:true});
}

document.addEventListener('DOMContentLoaded', init);
