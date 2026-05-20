/* ============================================
   早间新闻浏览器 - 主脚本
   ============================================ */

(function () {
    'use strict';

    // --- State ---
    let indexData = null;
    let currentDate = null;
    let currentCategory = null;
    const contentCache = new Map();  // "date|file" → html

    // --- DOM refs ---
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    const sidebar = $('#sidebar');
    const menuToggle = $('#menuToggle');
    const sidebarClose = $('#sidebarClose');
    const overlay = $('#overlay');
    const dateList = $('#dateList');
    const dateSearch = $('#dateSearch');
    const mobileDateTrack = $('#mobileDateTrack');
    const mobileCategoryTrack = $('#mobileCategoryTrack');
    const welcome = $('#welcome');
    const dateView = $('#dateView');
    const dateTitle = $('#dateTitle');
    const prevDay = $('#prevDay');
    const nextDay = $('#nextDay');
    const categoryTabs = $('#categoryTabs');
    const newsContent = $('#newsContent');
    const loading = $('#loading');
    const todayBadge = $('#todayBadge');
    const welcomeStats = $('#welcomeStats');
    const themeToggle = $('#themeToggle');
    const refreshBtn = $('#refreshBtn');

    // ==========================================
    //  缓存工具
    // ==========================================
    function cacheGet(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const { data, expiry } = JSON.parse(raw);
            if (Date.now() > expiry) { localStorage.removeItem(key); return null; }
            return data;
        } catch { return null; }
    }
    function cacheSet(key, data, ttl) {
        localStorage.setItem(key, JSON.stringify({ data, expiry: Date.now() + ttl }));
    }

    // ==========================================
    //  初始化
    // ==========================================
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const resp = await fetch('news-index.json?v=' + Date.now());
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            indexData = await resp.json();
            console.log('[早间新闻] 索引加载成功, 日期数:', indexData.dates.length, 
                        '首个日期:', indexData.dates[0]?.date, 
                        'has_multi:', indexData.dates[0]?.has_multi,
                        '分类数:', indexData.dates[0]?.categories?.length);
        renderDateList();
        renderMobileStrip();
        renderWelcomeStats();
        if (indexData.dates.length > 0) {
            try {
                await selectDate(indexData.dates[0].date);
                console.log('[早间新闻] 卡片数:', document.querySelectorAll('.news-card').length);
            } catch(e) {
                console.error('[早间新闻] selectDate 出错:', e);
            }
        }
        } catch (e) {
            newsContent.innerHTML = `
                <div class="error-msg">
                    <h3>⚠️ 数据加载失败</h3>
                    <p>无法加载 news-index.json，请确认文件存在且服务已启动。</p>
                    <p style="font-size:0.82rem;color:#999;margin-top:8px;">${e.message}</p>
                </div>`;
            return;
        }

        // 今日 badge
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const found = indexData.dates.find(d => d.date === todayStr);
        todayBadge.textContent = found ? '📌 今日有更新' : '';

        // 初始化主题
        initTheme();

        setupEventListeners();
    });

    // ==========================================
    //  渲染日期列表
    // ==========================================
    function renderDateList(filter) {
        if (!indexData || !indexData.months) return;

        let html = '';
        // 月份倒序（最新的在上面）
        for (let i = indexData.months.length - 1; i >= 0; i--) {
            const month = indexData.months[i];
            let dates = month.dates;
            if (filter) {
                dates = dates.filter(d => d.date.includes(filter));
            }
            if (dates.length === 0) continue;

            const monthLabel = month.month.slice(0, 4) + '年' + month.month.slice(4) + '月';
            // 最新月份默认展开，其余折叠
            const isFirst = (i === indexData.months.length - 1);
            html += `<div class="month-group ${isFirst ? '' : 'collapsed'}">
                <div class="month-label" role="button" tabindex="0">${isFirst ? '▼' : '▶'} ${monthLabel}</div>
                <div class="month-dates">`;

            for (const day of dates) {
                const active = currentDate === day.date ? 'active' : '';
                const typeStr = day.has_multi ? '📂' : (day.type === '周报' ? '📊' : '📄');
                const countStr = day.has_multi
                    ? `<span class="date-count">${day.categories.length}篇</span>`
                    : `<span class="date-count">${day.type || '早间'}</span>`;

                html += `<div class="date-item ${active}" data-date="${day.date}">
                    <span class="date-text">${typeStr} ${day.date}</span>
                    ${countStr}
                </div>`;
            }
            html += '</div>'; // month-dates
            html += '</div>'; // month-group
        }
        dateList.innerHTML = html || '<div style="padding:20px;text-align:center;color:#666;">无匹配日期</div>';
    }

    // ==========================================
    //  渲染移动端日期条
    // ==========================================
    function renderMobileStrip() {
        if (!indexData || !mobileDateTrack) return;
        let html = '';
        // 最多显示30个最近的日期
        const maxChips = Math.min(30, indexData.dates.length);
        for (let i = 0; i < maxChips; i++) {
            const day = indexData.dates[i];
            const active = currentDate === day.date ? 'active' : '';
            const label = day.date.slice(5); // MM-DD
            html += `<button class="mobile-date-chip ${active}" data-date="${day.date}">${label}</button>`;
        }
        mobileDateTrack.innerHTML = html;
    }

    function renderMobileCategories(categories) {
        if (!mobileCategoryTrack) return;
        if (!categories || categories.length === 0) {
            mobileCategoryTrack.innerHTML = '';
            return;
        }
        let html = '';
        for (const cat of categories) {
            const active = currentCategory === cat.id ? 'active' : '';
            html += `<button class="mobile-category-chip ${active}" data-cat-id="${cat.id}" data-file="${cat.file}">
                ${cat.icon} ${cat.name}
            </button>`;
        }
        mobileCategoryTrack.innerHTML = html;
    }

    function updateMobileStrip(dateStr) {
        const chips = mobileDateTrack.querySelectorAll('.mobile-date-chip');
        chips.forEach(ch => {
            ch.classList.toggle('active', ch.dataset.date === dateStr);
            if (ch.dataset.date === dateStr) {
                // 滚动到可见位置
                ch.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        });
    }

    function updateMobileCategoryStrip(catId) {
        if (!mobileCategoryTrack) return;
        const chips = mobileCategoryTrack.querySelectorAll('.mobile-category-chip');
        chips.forEach(ch => {
            ch.classList.toggle('active', ch.dataset.catId === catId);
        });
    }

    // ==========================================
    //  渲染欢迎页统计
    // ==========================================
    function renderWelcomeStats() {
        if (!indexData) return;
        const totalDays = indexData.dates.length;
        const subdirCount = indexData.dates.filter(d => d.has_multi).length;
        const flatCount = totalDays - subdirCount;
        welcomeStats.innerHTML = `
            <div class="stat">
                <span class="stat-num">${totalDays}</span>
                <span class="stat-label">总天数</span>
            </div>
            <div class="stat">
                <span class="stat-num">${subdirCount}</span>
                <span class="stat-label">多板块格式</span>
            </div>
            <div class="stat">
                <span class="stat-num">${flatCount}</span>
                <span class="stat-label">单文件格式</span>
            </div>
        `;
    }

    // ==========================================
    //  选择日期
    // ==========================================
    async function selectDate(dateStr) {
        const day = indexData.dates.find(d => d.date === dateStr);
        if (!day) return;

        currentDate = dateStr;
        currentCategory = null;

        // 更新侧边栏高亮
        $$('.date-item').forEach(el => el.classList.remove('active'));
        const activeEl = document.querySelector(`.date-item[data-date="${dateStr}"]`);
        if (activeEl) activeEl.classList.add('active');

        // 切换视图
        welcome.style.display = 'none';
        dateView.style.display = 'block';

        dateTitle.textContent = `${dateStr} 早间新闻`;

        // 更新前后按钮状态
        const idx = indexData.dates.findIndex(d => d.date === dateStr);
        prevDay.disabled = idx >= indexData.dates.length - 1;
        nextDay.disabled = idx <= 0;

        prevDay.dataset.target = indexData.dates[idx + 1]?.date || '';
        nextDay.dataset.target = indexData.dates[idx - 1]?.date || '';

        if (day.has_multi) {
            // 子目录格式：加载所有板块为卡片
            categoryTabs.style.display = '';
            renderCategoryTabs(day.categories);
            renderMobileCategories(day.categories);
            await loadAllCategories(dateStr, day.categories, day.path);
        } else {
            // flat 格式
            categoryTabs.style.display = 'none';
            renderMobileCategories(null);
            await loadNews(dateStr, null, day.path);
        }

        // 更新移动端日期条高亮
        updateMobileStrip(dateStr);

        // 移动端关闭侧边栏
        closeSidebar();
    }

    // ==========================================
    //  渲染分类标签
    // ==========================================
    function renderCategoryTabs(categories) {
        let html = '';
        for (const cat of categories) {
            const active = currentCategory === cat.id ? 'active' : '';
            html += `<button class="category-tab ${active}" data-cat-id="${cat.id}" data-file="${cat.file}">
                ${cat.icon} <span class="cat-name">${cat.name}</span>
            </button>`;
        }
        categoryTabs.innerHTML = html;
    }

    function setActiveCategory(catId) {
        $$('.category-tab').forEach(el => el.classList.remove('active'));
        const tab = document.querySelector(`.category-tab[data-cat-id="${catId}"]`);
        if (tab) tab.classList.add('active');
    }

    // ==========================================
    //  加载新闻内容
    // ==========================================
    async function loadNews(dateStr, file, path) {
        loading.style.display = 'flex';
        newsContent.innerHTML = '';

        const cacheKey = `${dateStr}|${path}`;

        try {
            // 检查缓存
            let cachedHtml = null;
            if (contentCache.has(cacheKey)) {
                cachedHtml = contentCache.get(cacheKey);
            } else {
                const lsCached = cacheGet('flat_' + cacheKey);
                if (lsCached) {
                    contentCache.set(cacheKey, lsCached);
                    cachedHtml = lsCached;
                }
            }

            if (cachedHtml) {
                // 使用缓存
                loading.style.display = 'none';
                newsContent.innerHTML = `
                    <div class="news-card">
                        <div class="card-header">
                            <span class="card-title">📄 ${path.split('/').pop()}</span>
                            <button class="card-toggle" aria-label="收起/展开" title="收起/展开">−</button>
                        </div>
                        <div class="card-body"></div>
                    </div>`;
                const cardBody = newsContent.querySelector('.card-body');
                cardBody.innerHTML = cachedHtml;
                addNewsToggle(cardBody);
                newsContent.scrollTop = 0;
                return;
            }

            // 无缓存，从网络加载
            let url;
            if (file) {
                // 子目录格式：news/202605/20260514/01_今日头条.md
                url = `news/${path}/${file}`;
            } else {
                // flat 格式：news/202605/20260501_早间.md
                url = `news/${path}`;
            }

            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
            const markdown = await resp.text();

            const html = renderMarkdown(markdown);

            // 缓存（内存 + localStorage，24小时）
            contentCache.set(cacheKey, html);
            cacheSet('flat_' + cacheKey, html, 86400000);

            loading.style.display = 'none';
            // flat 文件也包裹为卡片
            newsContent.innerHTML = `
                <div class="news-card">
                    <div class="card-header">
                        <span class="card-title">📄 ${path.split('/').pop()}</span>
                        <button class="card-toggle" aria-label="收起/展开" title="收起/展开">−</button>
                    </div>
                    <div class="card-body"></div>
                </div>`;
            const cardBody = newsContent.querySelector('.card-body');
            cardBody.innerHTML = html;
            addNewsToggle(cardBody);
            newsContent.scrollTop = 0;

        } catch (e) {
            loading.style.display = 'none';
            newsContent.innerHTML = `
                <div class="error-msg">
                    <h3>⚠️ 加载失败</h3>
                    <p>无法加载新闻内容。</p>
                    <p style="font-size:0.82rem;color:#999;margin-top:8px;">${e.message}</p>
                </div>`;
        }
    }

    // ==========================================
    //  加载所有分类为卡片
    // ==========================================
    async function loadAllCategories(dateStr, categories, basePath) {
        newsContent.innerHTML = '';

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const cardId = `card-${cat.id}`;
            const isFirst = (i === 0);
            const cardHtml = `
                <div class="news-card" id="${cardId}" data-loaded="0" data-catfile="${cat.file}" data-basepath="${basePath}" data-catid="${cat.id}" data-caticon="${cat.icon}" data-catname="${cat.name}">
                    <div class="card-header">
                        <span class="card-title">${cat.icon} ${cat.name}</span>
                        <button class="card-toggle" aria-label="收起/展开" title="收起/展开">−</button>
                    </div>
                    <div class="card-body">
                        ${isFirst ? '<div class="loading" style="display:flex;"><div class="spinner"></div><p>加载中...</p></div>' : '<div class="lazy-placeholder"><div class="spinner" style="width:18px;height:18px;margin:0 auto 6px;"></div><p>等待加载</p></div>'}
                    </div>
                </div>`;
            newsContent.insertAdjacentHTML('beforeend', cardHtml);
        }

        // 先加载第一个卡片
        await lazyLoadCard('card-01', dateStr);

        // 第一个加载完后，自动加载其余所有卡片
        for (let i = 1; i < categories.length; i++) {
            const cat = categories[i];
            const cardId = `card-${cat.id}`;
            // 改为显示加载中
            const card = document.getElementById(cardId);
            if (card) {
                const body = card.querySelector('.card-body');
                body.innerHTML = '<div class="loading" style="display:flex;padding:10px 0;"><div class="spinner"></div><p>加载中...</p></div>';
            }
            // 异步加载，不阻塞后续
            lazyLoadCard(cardId, dateStr);
        }

        // 设置滚动联动观察器
        setupCategoryScrollSpy();
    }

    let scrollSpyObserver = null;
    function setupCategoryScrollSpy() {
        // 断开旧观察器
        if (scrollSpyObserver) scrollSpyObserver.disconnect();

        const cards = document.querySelectorAll('.news-card');
        if (cards.length === 0) return;

        scrollSpyObserver = new IntersectionObserver((entries) => {
            let bestEntry = null;
            let bestRatio = 0;
            for (const entry of entries) {
                if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
                    bestRatio = entry.intersectionRatio;
                    bestEntry = entry;
                }
            }
            if (!bestEntry) return;

            const catId = bestEntry.target.dataset.catid;
            if (!catId || catId === currentCategory) return;

            currentCategory = catId;
            // 更新桌面分类标签
            setActiveCategory(catId);
            // 更新移动端分类条
            updateMobileCategoryStrip(catId);
            // 滚动分类标签让当前标签可见
            const activeTab = document.querySelector(`.category-tab[data-cat-id="${catId}"]`);
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }, {
            root: null,
            rootMargin: '-80px 0px -40% 0px',
            threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5]
        });

        cards.forEach(card => scrollSpyObserver.observe(card));
    }

    async function lazyLoadCard(cardId, dateStr) {
        const card = document.getElementById(cardId);
        if (!card) return;
        if (card.dataset.loaded === '1' || card.dataset.loading === '1') return;
        card.dataset.loading = '1';

        const catFile = card.dataset.catfile;
        const basePath = card.dataset.basepath;
        const catId = card.dataset.catid;
        const catName = card.dataset.catname;
        const cacheKey = `${dateStr}|${catFile}`;

        // 命中内存缓存
        if (contentCache.has(cacheKey)) {
            const body = card.querySelector('.card-body');
            body.innerHTML = contentCache.get(cacheKey);
            addNewsToggle(body);
            card.dataset.loading = '0';
            card.dataset.loaded = '1';
            return;
        }
        // 命中 localStorage 缓存（首卡）
        const lsKey = 'card_' + cacheKey;
        const lsCached = cacheGet(lsKey);
        if (lsCached) {
            contentCache.set(cacheKey, lsCached);
            const body = card.querySelector('.card-body');
            body.innerHTML = lsCached;
            addNewsToggle(body);
            card.dataset.loading = '0';
            card.dataset.loaded = '1';
            return;
        }

        const body = card.querySelector('.card-body');
        body.innerHTML = '<div class="loading" style="display:flex;"><div class="spinner"></div><p>加载中...</p></div>';

        try {
            const url = `news/${basePath}/${catFile}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const markdown = await resp.text();
            const html = renderMarkdown(markdown);

            // 缓存（内存 + localStorage，所有卡片都缓存24小时）
            contentCache.set(cacheKey, html);
            cacheSet('card_' + cacheKey, html, 86400000);
            body.innerHTML = html;
            addNewsToggle(body);
            card.dataset.loading = '0';
            card.dataset.loaded = '1';
        } catch (e) {
            body.innerHTML = `<div class="error-msg"><p>⚠️ ${catName} 加载失败</p></div>`;
        }
    }

    // ==========================================
    //  给每条新闻添加折叠按钮
    // ==========================================
    function addNewsToggle(container) {
        const h3s = container.querySelectorAll('h3');
        if (h3s.length === 0) return;

        h3s.forEach((h3, idx) => {
            // 创建包裹层
            const wrap = document.createElement('div');
            wrap.className = 'news-item-wrap';

            // 创建 header（标题行 + 按钮）
            const header = document.createElement('div');
            header.className = 'news-item-hdr';

            // 折叠按钮
            const btn = document.createElement('span');
            btn.className = 'news-item-btn';
            btn.textContent = '−';
            btn.setAttribute('role', 'button');
            btn.setAttribute('tabindex', '0');
            header.appendChild(btn);

            // 创建 body
            const itemBody = document.createElement('div');
            itemBody.className = 'news-item-bd';

            // 在 h3 之前插入 wrap，然后把 header + h3 + 后续兄弟移到 wrap
            h3.parentNode.insertBefore(wrap, h3);
            wrap.appendChild(header);

            // 先找到 h3 的下一个兄弟（在原始DOM中），再移动 h3
            let sib = h3.nextSibling;
            header.appendChild(h3);  // 把 h3 移进 header（此时 sib 仍是原始的下一个兄弟）

            // 将 h3 之后、下一个 h3 之前的所有兄弟移到 itemBody
            while (sib) {
                const next = sib.nextSibling;
                if (sib.nodeType === 1 && sib.tagName === 'H3') break;
                itemBody.appendChild(sib);
                sib = next;
            }
            wrap.appendChild(itemBody);

            // 默认折叠
            itemBody.style.display = 'none';
            btn.textContent = '+';
            wrap.classList.add('collapsed');

            // 点击切换
            const toggle = () => {
                const collapsed = itemBody.style.display === 'none';
                itemBody.style.display = collapsed ? 'block' : 'none';
                btn.textContent = collapsed ? '−' : '+';
                wrap.classList.toggle('collapsed', !collapsed);
            };
            header.addEventListener('click', (e) => {
                if (e.target.closest('.news-item-btn')) return;
                toggle();
            });
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle();
            });
        });
    }

    // ==========================================
    //  简易 Markdown → HTML 渲染器
    // ==========================================
    function renderMarkdown(md) {
        let html = md;

        // 转义 HTML 标签（避免冲突）
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // ⚠️ 用占位符保护代码块和行内代码，防止内部标记被二次解析
        const codeBlocks = [];
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            const idx = codeBlocks.length;
            codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
            return `%%%CODEBLOCK_${idx}%%%`;
        });
        const inlineCodes = [];
        html = html.replace(/`([^`]+)`/g, (_, code) => {
            const idx = inlineCodes.length;
            inlineCodes.push(`<code>${code}</code>`);
            return `%%%INLINECODE_${idx}%%%`;
        });

        // 水平分割线
        html = html.replace(/^---+\s*$/gm, '<hr>');

        // 引用块 (> ...)
        html = html.replace(/^&gt;\s*(.*)$/gm, (_, content) => {
            return `<blockquote><p>${content}</p></blockquote>`;
        });

        // 加粗 (**text**)
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // 斜体 (*text* 或 _text_)
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.+?)_/g, '<em>$1</em>');

        // 标题 (### 或 ## 或 #)
        html = html.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
        html = html.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
        html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
        html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
        html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

        // 无序列表 (- item 或 * item)
        html = html.replace(/^[\-\*]\s+(.*)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>(\s*<li>.*<\/li>)*)/g, '<ul>$1</ul>');

        // 有序列表 (1. item)
        html = html.replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>');

        // 表格 — 只在包含表头分隔符时处理（避免误匹配普通文本中的 |）
        if (/^\|.+\|\s*$/.test(html)) {
            html = html.replace(/\|(.+)\|/g, (match) => {
                if (match.includes('---')) return '';
                const cells = match.split('|').filter(c => c.trim());
                return '<tr><td>' + cells.join('</td><td>') + '</td></tr>';
            });
        }

        // 段落 (双换行)
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';

        // 清理嵌套标签
        html = html.replace(/<p>\s*<(ul|ol|li|h[1-5]|hr|pre|blockquote|table|tr)/g, '<$1');
        html = html.replace(/<\/(ul|ol|li|h[1-5]|hr|pre|blockquote|table|tr)>\s*<\/p>/g, '</$1>');
        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/<li><\/li>/g, '');

        // 空段落清理
        html = html.replace(/<p>\s*<br\s*\/?>\s*<\/p>/g, '');
        html = html.replace(/<p><\/p>/g, '');

        // 还原代码块占位符
        html = html.replace(/%%%CODEBLOCK_(\d+)%%%/g, (_, idx) => codeBlocks[parseInt(idx)]);
        html = html.replace(/%%%INLINECODE_(\d+)%%%/g, (_, idx) => inlineCodes[parseInt(idx)]);

        return html;
    }

    // ==========================================
    //  侧边栏控制
    // ==========================================
    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('show');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    // ==========================================
    //  主题切换
    // ==========================================
    function initTheme() {
        // 主题已在 HTML head 中同步初始化，此处只同步按钮图标
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    }

    function toggleTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            themeToggle.textContent = '🌙';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = '☀️';
        }
    }

    // ==========================================
    //  事件绑定
    // ==========================================
    function setupEventListeners() {
        // 隐身模式
        const stealthToggle = document.getElementById('stealthToggle');
        if (stealthToggle) {
            // 恢复上次状态
            if (localStorage.getItem('stealthMode') === 'on') {
                document.body.classList.add('stealth-mode');
                stealthToggle.classList.add('active');
                stealthToggle.textContent = '🙈';
            }
            stealthToggle.addEventListener('click', () => {
                document.body.classList.toggle('stealth-mode');
                const on = document.body.classList.contains('stealth-mode');
                stealthToggle.classList.toggle('active', on);
                stealthToggle.textContent = on ? '🙈' : '🙈';
                localStorage.setItem('stealthMode', on ? 'on' : 'off');
            });
        }

        // 主题切换
        themeToggle.addEventListener('click', toggleTheme);

        // 移动端日期芯片点击
        mobileDateTrack.addEventListener('click', (e) => {
            const chip = e.target.closest('.mobile-date-chip');
            if (chip && chip.dataset.date) {
                selectDate(chip.dataset.date);
            }
        });

        // 移动端分类芯片点击
        mobileCategoryTrack.addEventListener('click', (e) => {
            const chip = e.target.closest('.mobile-category-chip');
            if (!chip || !currentDate) return;
            const catId = chip.dataset.catId;
            if (!catId) return;
            // 高亮选中的分类
            updateMobileCategoryStrip(catId);
            // 滚动到对应的分类卡片
            const card = document.getElementById(`card-${catId}`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        // 刷新按钮
        refreshBtn.addEventListener('click', () => {
            // 清空所有 localStorage 数据
            localStorage.clear();
            // 清空内存缓存
            contentCache.clear();
            // 强制从服务器重新加载（加时间戳避免缓存）
            window.location.href = window.location.pathname + '?t=' + Date.now();
        });

        // 菜单切换
        menuToggle.addEventListener('click', openSidebar);
        sidebarClose.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);

        // 月份折叠/展开（委托）
        dateList.addEventListener('click', (e) => {
            const label = e.target.closest('.month-label');
            if (label) {
                const group = label.closest('.month-group');
                const wasCollapsed = group.classList.toggle('collapsed');
                // 仅替换第一个字符（箭头），保留月份文字
                const txt = label.textContent;
                label.textContent = (wasCollapsed ? '▶' : '▼') + txt.substring(1);
                return;
            }
            const item = e.target.closest('.date-item');
            if (item && item.dataset.date) {
                selectDate(item.dataset.date);
            }
        });

        // 日期搜索过滤
        dateSearch.addEventListener('input', (e) => {
            renderDateList(e.target.value.trim());
        });

        // 卡片收起/展开（委托）
        newsContent.addEventListener('click', (e) => {
            const header = e.target.closest('.card-header');
            if (!header) return;
            const card = header.closest('.news-card');
            if (!card) return;

            // 首次展开时懒加载
            const loaded = card.dataset.loaded;
            if (loaded === '0' && currentDate) {
                lazyLoadCard(card.id, currentDate);
            }

            const body = card.querySelector('.card-body');
            const btn = card.querySelector('.card-toggle');
            const isCollapsed = body.style.display === 'none';
            body.style.display = isCollapsed ? 'block' : 'none';
            btn.textContent = isCollapsed ? '−' : '+';
            card.classList.toggle('collapsed', !isCollapsed);
        });

        // 分类标签点击（委托）
        categoryTabs.addEventListener('click', async (e) => {
            const tab = e.target.closest('.category-tab');
            if (!tab || !currentDate) return;

            const catId = tab.dataset.catId;
            const file = tab.dataset.file;
            if (!file) return;

            const day = indexData.dates.find(d => d.date === currentDate);
            if (!day) return;

            if (day.has_multi) {
                // 多分类格式：滚动到对应卡片
                currentCategory = catId;
                setActiveCategory(catId);
                updateMobileCategoryStrip(catId);
                const card = document.getElementById(`card-${catId}`);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                // flat 格式：加载对应文件
                currentCategory = catId;
                setActiveCategory(catId);
                await loadNews(currentDate, file, day.path);
            }
        });

        // 分类标签鼠标拖拽滚动（含防误触）
        (function enableDragScroll(el) {
            if (!el) return;
            let isDown = false, startX, scrollLeft, dragged = false;
            el.addEventListener('mousedown', (e) => {
                isDown = true;
                dragged = false;
                el.classList.add('grabbing');
                startX = e.pageX - el.offsetLeft;
                scrollLeft = el.scrollLeft;
            });
            el.addEventListener('mouseleave', () => {
                isDown = false;
                el.classList.remove('grabbing');
            });
            el.addEventListener('mouseup', () => {
                isDown = false;
                el.classList.remove('grabbing');
                if (dragged) {
                    // 阻止 click 事件冒泡，避免拖拽后误触
                    const prevent = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
                    el.addEventListener('click', prevent, { once: true, capture: true });
                }
            });
            el.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - el.offsetLeft;
                const walk = (x - startX) * 1.5;
                if (Math.abs(walk) > 5) dragged = true;
                el.scrollLeft = scrollLeft - walk;
            });
        })(categoryTabs);

        // 前一天/后一天
        prevDay.addEventListener('click', () => {
            if (prevDay.dataset.target) selectDate(prevDay.dataset.target);
        });
        nextDay.addEventListener('click', () => {
            if (nextDay.dataset.target) selectDate(nextDay.dataset.target);
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeSidebar();
        });

        // 窗口 resize：大屏自动关闭遮罩
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                sidebar.classList.remove('open');
                overlay.classList.remove('show');
            }
        });

        // ==========================================
        //  移动端滚动隐藏/显示导航条（状态机）
        // ==========================================
        let lastScrollY_m = 0;
        let scrollTicking_m = false;
        let navHidden = false;
        let dirDist = 0;      // 当前方向累计滚动距离
        let scrollDir_m = 0;  // 1=下滚(隐藏), -1=上滚(显示)

        function setNav(hide) {
            const topbar = document.querySelector('.topbar');
            const ds = document.querySelector('.mobile-date-strip');
            const cs = document.querySelector('.mobile-category-strip');
            const ac = document.querySelector('.app-container');
            if (!topbar || !ds || !cs || !ac) return;
            if (hide) {
                const h = topbar.offsetHeight;
                topbar.style.transform = 'translateY(-100%)';
                ds.style.transform = `translateY(calc(-100% - ${h}px))`;
                cs.style.transform = `translateY(calc(-200% - ${h}px))`;
                ac.style.marginTop = '0';
            } else {
                topbar.style.transform = '';
                ds.style.transform = '';
                cs.style.transform = '';
                ac.style.marginTop = '';
            }
            navHidden = hide;
        }

        function handleMobileScroll() {
            if (window.innerWidth >= 768) return;

            const cy = window.scrollY;
            const delta = cy - lastScrollY_m;
            const atTop = cy <= 15;
            const atBot = cy + window.innerHeight >= document.body.scrollHeight - 15;

            // 顶部/底部 → 强制显示
            if (atTop || atBot) {
                if (navHidden) setNav(false);
                lastScrollY_m = cy; scrollDir_m = 0; dirDist = 0;
                return;
            }
            if (navHidden && delta > 0) {
                // 已隐藏且继续下滑 → 清零上行累计，防止手指抖动积累方向
                lastScrollY_m = cy; scrollDir_m = 0; dirDist = 0;
                return;
            }

            if (delta > 0) {
                // 正在下滑（用户上滑屏幕 → 朝隐藏方向）
                if (scrollDir_m === 1) dirDist += delta;
                else { scrollDir_m = 1; dirDist = delta; }
                if (dirDist > 15 && !navHidden) setNav(true);
            } else if (delta < 0) {
                // 正在上滑（用户下滑屏幕 → 朝显示方向）
                if (scrollDir_m === -1) dirDist += Math.abs(delta);
                else { scrollDir_m = -1; dirDist = Math.abs(delta); }
                // 需要较大幅度上滑才显示，避免抬起手指时的微小抖动触发
                if (dirDist > 50 && navHidden) setNav(false);
            }

            lastScrollY_m = cy;
        }

        window.addEventListener('scroll', () => {
            if (!scrollTicking_m) {
                window.requestAnimationFrame(() => {
                    handleMobileScroll();
                    scrollTicking_m = false;
                });
                scrollTicking_m = true;
            }
        }, { passive: true });
    }

})();
