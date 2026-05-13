/* ============================================================
   早间新闻 — app.js (v2.0)
   核心逻辑：双格式兼容（单文件 / 多文件目录 / 合并文件）
   ============================================================ */

'use strict';

/* ============================================================
   1. 常量 & 配置
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

// 板块文件的通用命名映射 (用于多文件格式)
const CN_NUM = ['','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七'];

/* ============================================================
   2. 全局状态
   ============================================================ */

const state = {
  index:       null,
  currentDate: null,
  currentType: 'morning',
  currentCat:  'all',
  cache:       {},      // { key: parsedData }
  allNews:     [],      // 全量搜索索引
  isLoading:   false,
  isOffline:   false,
};

/* ============================================================
   3. DOM 引用
   ============================================================ */

const $ = id => document.getElementById(id);
const DOM = {
  header:        $('appHeader'),        dateStrip:     $('dateStrip'),
  main:          $('appMain'),          newsList:      $('newsList'),
  skeleton:      $('skeletonWrap'),     categoryTabs:  $('categoryTabs'),
  glanceSection: $('glanceSection'),    glanceGrid:    $('glanceGrid'),
  todayHeadline: $('todayHeadline'),    headlineText:  $('headlineText'),
  navArchive:    $('navArchive'),       navToday:      $('navToday'),
  navSearch:     $('navSearch'),        drawerOverlay: $('drawerOverlay'),
  archiveDrawer: $('archiveDrawer'),    drawerContent: $('drawerContent'),
  btnCloseDrawer:$('btnCloseDrawer'),   searchPanel:   $('searchPanel'),
  searchInput:   $('searchInput'),      searchResults: $('searchResults'),
  btnSearchBack: $('btnSearchBack'),    sidebarContent:$('sidebarContent'),
  sidebarSearch: $('sidebarSearchInput'), btnTheme:    $('btnTheme'),
  btnEnglish:    $('btnEnglish'),
};

/* ============================================================
   4. 主题切换
   ============================================================ */

function initTheme() {
  const saved = localStorage.getItem('news-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'), false);
}

function applyTheme(theme, save) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = DOM.btnTheme?.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#161b22' : '#ffffff');
  if (save !== false) localStorage.setItem('news-theme', theme);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

/* ============================================================
   5. 离线监测
   ============================================================ */

function initOfflineDetection() {
  const banner = document.getElementById('offlineBanner');
  function update() {
    state.isOffline = !navigator.onLine;
    if (banner) banner.style.display = state.isOffline ? 'flex' : 'none';
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

/* ============================================================
   6. 加载 news-index.json
   ============================================================ */

async function loadIndex() {
  try {
    const resp = await fetch('news-index.json?t=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    state.index = await resp.json();
    if (state.index.offline) { showError('当前离线且无缓存，请联网后再试'); return false; }
    return true;
  } catch (e) {
    console.error('加载索引失败', e);
    showError('无法加载新闻索引');
    return false;
  }
}

/* ============================================================
   7. 双格式数据加载器
   ============================================================ */

/**
 * 加载指定日期的新闻 — 自动识别格式
 * 兼容三种情况：
 *   A. entry.file 指向单个 .md 文件（旧格式或合并文件）
 *   B. entry.dir 指向目录，内有 01_名称.md ~ 17_名称.md
 *   C. 自动回退：file 404 时尝试目录
 */
async function loadNewsForDate(entry) {
  const key = entry.date + '_' + entry.type;
  if (state.cache[key]) return state.cache[key];

  let parsed;
  // 情况 B：明确指定了 dir
  if (entry.dir) {
    parsed = await loadFromDir(entry.dir, entry);
  }
  // 情况 A：尝试单文件
  else if (entry.file) {
    parsed = await loadSingleFile(entry.file, entry);
    // 情况 C：单文件不存在，自动回退到目录
    if (!parsed) {
      const fallbackDir = guessDirFromFile(entry.file);
      if (fallbackDir) parsed = await loadFromDir(fallbackDir, entry);
    }
  }

  if (parsed) state.cache[key] = parsed;
  return parsed;
}

/** 从 file 路径推测 dir 路径 (news/YYYYMM/YYYYMMDD_早间.md → news/YYYYMM/YYYYMMDD/) */
function guessDirFromFile(filepath) {
  const m = filepath.match(/^(.*?)(\d{8})_/);
  return m ? m[1] + m[2] + '/' : null;
}

/** 加载单文件 (.md) */
async function loadSingleFile(filepath, entry) {
  try {
    const resp = await fetch(filepath + '?t=' + Date.now());
    if (!resp.ok) return null;
    const raw = await resp.text();
    return parseMarkdown(raw, entry);
  } catch { return null; }
}

/** 从目录加载多文件（自动发现 01_名称.md ~ 17_名称.md） */
async function loadFromDir(dirpath, entry) {
  const allSections = [];
  const results = await Promise.allSettled(
    CATEGORIES.map(async (cat, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      // 尝试多种可能的文件名
      const candidates = [`${num}_${cat.name}.md`, `${num}_${cat.key}.md`];
      for (const fname of candidates) {
        const url = dirpath + encodeURIComponent(fname);
        try {
          const resp = await fetch(url + '?t=' + Date.now());
          if (!resp.ok) continue;
          const text = await resp.text();
          return { cat, idx, content: text };
        } catch { continue; }
      }
      return null;
    })
  );

  // 收集头条摘要
  let headline = '';

  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    const { cat, idx, content } = result.value;
    const items = parseSectionItems(content, cat);

    // 从第一个新闻中提取头条
    if (idx === 0 && items.length > 0) {
      headline = items[0].title;
    }

    // 从文件头部提取 glance 关键词
    const kw = extractKeyword(content);

    allSections.push({
      catKey:  cat.key,
      catEmoji: cat.emoji,
      catName: cat.name,
      items,
      glance:  kw,
    });
  }

  // 按顺序排列
  allSections.sort((a, b) => CATEGORIES.findIndex(c => c.key === a.catKey)
                              - CATEGORIES.findIndex(c => c.key === b.catKey));

  return { headline, categories: allSections };
}

/** 从单文件 markdown 解析出结构化数据 */
function parseMarkdown(raw, entry) {
  const lines = raw.split('\n');
  const result = { headline: '', glance: [], categories: [] };
  let currentCat = null, currentItemLines = [], inGlance = false;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 要点速览表格
    if (line.includes('要点速览') && line.includes('📊')) { inGlance = true; i++; continue; }
    if (inGlance) {
      const s = line.trim();
      if (s.startsWith('|') && !s.startsWith('|---')) {
        const cells = s.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 2 && !cells[0].includes('分类') && !cells[0].includes('---')) {
          const mc = CATEGORIES.find(c => cells[0].includes(c.key) || cells[0].includes(c.name) || cells[0].includes(c.emoji));
          if (mc) result.glance.push({ catKey: mc.key, keyword: cells[1] });
        }
      } else if (line.startsWith('##') || line.startsWith('---')) { inGlance = false; }
      else if (!s.startsWith('|')) { inGlance = false; }
      i++; continue;
    }

    // 二级标题 → 新分类开始
    if (line.startsWith('## ')) {
      flushItem();
      const mc = matchCategory(line);
      if (mc) {
        currentCat = { catKey: mc.key, catEmoji: mc.emoji, catName: mc.name, items: [] };
        result.categories.push(currentCat);
      } else {
        currentCat = null;
      }
      i++; continue;
    }

    // 三级标题 → 新闻条目
    if (line.startsWith('### ')) {
      if (currentCat) {
        if (currentItemLines.length) pushItem(currentCat, currentItemLines);
        currentItemLines = [line];
      }
      i++; continue;
    }

    if (currentCat) currentItemLines.push(line);
    i++;
  }
  flushItem();

  function flushItem() {
    if (currentCat && currentItemLines.length) {
      pushItem(currentCat, currentItemLines);
      currentItemLines = [];
    }
  }

  // 提取 headline
  for (const line of lines) {
    if (line.includes('🔥') && line.includes('今日头条') && line.includes('：')) {
      const cleaned = line.replace(/\*\*/g, '').replace(/^.*?[：:]/, '').trim();
      if (cleaned.length > 10) { result.headline = cleaned.substring(0, 120); break; }
    }
  }
  if (!result.headline && result.categories.length && result.categories[0].items.length) {
    result.headline = result.categories[0].items[0].title;
  }

  return result;
}

/** 从多文件板块的 markdown 中提取新闻条目 */
function parseSectionItems(raw, cat) {
  const lines = raw.split('\n');
  const items = [];
  let currentLines = [];

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (currentLines.length) { pushItem({ items }, currentLines); }
      currentLines = [line];
    } else if (currentLines.length) {
      currentLines.push(line);
    }
  }
  if (currentLines.length) pushItem({ items }, currentLines);
  return items;
}

/** 从板块文件头部提取关键词 */
function extractKeyword(raw) {
  for (const line of raw.split('\n')) {
    const m = line.match(/^\d+\.\s*\*\*(.+?)\*\*\s*[—\-–]/);
    if (m) return m[1];
  }
  return '';
}

/** 匹配分类标题行 */
function matchCategory(line) {
  for (const cat of CATEGORIES) {
    if (line.includes(cat.name)) return cat;
  }
  for (const cat of CATEGORIES) {
    if (line.includes(cat.key)) return cat;
  }
  for (const cat of CATEGORIES) {
    if (line.includes(cat.emoji)) return cat;
  }
  return null;
}

/** 将新闻条目推入分类 */
function pushItem(catObj, lines) {
  if (!catObj || lines.length === 0) return;
  const titleLine = lines[0]
    .replace(/^###\s*/, '').replace(/^\d+\.\s*/, '')
    .replace(/[【】\[\]]/g, '').replace(/\*\*/g, '').trim();
  if (titleLine.length < 4) return;

  const rawMd = lines.join('\n');
  let summary = '', source = '';

  for (const l of lines) {
    if (!summary && l.includes('📌') && !l.startsWith('#')) {
      const cleaned = l.replace(/^[>\s*]*📌\s*/, '').replace(/^\*\*[^*]+\*\*[：:]\s*/, '').replace(/\*\*/g, '').trim();
      if (cleaned.length > 10) summary = cleaned.substring(0, 130) + (cleaned.length > 130 ? '...' : '');
    }
    if (!source && l.includes('🔗')) {
      source = l.replace(/^[>\s*]*🔗\s*/, '').replace(/\*\*/g, '').replace(/信息来源[：:]/i, '').trim().substring(0, 80);
    }
  }

  // 从老格式找摘要
  if (!summary) {
    for (const l of lines.slice(1)) {
      if (l.includes('🔥') && (l.includes('核心事件') || l.includes('深度报道'))) {
        const nxt = lines[lines.indexOf(l) + 1];
        if (nxt) {
          const cleaned = nxt.replace(/^[>\s*]*/, '').replace(/\*\*/g, '').trim();
          if (cleaned.length > 20) { summary = cleaned.substring(0, 130) + (cleaned.length > 130 ? '...' : ''); break; }
        }
      }
    }
  }
  if (!summary) {
    for (const l of lines.slice(1)) {
      const cleaned = l.replace(/^[#>*\-|📌🔥📅⚖️🌐🚀🤖🔗▌>]\s*/, '').replace(/\*\*/g, '').trim();
      if (cleaned.length > 20 && !cleaned.startsWith('|') && !cleaned.startsWith('（')) {
        summary = cleaned.substring(0, 130) + (cleaned.length > 130 ? '...' : '');
        break;
      }
    }
  }

  catObj.items.push({ title: titleLine, summary: summary || '点击查看详情', source, rawMd });
}

/* ============================================================
   8. SW 预缓存调度
   ============================================================ */

function schedulePrecache() {
  if (!('serviceWorker' in navigator) || !state.index) return;
  let retry = 0;
  function run() {
    navigator.serviceWorker.ready.then(reg => {
      if (!reg || !reg.active) {
        if (retry++ < 5) { setTimeout(run, 1000 * retry); return; }
        return;
      }
      const paths = [];
      for (const m of state.index.months) {
        for (const d of m.days) {
          if (d.file) paths.push(d.file);
          else if (d.dir) {
            // 预缓存目录下所有板块文件
            CATEGORIES.forEach((_, idx) => {
              const n = String(idx + 1).padStart(2, '0');
              paths.push(d.dir + encodeURIComponent(`${n}_${d.label}.md`));
            });
          }
        }
      }
      reg.active.postMessage({ type: 'PRECACHE_NEWS', files: paths.slice(0, 20) });
    });
  }
  setTimeout(run, 500);
}

/* ============================================================
   9. 渲染函数（与之前保持一致，UI 不变）
   ============================================================ */

// 渲染日期切换条
function renderDateStrip() {
  if (!state.index) return;
  DOM.dateStrip.innerHTML = '';
  const allDays = [];
  for (const m of state.index.months) {
    for (const d of m.days) {
      if (!allDays.find(x => x.date === d.date && x.type === d.type)) allDays.push(d);
    }
  }
  const recent = allDays.slice(0, 14).reverse();
  recent.forEach(day => {
    const btn = document.createElement('button');
    btn.className = 'date-btn' + (day.type === 'weekly' ? ' has-weekly' : '');
    if (day.date === state.currentDate && day.type === state.currentType) btn.classList.add('active');
    btn.textContent = formatShortDate(day.date);
    btn.dataset.date = day.date; btn.dataset.type = day.type;
    btn.addEventListener('click', () => selectDate(day));
    DOM.dateStrip.appendChild(btn);
  });
  setTimeout(() => {
    const a = DOM.dateStrip.querySelector('.date-btn.active');
    if (a) a.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  }, 100);
}

function formatShortDate(d) { return `${parseInt(d.substring(4,6))}/${parseInt(d.substring(6,8))}`; }

// 归档树（侧边栏 & 抽屉共用）
function buildArchiveTree(container, cls, onSelect) {
  if (!state.index) return;
  container.innerHTML = '';
  state.index.months.forEach((month, mi) => {
    const el = document.createElement('div');
    el.className = cls + '-month' + (mi === 0 ? ' open' : '');
    const hdr = document.createElement('div');
    hdr.className = cls + '-month-header';
    hdr.innerHTML = `<span class="${cls}-month-title">${month.label}</span><span class="${cls}-month-arrow">▼</span>`;
    hdr.addEventListener('click', () => el.classList.toggle('open'));
    const daysEl = document.createElement('div');
    daysEl.className = cls + '-days';
    month.days.forEach(day => {
      const item = document.createElement('div');
      item.className = cls + '-day-item';
      if (day.date === state.currentDate && day.type === state.currentType) item.classList.add('active');
      item.innerHTML = `<span>${day.label}</span><span class="${cls}-day-type">${day.typeCN || day.type}</span>`;
      item.addEventListener('click', () => onSelect(day));
      daysEl.appendChild(item);
    });
    el.appendChild(hdr); el.appendChild(daysEl); container.appendChild(el);
  });
}

function renderSidebar() { buildArchiveTree(DOM.sidebarContent, 'sidebar', day => selectDate(day)); }
function renderDrawer() { buildArchiveTree(DOM.drawerContent, 'drawer', day => { selectDate(day); closeDrawer(); }); }

// 分类 Tab
function renderCategoryTabs(parsed) {
  DOM.categoryTabs.innerHTML = '';
  const allTab = document.createElement('button');
  allTab.className = 'cat-tab' + (state.currentCat === 'all' ? ' active' : '');
  allTab.dataset.cat = 'all';
  allTab.innerHTML = '<span class="tab-emoji">📰</span>全部';
  allTab.addEventListener('click', () => selectCategory('all'));
  DOM.categoryTabs.appendChild(allTab);

  const cats = parsed ? parsed.categories : [];
  (cats.length ? cats : CATEGORIES).forEach((cat, idx) => {
    if (cats.length && cat.items.length === 0) return;
    const tab = document.createElement('button');
    tab.className = 'cat-tab' + (state.currentCat === cat.catKey ? ' active' : '');
    tab.dataset.cat = cat.catKey;
    tab.innerHTML = `<span class="tab-emoji">${cat.catEmoji || CATEGORIES[idx]?.emoji || ''}</span>${(cat.catName || cat.name || '').substring(0,6)}`;
    tab.addEventListener('click', () => selectCategory(cat.catKey));
    DOM.categoryTabs.appendChild(tab);
  });
}

function selectCategory(key) {
  state.currentCat = key;
  DOM.categoryTabs.querySelectorAll('.cat-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === key));
  if (key !== 'all') window.scrollTo({ top: 0, behavior: 'smooth' });
  DOM.newsList.querySelectorAll('.news-card, .cat-banner').forEach(el => {
    el.style.display = (key === 'all' || el.dataset.catKey === key) ? '' : 'none';
  });
  setTimeout(() => { if (state._attachSpyObserver) state._attachSpyObserver(); }, 150);
}

// 要点速览
function renderGlance(parsed) {
  if (!parsed || !parsed.glance?.length) { DOM.glanceSection.style.display = 'none'; return; }
  DOM.glanceSection.style.display = '';
  DOM.glanceGrid.innerHTML = '';
  // 从多文件格式构建 glance
  const glance = parsed.glance.length ? parsed.glance : parsed.categories.filter(c => c.items.length).map(c => ({
    catKey: c.catKey, emoji: c.catEmoji, keyword: c.items[0]?.title?.substring(0, 30) || ''
  }));
  glance.forEach(g => {
    const ci = CATEGORIES.findIndex(c => c.key === g.catKey);
    if (ci < 0) return;
    const card = document.createElement('div');
    card.className = 'glance-card'; card.dataset.catKey = g.catKey;
    card.innerHTML = `<div class="glance-emoji">${g.emoji || CATEGORIES[ci].emoji}</div>
      <div class="glance-category">${CATEGORIES[ci].name}</div>
      <div class="glance-keyword">${esc(g.keyword || '')}</div>`;
    card.addEventListener('click', () => selectCategory(g.catKey));
    DOM.glanceGrid.appendChild(card);
  });
}

// 新闻卡片列表
function renderNewsList(parsed, entry) {
  DOM.newsList.innerHTML = '';
  if (!parsed || !parsed.categories?.length) {
    DOM.newsList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">该日期暂无新闻内容</div></div>`;
    return;
  }
  const d = parseDateStr(entry.date);
  const header = document.createElement('div');
  header.className = 'date-page-header';
  header.innerHTML = `<div class="date-page-title">${d.year}年${d.month}月${d.day}日 ${d.weekday}</div>
    <div class="date-page-meta">${entry.typeCN || '早间'}新闻简报</div>`;
  DOM.newsList.appendChild(header);

  parsed.categories.forEach((cat, ci) => {
    if (!cat.items?.length) return;
    const badge = 'badge-' + Math.min(ci, 15);
    DOM.newsList.appendChild(buildCatBanner(cat, ci));
    cat.items.forEach(item => {
      DOM.newsList.appendChild(buildNewsCard(item, cat, badge, entry));
    });
  });

  selectCategory(state.currentCat);
  setTimeout(() => { if (state._attachSpyObserver) state._attachSpyObserver(); }, 100);
}

function buildCatBanner(cat, idx) {
  const banner = document.createElement('div');
  banner.className = 'cat-banner'; banner.dataset.catKey = cat.catKey;
  const meta = CATEGORIES.find(c => c.key === cat.catKey) || {};
  banner.innerHTML = `<div class="cat-banner-left"><span class="cat-banner-emoji">${cat.catEmoji}</span>
    <div class="cat-banner-info"><span class="cat-banner-name">${cat.catName}</span>
    <span class="cat-banner-desc">${meta.desc || ''}</span></div></div>
    <span class="cat-banner-count">${cat.items.length} 条</span>`;
  return banner;
}

function buildNewsCard(item, cat, badge, entry) {
  const card = document.createElement('div');
  card.className = 'news-card'; card.dataset.catKey = cat.catKey;
  const d = parseDateStr(entry.date);
  card.innerHTML = `<div class="news-card-header">
    <div class="card-meta"><span class="card-category-badge ${badge}">${cat.catEmoji} ${cat.catName}</span>
    <span class="card-date">${d.month}/${d.day}</span></div>
    <div class="card-title">${esc(item.title)}</div>
    <div class="card-summary">${esc(item.summary)}</div>
    <div class="card-footer"><span class="card-source">${esc(item.source)}</span>
    <span class="card-toggle">展开 <span class="toggle-arrow">▼</span></span></div></div>
    <div class="news-card-body"><div class="news-card-body-inner">
    <div class="md-content" data-raw="${encodeURIComponent(item.rawMd)}"></div></div></div>`;

  card.querySelector('.news-card-header').addEventListener('click', () => {
    const expanded = card.classList.toggle('expanded');
    const mdEl = card.querySelector('.md-content');
    if (expanded && !mdEl.dataset.rendered) {
      let raw = decodeURIComponent(mdEl.dataset.raw);
      // 预处理：各类小标题行前后加空行
      raw = raw.replace(/(^|\n)(\*\*[^\n*]{1,40}\*\*[^\n]{0,30})(\n)(?!\n)/g, '$1$2\n\n');
      raw = raw.replace(/(^|\n)(📌[^\n]+)/g, '\n\n$2');
      raw = raw.replace(/(^|\n)([🔮📊⚠️💡🎯][^\n]+)/gu, '\n\n$2');
      raw = raw.replace(/(^|\n)(▌[^\n]+)/g, '\n\n$2');
      mdEl.innerHTML = marked.parse(raw);
      // 后处理样式
      mdEl.querySelectorAll('p').forEach(p => {
        const html = p.innerHTML.trim(), text = p.textContent.trim();
        const afterStrong = html.replace(/^<strong>[^]*?<\/strong>/, '').trim();
        if (html.startsWith('<strong>') && /^[\s（）()\d\-–—至字以内]*$/.test(afterStrong)) {
          p.classList.add('section-label'); return;
        }
        if (text.startsWith('📌')) { p.classList.add('pin-item'); return; }
        if (text.startsWith('▌')) { p.classList.add('pin-item'); return; }
        if (/^[🔮📊⚠️💡🎯]/u.test(text)) p.classList.add('analysis-item');
      });
      mdEl.dataset.rendered = '1';
    }
    card.querySelector('.card-toggle').innerHTML = expanded
      ? '收起 <span class="toggle-arrow" style="transform:rotate(180deg)">▼</span>'
      : '展开 <span class="toggle-arrow">▼</span>';
  });
  return card;
}

/* ============================================================
   10. 选择日期（核心流程）
   ============================================================ */

async function selectDate(dayEntry) {
  if (state.isLoading) return;
  state.isLoading = true;
  state.currentDate = dayEntry.date;
  state.currentType = dayEntry.type;

  DOM.dateStrip.querySelectorAll('.date-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.date === dayEntry.date && b.dataset.type === dayEntry.type);
  });
  state.currentCat = 'all';

  DOM.newsList.innerHTML = '';
  DOM.skeleton.style.display = '';
  DOM.newsList.appendChild(DOM.skeleton);
  DOM.glanceSection.style.display = 'none';
  DOM.todayHeadline.style.display = 'none';

  const parsed = await loadNewsForDate(dayEntry);
  DOM.skeleton.remove();
  state.isLoading = false;

  if (!parsed) {
    DOM.newsList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">新闻加载失败</div></div>`;
    return;
  }

  renderCategoryTabs(parsed);
  renderGlance(parsed);
  renderNewsList(parsed, dayEntry);

  if (parsed.headline) {
    DOM.headlineText.textContent = parsed.headline;
    DOM.todayHeadline.style.display = 'flex';
  }
  refreshArchiveActive();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   11. 归档 & 搜索
   ============================================================ */

function openDrawer() { renderDrawer(); DOM.drawerOverlay.classList.add('open'); DOM.archiveDrawer.classList.add('open'); document.body.style.overflow = 'hidden'; setNavActive('archive'); }
function closeDrawer() { DOM.drawerOverlay.classList.remove('open'); DOM.archiveDrawer.classList.remove('open'); document.body.style.overflow = ''; setNavActive('today'); }

function openSearch() { DOM.searchPanel.classList.add('open'); document.body.style.overflow = 'hidden'; setTimeout(() => DOM.searchInput.focus(), 300); setNavActive('search'); }
function closeSearch() { DOM.searchPanel.classList.remove('open'); document.body.style.overflow = ''; setNavActive('today'); DOM.searchInput.value = ''; DOM.searchResults.innerHTML = '<div class="search-placeholder">输入关键词开始搜索</div>'; }

let searchTimer = null;
function handleSearch(q) { clearTimeout(searchTimer); if (!q.trim()) { DOM.searchResults.innerHTML = '<div class="search-placeholder">输入关键词开始搜索</div>'; return; } searchTimer = setTimeout(() => doSearch(q.trim()), 300); }

async function doSearch(query) {
  DOM.searchResults.innerHTML = '<div class="loading-text">搜索中...</div>';
  await buildSearchIndex();
  const kw = query.toLowerCase();
  const results = [];
  for (const item of state.allNews) {
    if (item.title.toLowerCase().includes(kw) || item.summary.toLowerCase().includes(kw)) results.push(item);
  }
  if (!results.length) { DOM.searchResults.innerHTML = `<div class="search-no-result">没有找到"${esc(query)}"相关新闻</div>`; return; }
  DOM.searchResults.innerHTML = '';
  results.slice(0, 50).forEach(item => {
    const el = document.createElement('div');
    el.className = 'search-result-item';
    el.innerHTML = `<div class="search-result-meta"><span class="card-category-badge badge-${item.catIdx}" style="font-size:.7rem;padding:2px 7px">${item.catEmoji} ${item.catName}</span>
      <span class="search-result-date">${item.date}</span></div>
      <div class="search-result-title">${highlight(esc(item.title), esc(query))}</div>
      <div class="search-result-summary">${highlight(esc(item.summary), esc(query))}</div>`;
    el.addEventListener('click', async () => { closeSearch(); const de = findDayEntry(item.date); if (de) await selectDate(de); });
    DOM.searchResults.appendChild(el);
  });
}

async function buildSearchIndex() {
  if (state.allNews.length) return;
  if (!state.index) return;
  for (const month of state.index.months) {
    for (const day of month.days) {
      const key = day.date + '_' + day.type;
      let parsed = state.cache[key];
      if (!parsed) parsed = await loadNewsForDate(day);
      if (!parsed) continue;
      parsed.categories?.forEach((cat, ci) => {
        cat.items?.forEach(item => {
          state.allNews.push({ date: day.date, title: item.title, summary: item.summary,
            catKey: cat.catKey, catEmoji: cat.catEmoji, catName: cat.catName, catIdx: Math.min(ci, 15) });
        });
      });
    }
  }
}

function findDayEntry(d) { for (const m of state.index?.months || []) { for (const day of m.days) { if (day.date === d) return day; } } return null; }
function highlight(text, kw) { if (!kw) return text; const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); return text.replace(re, m => `<span class="search-highlight">${m}</span>`); }

/* ============================================================
   12. 辅助函数
   ============================================================ */

function parseDateStr(d) {
  const y = d.substring(0,4), m = parseInt(d.substring(4,6)), day = parseInt(d.substring(6,8));
  const dt = new Date(parseInt(y), m - 1, day);
  return { year: y, month: m, day, weekday: ['周日','周一','周二','周三','周四','周五','周六'][dt.getDay()] };
}
function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
function showError(msg) { DOM.newsList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">😢</div><div class="empty-state-text">${esc(msg)}</div></div>`; }
function setNavActive(tab) { [DOM.navArchive, DOM.navToday, DOM.navSearch].forEach(el => el.classList.remove('active')); if (tab === 'archive') DOM.navArchive.classList.add('active'); else if (tab === 'search') DOM.navSearch.classList.add('active'); else DOM.navToday.classList.add('active'); }
function refreshArchiveActive() { renderSidebar(); renderDrawer(); }

/* ============================================================
   13. 滚动联动 & Tab 拖拽 & 头部隐藏
   ============================================================ */

function initScrollSpy() {
  let spyObserver = null, lastActiveCat = 'all';
  function attach() {
    if (spyObserver) spyObserver.disconnect();
    if (state.currentCat !== 'all') return;
    const cards = Array.from(DOM.newsList.querySelectorAll('.news-card[data-cat-key]')).filter(c => c.style.display !== 'none');
    if (!cards.length) return;
    spyObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) {
        const k = visible[0].target.dataset.catKey;
        if (k && k !== lastActiveCat) { lastActiveCat = k; highlightTab(k); }
      }
    }, { rootMargin: '-160px 0px -40% 0px', threshold: 0 });
    cards.forEach(c => spyObserver.observe(c));
  }
  state._attachSpyObserver = attach;
}

function highlightTab(k) {
  DOM.categoryTabs.querySelectorAll('.cat-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === k));
  const a = DOM.categoryTabs.querySelector(`.cat-tab[data-cat="${CSS.escape(k)}"]`);
  if (a) a.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
}

function getLatestDay() {
  if (!state.index?.months?.length) return null;
  return state.index.months[0]?.days?.[0] || null;
}

function makeDraggable(el) {
  let down = false, sx = 0, sl = 0, moved = false;
  el.addEventListener('mousedown', e => { down = true; moved = false; sx = e.pageX - el.offsetLeft; sl = el.scrollLeft; el.style.cursor = 'grabbing'; el.style.userSelect = 'none'; });
  el.addEventListener('mouseleave', () => { down = false; el.style.cursor = ''; el.style.userSelect = ''; });
  el.addEventListener('mouseup', () => { down = false; el.style.cursor = ''; el.style.userSelect = ''; });
  el.addEventListener('mousemove', e => { if (!down) return; e.preventDefault(); const x = e.pageX - el.offsetLeft; if (Math.abs(x - sx) > 3) moved = true; el.scrollLeft = sl - (x - sx); });
  el.addEventListener('click', e => { if (moved) { e.stopPropagation(); moved = false; } }, true);
}
function initTabDrag() { makeDraggable(DOM.categoryTabs); makeDraggable(DOM.dateStrip); }

function initScrollHideHeader() {
  let lastY = 0, ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = window.pageYOffset || document.documentElement.scrollTop || 0;
      const atBottom = (window.innerHeight + y) >= (document.documentElement.scrollHeight - 5);
      if (y <= 0 || atBottom) document.body.classList.remove('hide-topbar');
      else if (y > lastY && y > 10) document.body.classList.add('hide-topbar');
      else if (y < lastY) document.body.classList.remove('hide-topbar');
      lastY = y; ticking = false;
    });
  }, { passive: true });
}

/* ============================================================
   14. 主初始化
   ============================================================ */

async function init() {
  initTheme();
  initOfflineDetection();
  DOM.btnTheme?.addEventListener('click', toggleTheme);
  DOM.btnEnglish?.addEventListener('click', e => { e.preventDefault(); window.location.assign('englishStudy/index.html'); });

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
  }

  DOM.navArchive?.addEventListener('click', openDrawer);
  DOM.navToday?.addEventListener('click', () => { closeDrawer(); closeSearch(); setNavActive('today'); });
  DOM.navSearch?.addEventListener('click', openSearch);
  DOM.btnCloseDrawer?.addEventListener('click', closeDrawer);
  DOM.drawerOverlay?.addEventListener('click', closeDrawer);

  let ty = 0;
  DOM.archiveDrawer?.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
  DOM.archiveDrawer?.addEventListener('touchend', e => { if (e.changedTouches[0].clientY - ty > 80) closeDrawer(); }, { passive: true });

  DOM.btnSearchBack?.addEventListener('click', closeSearch);
  DOM.searchInput?.addEventListener('input', e => handleSearch(e.target.value));
  DOM.searchInput?.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });
  initSidebarSearch();

  const ok = await loadIndex();
  if (!ok) return;
  schedulePrecache();
  renderDateStrip();
  renderSidebar();
  renderCategoryTabs(null);
  initScrollSpy();
  initTabDrag();
  initScrollHideHeader();

  const latest = getLatestDay();
  if (latest) await selectDate(latest);
  else showError('暂无新闻数据');
}

function initSidebarSearch() {
  if (!DOM.sidebarSearch) return;
  let t = null;
  DOM.sidebarSearch.addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => doSearch(e.target.value), 300); });
}

document.addEventListener('DOMContentLoaded', init);
