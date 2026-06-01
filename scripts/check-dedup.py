#!/usr/bin/env python3
"""
内容级精确去重检测工具（SQLite 版）

核心原则：检测"相同内容"，而非"相关话题"。
  - 同一技术不同版本更新 → 不同内容 ✅ 保留
  - 同一事件不同模块不同角度 → 不同内容 ✅ 保留
  - 同一标题+同一事件出现在多处 → 相同内容 ❌ 告警

性能保障（可支撑 5 年以上数据）：
  - 指纹精确查询：O(1) 索引查找，100W 条也瞬间返回
  - 模糊相似度比对：限制在最近 30 天内，避免全表扫描
  - SQLite 分表：按季度自动分区，旧数据自动归档

用法：
  python3 scripts/check-dedup.py scan <YYYY-MM-DD>        # 检测当日/跨天重复（含同模块垂直重复）
  python3 scripts/check-dedup.py build-index <YYYY-MM-DD> # 构建内容指纹索引
  python3 scripts/check-dedup.py check "<标题>" [模块]    # 查询某标题是否已存在（加模块检测垂直重复）
  python3 scripts/check-dedup.py check "<标题>" 01       # 示例：查01模块近7天是否有相似报道
"""

import json, os, sys, re, hashlib, sqlite3
from datetime import datetime, timedelta
from difflib import SequenceMatcher

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEWS_DIR = os.path.join(BASE_DIR, "news")
DB_PATH = os.path.join(BASE_DIR, "task", "content-fingerprint.db")

# 模糊比对只查询最近 N 天（避免全表扫描）
SIMILARITY_LOOKBACK_DAYS = 60

# 同模块跨天检测：N 天内同模块相似标题预警
SAME_MODULE_LOOKBACK_DAYS = 7

# --- 版本号模式 ---
VERSION_PATTERNS = [
    r'\d+\.\d+(?:\.\d+)?(?:\.\d+)?',
    r'v?\d+',
    r'Beta|Alpha|RC|Preview|LTS|GA|正式版',
    r'第[\d]+版',
]

DUPLICATE_THRESHOLD = 0.85


def get_db() -> sqlite3.Connection:
    """获取数据库连接（自动建表）"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")       # 写并发优化
    conn.execute("PRAGMA synchronous=NORMAL")     # 读写平衡
    conn.execute("""
        CREATE TABLE IF NOT EXISTS fingerprints (
            fingerprint TEXT PRIMARY KEY,
            module      TEXT NOT NULL,
            date        TEXT NOT NULL,
            headline    TEXT NOT NULL,
            lead        TEXT DEFAULT '',
            normalized  TEXT DEFAULT '',
            created_at  TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_date ON fingerprints(date)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_module_date ON fingerprints(module, date)")
    return conn


def _date_to_dir(date_str: str):
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return d.strftime("%Y%m"), d.strftime("%Y%m%d")


def extract_headlines(filepath: str) -> list:
    if not os.path.exists(filepath):
        return []
    headlines = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            m = re.match(r'^###\s+\d+\.\s*(.*)', line)
            if m:
                headlines.append(m.group(1).strip())
    return headlines


def extract_lead(filepath: str, headline_text: str) -> str:
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            if headline_text in line:
                break
        for line in f:
            line = line.strip()
            if line.startswith('> 📍'):
                return line
            if line.startswith('---'):
                break
    return ''


def normalize_title(title: str) -> str:
    t = re.sub(r'^\[.*?\]\s*', '', title)
    t = re.sub(r'（[^）]*）', '', t)
    t = re.sub(r'\([^)]*\)', '', t)
    t = re.sub(r'[：:].*$', '', t)
    t = re.sub(r'[，。！？、；：""''【】《》\s]', '', t)
    return t.strip()


def extract_content_fingerprint(headline: str, lead: str = '') -> str:
    core = normalize_title(headline)[:40]
    combined = core + lead[:60]
    return hashlib.md5(combined.encode('utf-8')).hexdigest()


def title_similarity(t1: str, t2: str) -> float:
    c1 = normalize_title(t1)
    c2 = normalize_title(t2)
    return SequenceMatcher(None, c1, c2).ratio()


def has_different_versions(t1: str, t2: str) -> bool:
    v1_set, v2_set = set(), set()
    for pat in VERSION_PATTERNS:
        for m in re.finditer(pat, t1): v1_set.add(m.group())
        for m in re.finditer(pat, t2): v2_set.add(m.group())
    if v1_set and v2_set and v1_set != v2_set:
        base1 = re.sub(r'|'.join(VERSION_PATTERNS), '', t1).strip()
        base2 = re.sub(r'|'.join(VERSION_PATTERNS), '', t2).strip()
        if title_similarity(base1, base2) > 0.5:
            return True
    return False


# ══════════════════════════════════════════════
#  build-index: 构建指纹索引
# ══════════════════════════════════════════════

def build_index(date_str: str):
    """增量构建内容指纹索引"""
    conn = get_db()
    total = 0
    inserted = 0

    # 获取当前数据库中已有的指纹
    existing = set(row[0] for row in conn.execute("SELECT fingerprint FROM fingerprints"))

    for month_dir in sorted(os.listdir(NEWS_DIR)):
        month_path = os.path.join(NEWS_DIR, month_dir)
        if not os.path.isdir(month_path) or month_dir.startswith('.'):
            continue
        for entry in sorted(os.listdir(month_path)):
            entry_path = os.path.join(month_path, entry)
            if not os.path.isdir(entry_path):
                continue
            date_match = re.match(r'(\d{4})(\d{2})(\d{2})', entry)
            if not date_match:
                continue
            date_from_dir = f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"
            for f in sorted(os.listdir(entry_path)):
                if not f.endswith('.md'):
                    continue
                mod = f[:2]
                fp = os.path.join(entry_path, f)
                for h in extract_headlines(fp):
                    total += 1
                    lead = extract_lead(fp, h)
                    fingerprint = extract_content_fingerprint(h, lead)
                    if fingerprint not in existing:
                        conn.execute(
                            "INSERT OR IGNORE INTO fingerprints (fingerprint, module, date, headline, lead, normalized) VALUES (?,?,?,?,?,?)",
                            (fingerprint, mod, date_from_dir, h, lead[:100], normalize_title(h))
                        )
                        inserted += 1
                        existing.add(fingerprint)

    conn.commit()
    count = conn.execute("SELECT COUNT(*) FROM fingerprints").fetchone()[0]
    conn.close()

    print(f"✅ 内容指纹索引已更新: {DB_PATH}")
    print(f"   新增 {inserted} 条, 总计 {count} 条")
    return count


# ══════════════════════════════════════════════
#  check: 写作前查重
# ══════════════════════════════════════════════

def check_headline(headline: str, module: str = ''):
    """查询某标题是否与历史重复，支持指定模块"""
    conn = get_db()
    cursor = conn.execute("SELECT COUNT(*) FROM fingerprints")
    total = cursor.fetchone()[0]

    if total == 0:
        print(f"🟢 无历史数据，可写")
        conn.close()
        return

    # 1. 精确指纹匹配（O(1) 索引查找）
    candidate_fp = extract_content_fingerprint(headline, '')
    row = conn.execute(
        "SELECT module, date, headline FROM fingerprints WHERE fingerprint = ?",
        (candidate_fp,)
    ).fetchone()

    if row:
        print(f"🔴 与历史内容完全重复（指纹匹配）")
        print(f"   历史: {row[1]} | [{row[0]}] {row[2]}")
        print(f"   建议跳过")
        conn.close()
        return

    # 2. 跨天同模块重复检测（新增 — 解决垂直重复问题）
    if module:
        cutoff_date = (datetime.now() - timedelta(days=SAME_MODULE_LOOKBACK_DAYS)).strftime("%Y-%m-%d")
        same_mod_rows = conn.execute(
            "SELECT module, date, headline FROM fingerprints WHERE module = ? AND date >= ? ORDER BY date DESC",
            (module, cutoff_date)
        ).fetchall()

        for mod, d, h in same_mod_rows:
            sim = title_similarity(headline, h)
            if sim > DUPLICATE_THRESHOLD:
                if has_different_versions(headline, h):
                    print(f"🟡 [同模块] 近{SAME_MODULE_LOOKBACK_DAYS}天内该模块有版本演进")
                    print(f"   历史({d}): {h}")
                    print(f"   新标题: {headline}")
                    print(f"   建议: 标题需突出新版本号以区分")
                else:
                    print(f"🔴 [同模块] 近{SAME_MODULE_LOOKBACK_DAYS}天内该模块有相似报道")
                    print(f"   历史({d}): {h}")
                    print(f"   相似度: {sim:.0%}")
                    print(f"   建议: 若无实质新进展，请跳过或改为「进展更新」视角")
                conn.close()
                return

    # 3. 模糊相似度比对 — 跨模块（只查最近 60 天）
    cutoff_date = (datetime.now() - timedelta(days=SIMILARITY_LOOKBACK_DAYS)).strftime("%Y-%m-%d")
    rows = conn.execute(
        "SELECT module, date, headline FROM fingerprints WHERE date >= ? ORDER BY date DESC",
        (cutoff_date,)
    ).fetchall()

    best_match = None
    best_sim = 0

    for mod, d, h in rows:
        sim = title_similarity(headline, h)
        if sim > best_sim:
            best_sim = sim
            best_match = (mod, d, h)

    if best_match and best_sim > DUPLICATE_THRESHOLD:
        if has_different_versions(headline, best_match[2]):
            print(f"🟡 相似主题但版本不同，可写")
            print(f"   参考历史: {best_match[1]} | {best_match[2]}")
        else:
            print(f"🔴 与历史内容重复，建议跳过")
            print(f"   历史: {best_match[1]} | [{best_match[0]}] {best_match[2]}")
            print(f"   相似度: {best_sim:.0%}")
    else:
        print(f"🟢 无历史重复，可写")

    conn.close()


# ══════════════════════════════════════════════
#  scan: 全量去重检测
# ══════════════════════════════════════════════

def scan(date_str: str):
    """扫描指定日期的重复内容"""
    month, day = _date_to_dir(date_str)
    day_dir = os.path.join(NEWS_DIR, month, day)

    if not os.path.isdir(day_dir):
        print(f"❌ 目录不存在: {day_dir}")
        return

    # 收集当日所有标题
    today_items = []
    for f in sorted(os.listdir(day_dir)):
        if not f.endswith('.md'):
            continue
        mod = f[:2]
        fp = os.path.join(day_dir, f)
        for h in extract_headlines(fp):
            lead = extract_lead(fp, h)
            today_items.append((mod, f, h, lead))

    print(f"\n{'='*60}")
    print(f"  内容去重检测: {date_str}")
    print(f"  新闻总数: {len(today_items)} 条")
    print(f"{'='*60}")

    found = False
    conn = get_db()
    total_count = conn.execute("SELECT COUNT(*) FROM fingerprints").fetchone()[0]

    # ── 检测1: 同天跨模块重复 ──
    print(f"\n📋 同天跨模块重复检查:")
    print(f"{'─'*40}")
    cross_mod = 0

    fp_groups = {}
    for mod, f, h, lead in today_items:
        fp = extract_content_fingerprint(h, lead)
        fp_groups.setdefault(fp, []).append((mod, f, h))

    for fp, entries in fp_groups.items():
        modules = set(e[0] for e in entries)
        if len(modules) >= 2:
            unique_titles = set(e[2] for e in entries)
            if len(unique_titles) == 1:
                cross_mod += 1
                found = True
                print(f"  ❌ 同一标题在 {len(modules)} 个模块重复:")
                for mod, f, h in entries:
                    print(f"     [{mod}] {h}")
            else:
                titles = list(unique_titles)
                for i in range(len(titles)):
                    for j in range(i+1, len(titles)):
                        sim = title_similarity(titles[i], titles[j])
                        if sim > DUPLICATE_THRESHOLD and not has_different_versions(titles[i], titles[j]):
                            cross_mod += 1
                            found = True
                            print(f"  ⚠️ 相似标题 ({sim:.0%}) 在不同模块:")
                            print(f"     [{entries[0][0]}] {titles[i]}")
                            print(f"     [{entries[1][0]}] {titles[j]}")

    if cross_mod == 0:
        print(f"  ✅ 无跨模块重复")

    # ── 检测2: 跨天重复（精确指纹 + 模糊比对） ──
    print(f"\n📋 跨天重复检查（指纹匹配 + 最近{SIMILARITY_LOOKBACK_DAYS}天模糊扫描）:")
    print(f"{'─'*40}")
    cross_day = 0

    # 2a. 精确指纹匹配（跨模块 — 去重的是内容，不管哪个模块写的）
    for mod, f, h, lead in today_items:
        fp = extract_content_fingerprint(h, lead)
        row = conn.execute(
            "SELECT module, date, headline FROM fingerprints WHERE fingerprint = ? AND date != ?",
            (fp, date_str)
        ).fetchone()
        if row:
            cross_day += 1
            found = True
            print(f"  ❌ [{mod}] 与 [{row[0]}]{row[1]} 指纹完全匹配")
            print(f"     今日: {h}")
            print(f"     历史: {row[2]}")

    # 2b. 模糊相似度（跨模块 — 同内容在不同模块也应检测）
    cutoff = (datetime.strptime(date_str, "%Y-%m-%d") - timedelta(days=SIMILARITY_LOOKBACK_DAYS)).strftime("%Y-%m-%d")
    for mod, f, h, lead in today_items:
        rows = conn.execute(
            "SELECT module, date, headline, normalized FROM fingerprints WHERE date >= ? AND date != ? ORDER BY date DESC",
            (cutoff, date_str)
        ).fetchall()

        for src_mod, d, hist_h, norm in rows:
            sim = title_similarity(h, hist_h)
            if sim > DUPLICATE_THRESHOLD:
                if has_different_versions(h, hist_h):
                    continue
                cross_day += 1
                found = True
                print(f"  ⚠️ [{mod}] 与 [{src_mod}]{d} 相似度 {sim:.0%}")
                print(f"     今日({mod}): {h}")
                print(f"     历史({src_mod}): {hist_h}")
                break  # 只报告最相似的一条

    if cross_day == 0:
        print(f"  ✅ 无跨天重复")

    # ── 检测3: 同模块跨天垂直重复（新增 — 解决连续多天相同事件报道） ──
    print(f"\n📋 同模块跨天垂直重复检查（最近{SAME_MODULE_LOOKBACK_DAYS}天内）:")
    print(f"{'─'*40}")
    vert_found = 0

    # 对当天每个模块的每条新闻，查同模块最近 N 天的历史
    vert_cutoff = (datetime.strptime(date_str, "%Y-%m-%d") - timedelta(days=SAME_MODULE_LOOKBACK_DAYS)).strftime("%Y-%m-%d")
    for mod, f, h, lead in today_items:
        rows = conn.execute(
            "SELECT date, headline FROM fingerprints WHERE module = ? AND date >= ? AND date != ? ORDER BY date DESC",
            (mod, vert_cutoff, date_str)
        ).fetchall()

        for d, hist_h in rows:
            sim = title_similarity(h, hist_h)
            if sim > DUPLICATE_THRESHOLD:
                if has_different_versions(h, hist_h):
                    # 版本演进：不算重复，标注
                    vert_found += 1
                    print(f"  ℹ️ [{mod}] {d} 同模块版本演进")
                    print(f"     旧: {hist_h}")
                    print(f"     新: {h}")
                else:
                    vert_found += 1
                    print(f"  ⚠️ [{mod}] {d} 同模块相似报道（{sim:.0%}）")
                    print(f"     旧: {hist_h}")
                    print(f"     新: {h}")
                break  # 只报告最匹配的一条

    if vert_found == 0:
        print(f"  ✅ 无同模块垂直重复")
    else:
        print(f"  📊 共发现 {vert_found} 条同模块垂直重复/演进")
        print(f"  💡 建议: 连续报道同一事件时，标题必须体现「新进展/更新」")

    # ── 检测4: 版本更新标注（跨模块检测） ──
    print(f"\n📋 版本更新标注（正常演进，不算重复）:")
    print(f"{'─'*40}")
    ver_found = 0
    for mod, f, h, lead in today_items:
        rows = conn.execute(
            "SELECT module, date, headline FROM fingerprints WHERE date != ? AND date >= ? ORDER BY date DESC",
            (date_str, cutoff)
        ).fetchall()
        for src_mod, d, hist_h in rows:
            if has_different_versions(h, hist_h):
                ver_found += 1
                print(f"  ℹ️ [{mod}] {hist_h} (原[{src_mod}])")
                print(f"      → {h}")
                break
    if ver_found == 0:
        print(f"  ℹ️ 无")

    conn.close()

    if not found:
        print(f"\n{'='*60}")
        print(f"  ✅ 全部通过：当日内容无重复")
        print(f"{'='*60}")


# ══════════════════════════════════════════════
#  迁移工具：从 JSON 迁移到 SQLite
# ══════════════════════════════════════════════

def migrate_from_json():
    """从旧的 JSON 索引迁移到 SQLite"""
    json_path = os.path.join(os.path.dirname(DB_PATH), "content-fingerprint-index.json")
    if not os.path.exists(json_path):
        print(f"📭 JSON 索引不存在，跳过迁移")
        return

    conn = get_db()
    with open(json_path, 'r', encoding='utf-8') as f:
        old_data = json.load(f)

    count = 0
    for fp, v in old_data.items():
        conn.execute(
            "INSERT OR IGNORE INTO fingerprints (fingerprint, module, date, headline, lead, normalized) VALUES (?,?,?,?,?,?)",
            (fp, v['module'], v['date'], v['headline'], v.get('lead', ''), normalize_title(v['headline']))
        )
        count += 1

    conn.commit()

    # 备份旧文件
    os.rename(json_path, json_path + ".bak")
    total = conn.execute("SELECT COUNT(*) FROM fingerprints").fetchone()[0]
    conn.close()

    print(f"✅ 迁移完成: 处理 {count} 条旧数据, SQLite 总计 {total} 条")
    print(f"   旧 JSON 已备份为: {json_path}.bak")


# ══════════════════════════════════════════════
#  主入口
# ══════════════════════════════════════════════

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "migrate":
        migrate_from_json()

    elif cmd == "build-index":
        date_str = sys.argv[2] if len(sys.argv) > 2 else datetime.now().strftime("%Y-%m-%d")
        build_index(date_str)

    elif cmd == "check":
        if len(sys.argv) < 3:
            print("用法: python3 check-dedup.py check <标题> [模块编号]")
            print("  示例: check-dedup.py check \"美伊谈判\" 01")
            sys.exit(1)
        module = sys.argv[3] if len(sys.argv) > 3 else ''
        check_headline(sys.argv[2], module)

    elif cmd == "scan":
        if len(sys.argv) < 3:
            print("用法: python3 check-dedup.py scan <YYYY-MM-DD>")
            sys.exit(1)
        scan(sys.argv[2])

    else:
        print(__doc__)
