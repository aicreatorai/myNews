/* ============================================================
   早间新闻 — app.js
   核心逻辑：主题切换 / 数据加载 / MD解析 / 渲染 / 交互
   ============================================================ */

'use strict';

/* ============================================================
   1. 常量 & 配置
   ============================================================ */

const CATEGORIES = [
  { emoji: '🔥', name: '今日头条',     key: '今日头条',  desc: '当日最重要、影响最广泛的头版资讯' },
  { emoji: '🤖', name: '科技热点',     key: '科技热点',  desc: '互联网、消费科技与行业动态最新进展' },
  { emoji: '🧠', name: 'AI与前沿科技', key: 'AI与前沿', desc: '大模型、AI产品与前沿技术突破' },
  { emoji: '💻', name: '软件开发',     key: '软件开发',  desc: '架构设计、工程实践与开发效率工具' },
  { emoji: '🔤', name: '开发语言',     key: '开发语言',  desc: '编程语言新版本、特性更新与社区动向' },
  { emoji: '🔶', name: '华为开发生态', key: '华为',      desc: '鸿蒙系统、DevEco Studio 与华为开发者资讯' },
  { emoji: '🍎', name: 'iOS开发生态',  key: 'iOS',      desc: 'Swift、Xcode 及苹果平台开发者动态' },
  { emoji: '🤖', name: 'Android开发生态', key: 'Android', desc: 'Android SDK、Jetpack 与谷歌开发者资讯' },
  { emoji: '🌐', name: '跨平台开发生态', key: '跨平台',  desc: 'Flutter、RN、Electron 等多端框架动态' },
  { emoji: '📲', name: '移动端生态',   key: '移动端',    desc: '移动应用市场、用户趋势与平台政策' },
  { emoji: '🧩', name: 'AI开发生态',   key: 'AI开发',   desc: 'AI框架、开发工具链与智能应用落地资讯' },
  { emoji: '⭐', name: 'GitHub实用Skills', key: 'GitHub', desc: '精选优质开源项目与实用工具库' },
  { emoji: '💡', name: 'AI知识点',       key: 'AI知识点', desc: '当前最火热的AI核心概念、原理与实践技巧' },
  { emoji: '📱', name: '产品发布',     key: '产品发布',  desc: '新品发布、版本更新与产品动态' },
  { emoji: '🏠', name: '国内热点',     key: '国内',      desc: '国内科技、经济与社会热点事件' },
  { emoji: '🌍', name: '国际大事件',   key: '国际',      desc: '全球政经格局、科技竞争与重大事件' },
  { emoji: '📈', name: '财经市场',     key: '财经',      desc: 'A股、港股、美股及宏观经济数据动态' },
];

/* ============================================================
   2. 全局状态
   ============================================================ */

const state = {
  index:       null,   // news-index.json 内容
  currentDate: null,   // 当前选中的日期 datestr "20260429"
  currentCat:  'all',  // 当前分类 key
  cache:       {},     // { datestr: parsedData }
  allNews:     [],     // 全量搜索用缓存 [{date,title,summary,catKey,catEmoji,content}]
  isLoading:   false,
  isOffline:   false,  // 当前是否处于离线状态
};

/* ============================================================
   离线状态监测
   ============================================================ */

function initOfflineDetection() {
  const banner = document.getElementById('offlineBanner');
  function updateOnlineState() {
    state.isOffline = !navigator.onLine;
    if (banner) banner.style.display = state.isOffline ? 'flex' : 'none';
  }
  window.addEventListener('online',  updateOnlineState);
  window.addEventListener('offline', updateOnlineState);
  updateOnlineState();
}

/* ============================================================
   3. DOM 引用
   ============================================================ */

const $ = id => document.getElementById(id);

const DOM = {
  header:          $('appHeader'),
  dateStrip:       $('dateStrip'),
  main:            $('appMain'),
  newsList:        $('newsList'),
  skeleton:        $('skeletonWrap'),
  categoryTabs:    $('categoryTabs'),
  glanceSection:   $('glanceSection'),
  glanceGrid:      $('glanceGrid'),
  todayHeadline:   $('todayHeadline'),
  headlineText:    $('headlineText'),
  // bottom nav
  navArchive:      $('navArchive'),
  navToday:        $('navToday'),
  navSearch:       $('navSearch'),
  // drawer
  drawerOverlay:   $('drawerOverlay'),
  archiveDrawer:   $('archiveDrawer'),
  drawerContent:   $('drawerContent'),
  btnCloseDrawer:  $('btnCloseDrawer'),
  // search
  searchPanel:     $('searchPanel'),
  searchInput:     $('searchInput'),
  searchResults:   $('searchResults'),
  btnSearchBack:   $('btnSearchBack'),
  // sidebar (desktop)
  sidebarContent:  $('sidebarContent'),
  sidebarSearch:   $('sidebarSearchInput'),
  // theme
  btnTheme:        $('btnTheme'),
  // english study
  btnEnglish:      $('btnEnglish'),
};

/* ============================================================
   4. 主题切换
   ============================================================ */

function initTheme() {
  const saved = localStorage.getItem('news-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme, false);
}

function applyTheme(theme, save = true) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = DOM.btnTheme.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  // 更新 meta theme-color
  const metaTag = document.getElementById('meta-theme-color');
  if (metaTag) {
    metaTag.setAttribute('content', theme === 'dark' ? '#161b22' : '#ffffff');
  }
  if (save) localStorage.setItem('news-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ============================================================
   5. 加载 news-index.json
   ============================================================ */

async function loadIndex() {
  try {
    // 始终带时间戳保证有网时拿最新内容
    // 离线时 SW 会通过 ignoreSearch:true 匹配缓存（无需 app 侧判断 onLine）
    const resp = await fetch('news-index.json?t=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    state.index = await resp.json();
    // 离线时 SW 返回的降级空索引（offline:true），提示用户
    if (state.index.offline) {
      showError('当前离线且无缓存，请联网后再试');
      return false;
    }
    return true;
  } catch (e) {
    console.error('加载索引失败', e);
    showError('无法加载新闻索引，请检查网络或刷新重试');
    return false;
  }
}

/* ============================================================
   5b. 通知 Service Worker 预缓存最近 20 天新闻
   ============================================================ */

function schedulePrecache() {
  if (!('serviceWorker' in navigator) || !state.index) {
    console.log('[App] 预缓存跳过：无 SW 支持或 index 未加载');
    return;
  }

  let retryCount = 0;
  const maxRetries = 5;

  function doPrecache() {
    const ready = navigator.serviceWorker.ready;
    if (!ready || typeof ready.then !== 'function') {
      console.warn('[App] navigator.serviceWorker.ready 不可用');
      return;
    }

    ready.then(reg => {
      if (!reg || !reg.active) {
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(1000 * retryCount, 5000);
          console.log(`[App] SW 尚未激活，${delay}ms 后第 ${retryCount} 次重试...`);
          setTimeout(doPrecache, delay);
          return;
        }
        console.warn('[App] SW 激活重试次数用尽，跳过预缓存');
        return;
      }

      // 收集最近 20 天的新闻文件路径（index 已倒序，取前 20 条即可）
      const allDays = [];
      for (const m of state.index.months) {
        for (const d of m.days) {
          allDays.push(d.file);
        }
      }
      const recent20 = allDays.slice(0, 20);

      if (recent20.length === 0) {
        console.log('[App] 没有可预缓存的新闻文件');
        return;
      }

      console.log('[App] 向 SW 发送预缓存指令，共', recent20.length, '个文件');
      reg.active.postMessage({ type: 'PRECACHE_NEWS', files: recent20 });
    }).catch(err => {
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = Math.min(2000 * retryCount, 8000);
        console.warn(`[App] SW ready 异常，${delay}ms 后重试:`, err.message || err);
        setTimeout(doPrecache, delay);
      }
    });
  }

  // 延迟 500ms 启动，给 SW 注册留出时间
  setTimeout(doPrecache, 500);
}

/* ============================================================
   6. 解析 .md 文件
   ============================================================ */

/**
 * 解析 MD 内容为结构化数据
 * 返回：{ headline, glance, categories: [{catKey, catEmoji, catName, items:[{title,summary,source,rawMd}]}] }
 */
function parseNewsMarkdown(raw, dateInfo) {
  const lines = raw.split('\n');
  const result = {
    headline:   '',
    glance:     [],   // [{catKey, keyword}]
    categories: [],
  };

  let currentCatIdx = -1;
  let currentItemLines = [];
  let inGlanceTable = false;

  // ---- 逐行解析 ----
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 要点速览表格
    if (line.includes('今日要点速览') || line.includes('📊')) {
      inGlanceTable = true;
      i++;
      continue;
    }
    if (inGlanceTable) {
      if (line.startsWith('|') && !line.startsWith('|---')) {
        const cells = line.split('|').map(s => s.trim()).filter(Boolean);
        if (cells.length >= 2 && !cells[0].includes('分类') && !cells[0].includes('---')) {
          const catCell = cells[0];
          const kwCell  = cells[1];
          const matchedCat = CATEGORIES.find(c =>
            catCell.includes(c.key) || catCell.includes(c.name) || catCell.includes(c.emoji)
          );
          if (matchedCat) {
            result.glance.push({ catKey: matchedCat.key, emoji: matchedCat.emoji, keyword: kwCell });
          }
        }
      } else if (line.startsWith('##') || line.startsWith('---')) {
        inGlanceTable = false;
      } else if (!line.startsWith('|')) {
        inGlanceTable = false;
      }
      i++;
      continue;
    }

    // 二级标题 → 新分类
    if (line.startsWith('## ')) {
      // 先保存上一条新闻
      if (currentCatIdx >= 0 && currentItemLines.length > 0) {
        pushItem(result.categories[currentCatIdx], currentItemLines);
        currentItemLines = [];
      }

      const catMatch = matchCategory(line);
      if (catMatch) {
        result.categories.push({
          catKey:  catMatch.key,
          catEmoji: catMatch.emoji,
          catName: catMatch.name,
          items:   [],
        });
        currentCatIdx = result.categories.length - 1;
      }
      i++;
      continue;
    }

    // 三级标题 → 新闻条目开始
    if (line.startsWith('### ')) {
      if (currentCatIdx >= 0 && currentItemLines.length > 0) {
        pushItem(result.categories[currentCatIdx], currentItemLines);
      }
      currentItemLines = [line];
      i++;
      continue;
    }

    // 其他行归入当前条目
    if (currentCatIdx >= 0) {
      currentItemLines.push(line);
    }
    i++;
  }

  // 收尾最后一条
  if (currentCatIdx >= 0 && currentItemLines.length > 0) {
    pushItem(result.categories[currentCatIdx], currentItemLines);
  }

  // 提取 headline：
  // 1. 先找独立的 **🔥 今日头条：** 行（文件头部的一段总结）
  // 2. 否则取第一个分类的第一条新闻标题
  for (const line of lines) {
    if (line.includes('🔥') && (line.includes('今日头条') || line.includes('头条')) && line.includes('：')) {
      const cleaned = line
        .replace(/\*\*/g, '')
        .replace(/^.*?[：:]/, '')
        .trim();
      if (cleaned.length > 10) {
        result.headline = cleaned.substring(0, 120);
        break;
      }
    }
  }
  if (!result.headline && result.categories.length > 0 && result.categories[0].items.length > 0) {
    result.headline = result.categories[0].items[0].title;
  }

  return result;
}

function matchCategory(line) {
  // 先用全名精确匹配（避免 'AI' key 被 'AI开发生态' 行误命中）
  for (const cat of CATEGORIES) {
    if (line.includes(cat.name)) return cat;
  }
  // 再用 key 匹配（兜底）
  for (const cat of CATEGORIES) {
    if (line.includes(cat.key)) return cat;
  }
  // 最后用 emoji 匹配
  for (const cat of CATEGORIES) {
    if (line.includes(cat.emoji)) return cat;
  }
  return null;
}

function pushItem(catObj, lines) {
  if (!catObj || lines.length === 0) return;

  // 标题：去掉 ###、序号、【】、**等修饰
  const titleLine = lines[0]
    .replace(/^###\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/[【】\[\]]/g, '')
    .replace(/\*\*/g, '')
    .trim();

  // 过滤无实质标题的空条目：
  // 1. 标题太短（< 4字）
  // 2. lines[0] 不是 ### 开头（说明是分类标题间的过渡文字，不是真正的新闻条目）
  if (titleLine.length < 4 || !lines[0].startsWith('### ')) return;
  const rawMd = lines.join('\n');

  // 提取摘要：优先取 📌 出台背景 / 📌 核心内容，次选首段文字
  let summary = '';
  let source   = '';
  let foundHeadline = false;  // 找到 🔥 核心事件 行

  for (const l of lines) {
    // 🔥 核心事件 后的第一个 📌 行作为摘要
    if (l.includes('🔥') && (l.includes('核心事件') || l.includes('核心内容'))) {
      foundHeadline = true;
    }
    if (!summary && l.includes('📌') && !l.startsWith('#')) {
      // 去掉 📌 **出台背景**： 前缀
      const cleaned = l
        .replace(/^[>\s*]*📌\s*/, '')
        .replace(/^\*\*[^*]+\*\*[：:]\s*/, '')
        .replace(/\*\*/g, '')
        .trim();
      if (cleaned.length > 10) {
        summary = cleaned.substring(0, 130) + (cleaned.length > 130 ? '...' : '');
      }
    }
    if (!source && l.includes('🔗')) {
      source = l
        .replace(/^[>\s*]*🔗\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/信息来源[：:]/i, '')
        .trim()
        .substring(0, 80);
    }
  }

  // 如果还没摘要，找 🔥 核心事件 段或首段普通文字
  if (!summary) {
    for (const l of lines.slice(1)) {
      const cleaned = l.replace(/^[#>*\-|📌🔥📅⚖️🌐🚀🤖🔗]\s*/, '').replace(/\*\*/g, '').trim();
      if (cleaned.length > 20 && !cleaned.startsWith('|') && !cleaned.startsWith('（')) {
        summary = cleaned.substring(0, 130) + (cleaned.length > 130 ? '...' : '');
        break;
      }
    }
  }

  catObj.items.push({
    title:   titleLine,
    summary: summary || '点击展开查看详情',
    source:  source,
    rawMd:   rawMd,
  });
}

/* ============================================================
   7. 加载并解析指定日期的新闻文件
   ============================================================ */

async function loadNewsForDate(dateEntry) {
  const key = dateEntry.date + '_' + dateEntry.type;
  if (state.cache[key]) return state.cache[key];

  try {
    // 始终带时间戳；离线时 SW 通过 ignoreSearch:true 命中缓存，无需 app 侧判断 onLine
    const resp = await fetch(dateEntry.file + '?t=' + Date.now());
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const raw = await resp.text();
    const parsed = parseNewsMarkdown(raw, dateEntry);
    state.cache[key] = parsed;
    return parsed;
  } catch (e) {
    console.error('加载新闻文件失败', dateEntry.file, e);
    return null;
  }
}

/* ============================================================
   8. 渲染日期切换条（手机端）
   ============================================================ */

function renderDateStrip() {
  if (!state.index) return;
  DOM.dateStrip.innerHTML = '';

  // 收集最近的日期（最多 14 个）
  const allDays = [];
  for (const m of state.index.months) {
    for (const d of m.days) {
      if (!allDays.find(x => x.date === d.date && x.type === d.type)) {
        allDays.push(d);
      }
    }
  }
  // 已按倒序，取最近14条
  const recent = allDays.slice(0, 14);

  // 从旧到新显示（UI上左旧右新）
  const toShow = [...recent].reverse();

  toShow.forEach(day => {
    const btn = document.createElement('button');
    btn.className = 'date-btn' + (day.type === 'weekly' ? ' has-weekly' : '');
    const isActive = day.date === state.currentDate && day.type === (state.currentType || 'morning');
    if (isActive) btn.classList.add('active');
    btn.textContent = formatDateShort(day.date);
    btn.dataset.date = day.date;
    btn.dataset.type = day.type;
    btn.addEventListener('click', () => selectDate(day));
    DOM.dateStrip.appendChild(btn);
  });

  // 滚动到选中
  setTimeout(() => {
    const active = DOM.dateStrip.querySelector('.date-btn.active');
    if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  }, 100);
}

function formatDateShort(datestr) {
  const m = parseInt(datestr.substring(4, 6));
  const d = parseInt(datestr.substring(6, 8));
  return `${m}/${d}`;
}

/* ============================================================
   9. 渲染侧边栏（桌面端）& 归档抽屉（手机端）
   ============================================================ */

function buildArchiveTree(container, itemClass, onSelect) {
  if (!state.index) return;
  container.innerHTML = '';

  state.index.months.forEach((month, mi) => {
    const monthEl = document.createElement('div');
    monthEl.className = itemClass + '-month' + (mi === 0 ? ' open' : '');

    const hdr = document.createElement('div');
    hdr.className = itemClass + '-month-header';

    if (itemClass === 'drawer') {
      hdr.innerHTML = `
        <span class="${itemClass}-month-title">${month.label}</span>
        <span class="${itemClass}-month-count">${month.days.length}期</span>
        <span class="${itemClass}-month-arrow">▼</span>
      `;
    } else {
      hdr.innerHTML = `
        <span class="${itemClass}-month-title">${month.label}</span>
        <span class="${itemClass}-month-arrow">▼</span>
      `;
    }

    hdr.addEventListener('click', () => monthEl.classList.toggle('open'));

    const daysEl = document.createElement('div');
    daysEl.className = itemClass + '-days';

    month.days.forEach(day => {
      const item = document.createElement('div');
      item.className = itemClass + '-day-item';
      const isActive = day.date === state.currentDate && day.type === state.currentType;
      if (isActive) item.classList.add('active');

      if (itemClass === 'drawer') {
        item.innerHTML = `
          <span class="day-label">${month.id.substring(0,4)}年 ${day.label}</span>
          <span class="day-type-badge">${day.typeCN || day.type}</span>
        `;
      } else {
        item.innerHTML = `
          <span class="${itemClass}-day-dot"></span>
          <span>${day.label}</span>
          <span class="${itemClass}-day-type">${day.typeCN || day.type}</span>
        `;
      }

      item.addEventListener('click', () => {
        onSelect(day);
      });
      daysEl.appendChild(item);
    });

    monthEl.appendChild(hdr);
    monthEl.appendChild(daysEl);
    container.appendChild(monthEl);
  });
}

function renderSidebar() {
  buildArchiveTree(DOM.sidebarContent, 'sidebar', day => {
    selectDate(day);
  });
}

function renderDrawer() {
  buildArchiveTree(DOM.drawerContent, 'drawer', day => {
    selectDate(day);
    closeDrawer();
  });
}

function refreshArchiveActiveState() {
  // 更新侧边栏选中态
  DOM.sidebarContent.querySelectorAll('.sidebar-day-item').forEach(el => {
    const monthEl = el.closest('.sidebar-month');
    if (!monthEl) return;
    // 找到对应 day
    el.classList.remove('active');
  });
  // 简单重建
  renderSidebar();
  renderDrawer();
}

/* ============================================================
   10. 渲染分类 Tab
   ============================================================ */

function renderCategoryTabs(parsed) {
  DOM.categoryTabs.innerHTML = '';

  // 全部 Tab
  const allTab = document.createElement('button');
  allTab.className = 'cat-tab' + (state.currentCat === 'all' ? ' active' : '');
  allTab.dataset.cat = 'all';
  allTab.innerHTML = '<span class="tab-emoji">📰</span>全部';
  allTab.addEventListener('click', () => selectCategory('all'));
  DOM.categoryTabs.appendChild(allTab);

  // 有内容的分类 Tab
  if (parsed) {
    parsed.categories.forEach((cat, idx) => {
      if (cat.items.length === 0) return;
      const tab = document.createElement('button');
      tab.className = 'cat-tab' + (state.currentCat === cat.catKey ? ' active' : '');
      tab.dataset.cat = cat.catKey;
      tab.innerHTML = `<span class="tab-emoji">${cat.catEmoji}</span>${cat.catName.substring(0, 6)}`;
      tab.addEventListener('click', () => selectCategory(cat.catKey));
      DOM.categoryTabs.appendChild(tab);
    });
  } else {
    // 无数据时显示完整列表
    CATEGORIES.forEach(cat => {
      const tab = document.createElement('button');
      tab.className = 'cat-tab' + (state.currentCat === cat.key ? ' active' : '');
      tab.dataset.cat = cat.key;
      tab.innerHTML = `<span class="tab-emoji">${cat.emoji}</span>${cat.name.substring(0, 6)}`;
      tab.addEventListener('click', () => selectCategory(cat.key));
      DOM.categoryTabs.appendChild(tab);
    });
  }
}

function selectCategory(catKey) {
  state.currentCat = catKey;
  // 更新 tab 样式
  DOM.categoryTabs.querySelectorAll('.cat-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.cat === catKey);
  });
  // 滚到顶
  if (catKey !== 'all') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // 过滤新闻卡片 & Banner
  DOM.newsList.querySelectorAll('.news-card, .cat-banner').forEach(el => {
    if (catKey === 'all' || el.dataset.catKey === catKey) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
  // 切换到"全部"时重新挂载滚动联动
  setTimeout(() => {
    if (state._attachSpyObserver) state._attachSpyObserver();
  }, 150);
}

/* ============================================================
   11. 渲染要点速览
   ============================================================ */

function renderGlance(parsed) {
  if (!parsed || parsed.glance.length === 0) {
    DOM.glanceSection.style.display = 'none';
    return;
  }
  DOM.glanceSection.style.display = '';
  DOM.glanceGrid.innerHTML = '';

  parsed.glance.forEach(g => {
    const catIdx = CATEGORIES.findIndex(c => c.key === g.catKey);
    const card = document.createElement('div');
    card.className = 'glance-card';
    card.dataset.catKey = g.catKey;
    card.innerHTML = `
      <div class="glance-emoji">${g.emoji}</div>
      <div class="glance-category">${CATEGORIES[catIdx >= 0 ? catIdx : 0].name}</div>
      <div class="glance-keyword">${escapeHtml(g.keyword)}</div>
    `;
    card.addEventListener('click', () => selectCategory(g.catKey));
    DOM.glanceGrid.appendChild(card);
  });
}

/* ============================================================
   12. 渲染新闻卡片
   ============================================================ */

function renderNewsList(parsed, dateEntry) {
  DOM.newsList.innerHTML = '';
  if (!parsed || parsed.categories.length === 0) {
    DOM.newsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">该日期暂无新闻内容</div>
      </div>`;
    return;
  }

  // 日期标题
  const dateHeader = document.createElement('div');
  dateHeader.className = 'date-page-header';
  const d = parseDateStr(dateEntry.date);
  dateHeader.innerHTML = `
    <div class="date-page-title">${d.year}年${d.month}月${d.day}日 ${d.weekday}</div>
    <div class="date-page-meta">${dateEntry.typeCN || '早间'}新闻简报</div>
  `;
  DOM.newsList.appendChild(dateHeader);

  // 逐分类渲染，在每个分类第一条前插入分类 Banner
  parsed.categories.forEach((cat, catIdx) => {
    if (cat.items.length === 0) return;
    const badgeClass = 'badge-' + Math.min(catIdx, 15);

    // 分类 Banner
    const banner = buildCatBanner(cat, catIdx);
    DOM.newsList.appendChild(banner);

    cat.items.forEach((item, itemIdx) => {
      const card = buildNewsCard(item, cat, badgeClass, dateEntry);
      DOM.newsList.appendChild(card);
    });
  });

  // 应用当前分类过滤
  selectCategory(state.currentCat);

  // 重新挂载滚动侦测
  setTimeout(() => {
    if (state._attachSpyObserver) state._attachSpyObserver();
  }, 100);
}

/* ============================================================
   分类 Banner（分类连接处简介）
   ============================================================ */

function buildCatBanner(cat, catIdx) {
  const banner = document.createElement('div');
  banner.className = 'cat-banner';
  banner.dataset.catKey = cat.catKey;

  // 从 CATEGORIES 查出 desc
  const meta = CATEGORIES.find(c => c.key === cat.catKey) || {};
  const desc = meta.desc || '';
  const count = cat.items.length;

  banner.innerHTML = `
    <div class="cat-banner-left">
      <span class="cat-banner-emoji">${cat.catEmoji}</span>
      <div class="cat-banner-info">
        <span class="cat-banner-name">${cat.catName}</span>
        <span class="cat-banner-desc">${desc}</span>
      </div>
    </div>
    <span class="cat-banner-count">${count} 条</span>
  `;
  return banner;
}

function buildNewsCard(item, cat, badgeClass, dateEntry) {
  const card = document.createElement('div');
  card.className = 'news-card';
  card.dataset.catKey = cat.catKey;

  const d = parseDateStr(dateEntry.date);
  const dateStr = `${d.month}/${d.day}`;

  card.innerHTML = `
    <div class="news-card-header">
      <div class="card-meta">
        <span class="card-category-badge ${badgeClass}">${cat.catEmoji} ${cat.catName}</span>
        <span class="card-date">${dateStr}</span>
      </div>
      <div class="card-title">${escapeHtml(item.title)}</div>
      <div class="card-summary">${escapeHtml(item.summary)}</div>
      <div class="card-footer">
        <span class="card-source">${escapeHtml(item.source)}</span>
        <span class="card-toggle">展开 <span class="toggle-arrow">▼</span></span>
      </div>
    </div>
    <div class="news-card-body">
      <div class="news-card-body-inner">
        <div class="md-content" data-raw="${encodeURIComponent(item.rawMd)}"></div>
      </div>
    </div>
  `;

  // 点击展开/收起
  card.querySelector('.news-card-header').addEventListener('click', () => {
    const isExpanded = card.classList.toggle('expanded');
    const mdEl = card.querySelector('.md-content');
    if (isExpanded && !mdEl.dataset.rendered) {
      // 懒渲染 Markdown
      let raw = decodeURIComponent(mdEl.dataset.raw);

      // ── 预处理：强制在各类小标题行前后插入空行，确保 marked 独立成段 ──

      // 1. **🔥 核心事件：**（280-320字） 这类：整行是 **xxx** 加可选括号注释
      raw = raw.replace(
        /(^|\n)(\*\*[^\n*]{1,40}\*\*[^\n]{0,30})(\n)(?!\n)/g,
        '$1$2\n\n'
      );

      // 2. 📌 出台背景：... 每个 📌 行独立成段
      raw = raw.replace(/(^|\n)(📌[^\n]+)/g, '\n\n$2');

      // 3. AI分析段内的子项：🔮 💡 🎯 📊 ⚠️ 开头的行也独立成段
      raw = raw.replace(
        /(^|\n)([🔮📊⚠️💡🎯][^\n]+)/gu,
        '\n\n$2'
      );

      mdEl.innerHTML = marked.parse(raw);

      // ── 后处理：给独立小标题段落加 section-label 样式 ──
      // 渲染后，段落内容 = <strong>小标题</strong> + 可选的（xx字）注释
      mdEl.querySelectorAll('p').forEach(p => {
        const html = p.innerHTML.trim();
        const text = p.textContent.trim();

        // 小节标题：以 <strong> 开头，strong 外只剩注释字符
        const afterStrong = html.replace(/^<strong>[^]*?<\/strong>/, '').trim();
        const isLabel = html.startsWith('<strong>') &&
          /^[\s（）()\d\-–—至字以内]*$/.test(afterStrong);
        if (isLabel) {
          p.classList.add('section-label');
          return;
        }

        // 📌 要点行
        if (text.startsWith('📌')) {
          p.classList.add('pin-item');
          return;
        }

        // 🔮📊⚠️💡🎯 AI分析子项行
        if (/^[🔮📊⚠️💡🎯]/u.test(text)) {
          p.classList.add('analysis-item');
        }
      });

      mdEl.dataset.rendered = '1';
    }
    card.querySelector('.card-toggle').innerHTML =
      isExpanded
        ? '收起 <span class="toggle-arrow" style="transform:rotate(180deg)">▼</span>'
        : '展开 <span class="toggle-arrow">▼</span>';
  });

  return card;
}

/* ============================================================
   13. 选择日期（核心流程）
   ============================================================ */

async function selectDate(dayEntry) {
  if (state.isLoading) return;
  state.isLoading  = true;
  state.currentDate = dayEntry.date;
  state.currentType = dayEntry.type;

  // 更新 UI 选中态
  DOM.dateStrip.querySelectorAll('.date-btn').forEach(b => {
    b.classList.toggle('active',
      b.dataset.date === dayEntry.date && b.dataset.type === dayEntry.type);
  });

  // 重置分类
  state.currentCat = 'all';

  // 显示骨架屏
  DOM.newsList.innerHTML = '';
  DOM.skeleton.style.display = '';
  DOM.newsList.appendChild(DOM.skeleton);
  DOM.glanceSection.style.display = 'none';
  DOM.todayHeadline.style.display = 'none';

  // 加载数据
  const parsed = await loadNewsForDate(dayEntry);

  // 隐藏骨架屏
  DOM.skeleton.remove();
  state.isLoading = false;

  if (!parsed) {
    DOM.newsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">新闻加载失败，请检查网络</div>
      </div>`;
    return;
  }

  // 渲染
  renderCategoryTabs(parsed);
  renderGlance(parsed);
  renderNewsList(parsed, dayEntry);

  // 渲染 headline
  if (parsed.headline) {
    DOM.headlineText.textContent = parsed.headline;
    DOM.todayHeadline.style.display = 'flex';
  }

  // 刷新归档选中态
  refreshArchiveActiveState();

  // 滚动到顶
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   14. 归档抽屉
   ============================================================ */

function openDrawer() {
  renderDrawer();
  DOM.drawerOverlay.classList.add('open');
  DOM.archiveDrawer.classList.add('open');
  document.body.style.overflow = 'hidden';
  // 设置底部 nav 状态
  setNavActive('archive');
}

function closeDrawer() {
  DOM.drawerOverlay.classList.remove('open');
  DOM.archiveDrawer.classList.remove('open');
  document.body.style.overflow = '';
  setNavActive('today');
}

/* ============================================================
   15. 搜索面板
   ============================================================ */

function openSearch() {
  DOM.searchPanel.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => DOM.searchInput.focus(), 300);
  setNavActive('search');
}

function closeSearch() {
  DOM.searchPanel.classList.remove('open');
  document.body.style.overflow = '';
  setNavActive('today');
  DOM.searchInput.value = '';
  DOM.searchResults.innerHTML = '<div class="search-placeholder">输入关键词开始搜索</div>';
}

let searchTimer = null;
function handleSearch(query) {
  clearTimeout(searchTimer);
  if (!query.trim()) {
    DOM.searchResults.innerHTML = '<div class="search-placeholder">输入关键词开始搜索</div>';
    return;
  }
  searchTimer = setTimeout(() => doSearch(query.trim()), 300);
}

async function doSearch(query) {
  DOM.searchResults.innerHTML = '<div class="loading-text">搜索中...</div>';

  // 确保已加载所有新闻到缓存
  await buildSearchIndex();

  const kw = query.toLowerCase();
  const results = [];
  for (const item of state.allNews) {
    if (item.title.toLowerCase().includes(kw) ||
        item.summary.toLowerCase().includes(kw)) {
      results.push(item);
    }
  }

  if (results.length === 0) {
    DOM.searchResults.innerHTML = `<div class="search-no-result">没有找到"${escapeHtml(query)}"相关新闻</div>`;
    return;
  }

  DOM.searchResults.innerHTML = '';
  results.slice(0, 50).forEach(item => {
    const el = document.createElement('div');
    el.className = 'search-result-item';
    el.innerHTML = `
      <div class="search-result-meta">
        <span class="card-category-badge badge-${item.catIdx}" style="font-size:.7rem;padding:2px 7px">
          ${item.catEmoji} ${item.catName}
        </span>
        <span class="search-result-date">${formatDateFull(item.date)}</span>
      </div>
      <div class="search-result-title">${highlight(escapeHtml(item.title), escapeHtml(query))}</div>
      <div class="search-result-summary">${highlight(escapeHtml(item.summary), escapeHtml(query))}</div>
    `;
    el.addEventListener('click', async () => {
      closeSearch();
      // 找到对应 dayEntry
      const dayEntry = findDayEntry(item.date);
      if (dayEntry) await selectDate(dayEntry);
    });
    DOM.searchResults.appendChild(el);
  });
}

async function buildSearchIndex() {
  if (state.allNews.length > 0) return;
  if (!state.index) return;

  for (const month of state.index.months) {
    for (const day of month.days) {
      const key = day.date + '_' + day.type;
      let parsed = state.cache[key];
      if (!parsed) {
        parsed = await loadNewsForDate(day);
      }
      if (!parsed) continue;
      parsed.categories.forEach((cat, catIdx) => {
        cat.items.forEach(item => {
          state.allNews.push({
            date:    day.date,
            title:   item.title,
            summary: item.summary,
            catKey:  cat.catKey,
            catEmoji: cat.catEmoji,
            catName: cat.catName,
            catIdx:  Math.min(catIdx, 15),
          });
        });
      });
    }
  }
}

function findDayEntry(datestr) {
  if (!state.index) return null;
  for (const m of state.index.months) {
    for (const d of m.days) {
      if (d.date === datestr) return d;
    }
  }
  return null;
}

function highlight(text, kw) {
  if (!kw) return text;
  const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return text.replace(re, m => `<span class="search-highlight">${m}</span>`);
}

/* ============================================================
   16. 底部 Nav 状态
   ============================================================ */

function setNavActive(tab) {
  [DOM.navArchive, DOM.navToday, DOM.navSearch].forEach(el => el.classList.remove('active'));
  if (tab === 'archive') DOM.navArchive.classList.add('active');
  else if (tab === 'search') DOM.navSearch.classList.add('active');
  else DOM.navToday.classList.add('active');
}

/* ============================================================
   17. 辅助函数
   ============================================================ */

function parseDateStr(datestr) {
  const year    = datestr.substring(0,4);
  const month   = parseInt(datestr.substring(4,6));
  const day     = parseInt(datestr.substring(6,8));
  const d       = new Date(parseInt(year), month - 1, day);
  const days    = ['周日','周一','周二','周三','周四','周五','周六'];
  return { year, month, day, weekday: days[d.getDay()] };
}

function formatDateFull(datestr) {
  const d = parseDateStr(datestr);
  return `${d.year}/${d.month}/${d.day}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError(msg) {
  DOM.newsList.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">😢</div>
      <div class="empty-state-text">${escapeHtml(msg)}</div>
    </div>`;
}

/* ============================================================
   18. 侧边栏搜索（桌面端）
   ============================================================ */

function initSidebarSearch() {
  if (!DOM.sidebarSearch) return;
  let t = null;
  DOM.sidebarSearch.addEventListener('input', e => {
    clearTimeout(t);
    t = setTimeout(() => doSearch(e.target.value), 300);
  });
  DOM.sidebarSearch.addEventListener('focus', () => {
    // 桌面端搜索直接在 searchResults 展示（可扩展）
  });
}

/* ============================================================
   19. 主初始化
   ============================================================ */

async function init() {
  // 主题
  initTheme();

  // 离线状态监测
  initOfflineDetection();

  // 绑定主题切换
  DOM.btnTheme.addEventListener('click', toggleTheme);

  // 绑定英语学习入口
  if (DOM.btnEnglish) {
    DOM.btnEnglish.addEventListener('click', () => {
      window.location.href = 'englishStudy/index.html';
    });
  }

  // 绑定底部导航
  DOM.navArchive.addEventListener('click', openDrawer);
  DOM.navToday.addEventListener('click', () => {
    closeDrawer();
    closeSearch();
    setNavActive('today');
  });
  DOM.navSearch.addEventListener('click', openSearch);

  // 绑定抽屉关闭
  DOM.btnCloseDrawer.addEventListener('click', closeDrawer);
  DOM.drawerOverlay.addEventListener('click', closeDrawer);

  // 抽屉手势下划关闭（简单实现）
  let touchStartY = 0;
  DOM.archiveDrawer.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  DOM.archiveDrawer.addEventListener('touchend', e => {
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (dy > 80) closeDrawer();
  }, { passive: true });

  // 绑定搜索
  DOM.btnSearchBack.addEventListener('click', closeSearch);
  DOM.searchInput.addEventListener('input', e => handleSearch(e.target.value));
  DOM.searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });

  // 侧边栏搜索
  initSidebarSearch();

  // 加载索引
  const ok = await loadIndex();
  if (!ok) return;

  // 通知 SW 后台预缓存最近 20 天
  schedulePrecache();

  // 渲染日期条
  renderDateStrip();

  // 渲染侧边栏
  renderSidebar();

  // 初始化分类 Tab（先不加载内容）
  renderCategoryTabs(null);

  // 滚动联动：滚动时自动高亮当前可见分类的 Tab
  initScrollSpy();

  // Tab 鼠标拖拽横滑（桌面端）
  initTabDrag();

  // 加载最新一天的新闻
  const latestDay = getLatestDay();
  if (latestDay) {
    await selectDate(latestDay);
  } else {
    showError('暂无新闻数据');
  }
}

/* ============================================================
   Tab 鼠标拖拽横滑（桌面端）
   ============================================================ */

/* ============================================================
   鼠标拖拽横滑（桌面端）—— 通用函数
   ============================================================ */

function makeDraggable(el) {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let moved = false;

  el.addEventListener('mousedown', e => {
    isDown = true;
    moved = false;
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  });

  el.addEventListener('mouseleave', () => {
    isDown = false;
    el.style.cursor = '';
    el.style.userSelect = '';
  });

  el.addEventListener('mouseup', () => {
    isDown = false;
    el.style.cursor = '';
    el.style.userSelect = '';
  });

  el.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - startX;
    if (Math.abs(walk) > 3) moved = true;
    el.scrollLeft = scrollLeft - walk;
  });

  // 拖拽超过阈值时拦截 click，防止误触切换
  el.addEventListener('click', e => {
    if (moved) {
      e.stopPropagation();
      moved = false;
    }
  }, true);
}

function initTabDrag() {
  makeDraggable(DOM.categoryTabs);
  makeDraggable(DOM.dateStrip);
}

/* ============================================================
   滚动联动：滚动时自动高亮当前可见分类的 Tab
   ============================================================ */

function initScrollSpy() {
  // 计算 sticky header + date-strip + category-tabs 的总高度作为 rootMargin
  // 手机端：header(56) + date-strip(48) + cat-tabs(约46) = ~150px
  // 用 IntersectionObserver 监测每张卡片的顶部进入/离开视口
  let spyObserver = null;
  let lastActiveCat = 'all';

  function attachObserver() {
    if (spyObserver) {
      spyObserver.disconnect();
    }

    // 只在"全部"模式下联动，单分类模式不需要联动
    if (state.currentCat !== 'all') return;

    const cards = Array.from(DOM.newsList.querySelectorAll('.news-card[data-cat-key]'))
      .filter(c => c.style.display !== 'none');

    if (cards.length === 0) return;

    // 使用 IntersectionObserver，当卡片顶部穿过视口上边缘往下 ~160px 时触发
    spyObserver = new IntersectionObserver(entries => {
      // 找到所有"正在视口内"的卡片中，位置最靠上的那张
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible.length > 0) {
        const topCard = visible[0].target;
        const catKey = topCard.dataset.catKey;
        if (catKey && catKey !== lastActiveCat) {
          lastActiveCat = catKey;
          highlightTabByCat(catKey);
        }
      }
    }, {
      // rootMargin 负值：卡片进入视口上方 160px 以下区域才算"当前可见"
      rootMargin: '-160px 0px -40% 0px',
      threshold: 0,
    });

    cards.forEach(c => spyObserver.observe(c));
  }

  // 暴露方法，让 renderNewsList / selectCategory 调用重新挂载
  state._attachSpyObserver = attachObserver;
}

function highlightTabByCat(catKey) {
  // 更新 Tab 高亮（不触发过滤，只改样式）
  DOM.categoryTabs.querySelectorAll('.cat-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.cat === catKey);
  });
  // 让对应 Tab 滚动到可见
  const activeTab = DOM.categoryTabs.querySelector(`.cat-tab[data-cat="${CSS.escape(catKey)}"]`);
  if (activeTab) {
    activeTab.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }
}

function getLatestDay() {
  if (!state.index || !state.index.months.length) return null;
  const firstMonth = state.index.months[0];
  if (!firstMonth.days.length) return null;
  return firstMonth.days[0];
}

/* ============================================================
   20. 启动
   ============================================================ */

document.addEventListener('DOMContentLoaded', init);
