#!/usr/bin/env python3
"""
搜索缓存管理工具
避免多个 Agent 对同一关键词重复搜索，减少 API 调用。

用法：
  python3 search-cache.py search <关键词> <搜索结果>   # 缓存搜索结果
  python3 search-cache.py get <关键词>                 # 查询缓存
  python3 search-cache.py has <关键词>                  # 检查是否存在
  python3 search-cache.py list                          # 列出所有缓存
  python3 search-cache.py stats                         # 统计信息
  python3 search-cache.py clean <天>                    # 清理 N 天前的缓存
"""

import json, sys, os, time
from datetime import datetime, timedelta

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "task")
CACHE_FILE = os.path.join(CACHE_DIR, "search-cache.json")

def _load():
    if not os.path.exists(CACHE_FILE):
        return {}
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def _save(data):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def _normalize_key(keyword):
    """归一化关键词，去除多余空格和日期后缀 -> 统一缓存命中"""
    kw = keyword.strip().lower()
    # 移除日期范围后缀 "{DATE-1}至{DATE}" 类
    for pattern in [
        r'\s*\{date[^}]*\}\s*至\s*\{date[^}]*\}',
        r'\s*\{date[^}]*\}',
        r'\s*\d{4}-\d{2}-\d{2}\s*至\s*\d{4}-\d{2}-\d{2}',
        r'\s*\d{4}-\d{2}-\d{2}',
    ]:
        import re
        kw = re.sub(pattern, '', kw).strip()
    return kw

def search(keyword, result):
    """缓存搜索关键词的结果"""
    data = _load()
    key = _normalize_key(keyword)
    entry = {
        "keyword": keyword,
        "normalized_key": key,
        "result": result,
        "cached_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    data[key] = entry
    _save(data)
    print(f"✅ 已缓存: [{key}]")

def get(keyword):
    """获取缓存结果"""
    data = _load()
    key = _normalize_key(keyword)
    entry = data.get(key)
    if entry:
        print(f"🟢 缓存命中: [{key}] (缓存于 {entry['cached_at']})")
        return entry["result"]
    print(f"🔴 缓存未命中: [{key}]")
    return None

def has(keyword):
    """检查缓存是否存在"""
    data = _load()
    key = _normalize_key(keyword)
    exists = key in data
    status = "🟢 缓存存在" if exists else "🔴 缓存未命中"
    print(f"{status}: [{key}]")
    return exists

def list_all():
    """列出所有缓存条目"""
    data = _load()
    if not data:
        print("📭 缓存为空")
        return
    items = sorted(data.items(), key=lambda x: x[1]["cached_at"], reverse=True)
    print(f"📚 共 {len(items)} 条缓存:")
    for key, entry in items:
        result_len = len(entry["result"]) if isinstance(entry["result"], str) else len(json.dumps(entry["result"], ensure_ascii=False))
        print(f"  {entry['cached_at']} | {key[:50]:50s} | {result_len:>6d} chars")

def stats():
    """统计缓存信息"""
    data = _load()
    total = len(data)
    today = datetime.now().strftime("%Y-%m-%d")
    today_count = sum(1 for e in data.values() if e["cached_at"].startswith(today))
    total_chars = sum(len(e["result"]) if isinstance(e["result"], str) else len(json.dumps(e["result"], ensure_ascii=False)) for e in data.values())
    print(f"📊 缓存统计:")
    print(f"   总条目: {total}")
    print(f"   今日新增: {today_count}")
    print(f"   缓存总字符: {total_chars:,} chars")

def clean(days=7):
    """清理 N 天前的缓存"""
    data = _load()
    cutoff = datetime.now() - timedelta(days=days)
    before = len(data)
    data = {k: v for k, v in data.items()
            if datetime.strptime(v["cached_at"], "%Y-%m-%d %H:%M:%S") > cutoff}
    removed = before - len(data)
    _save(data)
    print(f"🧹 清理完成: 移除 {removed} 条, 剩余 {len(data)} 条")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "search":
        if len(sys.argv) < 4:
            print("用法: python3 search-cache.py search <关键词> <搜索结果>")
            sys.exit(1)
        search(sys.argv[2], sys.argv[3])

    elif cmd == "get":
        if len(sys.argv) < 3:
            print("用法: python3 search-cache.py get <关键词>")
            sys.exit(1)
        get(sys.argv[2])

    elif cmd == "has":
        if len(sys.argv) < 3:
            print("用法: python3 search-cache.py has <关键词>")
            sys.exit(1)
        has(sys.argv[2])

    elif cmd == "list":
        list_all()

    elif cmd == "stats":
        stats()

    elif cmd == "clean":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
        clean(days)

    else:
        print(__doc__)
