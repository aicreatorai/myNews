#!/usr/bin/env python3
"""
搜索缓存管理工具
避免多个 Agent 对同一关键词重复搜索，减少 API 调用。

用法：
  python3 search-cache.py search <关键词> <搜索结果>   # 缓存搜索结果
  python3 search-cache.py get <关键词>                 # 查询缓存（结果输出到stdout）
  python3 search-cache.py has <关键词>                  # 检查是否存在
  python3 search-cache.py list                          # 列出所有缓存
  python3 search-cache.py stats                         # 统计信息
  python3 search-cache.py clean <天>                    # 清理 N 天前的缓存

退出码：
  get/has: 0=存在, 1=不存在
  search: 0=成功
"""

import json, sys, os, time, fcntl
from datetime import datetime, timedelta

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "task")
CACHE_FILE = os.path.join(CACHE_DIR, "search-cache.json")

def _load():
    """线程安全读取"""
    os.makedirs(CACHE_DIR, exist_ok=True)
    if not os.path.exists(CACHE_FILE):
        return {}
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_SH)
        data = json.load(f)
        fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        return data

def _save(data):
    """线程安全写入"""
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        json.dump(data, f, ensure_ascii=False, indent=2)
        fcntl.flock(f.fileno(), fcntl.LOCK_UN)

def _normalize_key(keyword):
    """归一化关键词，去除多余空格和日期后缀 -> 统一缓存命中"""
    kw = keyword.strip().lower()
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
    """获取缓存结果。结果写入stdout，可通过 $(cmd) 捕获。退出码0=命中,1=未命中"""
    data = _load()
    key = _normalize_key(keyword)
    entry = data.get(key)
    if entry:
        # 结果内容输出到stdout，供 shell 捕获
        print(entry["result"])
        return 0
    # 未命中时退出码为1
    return 1

def has(keyword):
    """检查缓存是否存在。退出码0=存在,1=不存在"""
    data = _load()
    key = _normalize_key(keyword)
    return 0 if key in data else 1

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
        print(__doc__.strip())
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
        rc = get(sys.argv[2])
        sys.exit(rc)

    elif cmd == "has":
        if len(sys.argv) < 3:
            print("用法: python3 search-cache.py has <关键词>")
            sys.exit(1)
        rc = has(sys.argv[2])
        sys.exit(rc)

    elif cmd == "list":
        list_all()

    elif cmd == "stats":
        stats()

    elif cmd == "clean":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
        clean(days)

    else:
        print(__doc__.strip())
