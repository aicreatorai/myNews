#!/usr/bin/env python3
"""
知识类模块去重管理系统
用法：
  python3 manage-knowledge.py check <模块编号> <主题关键词>   # 检查主题是否已覆盖
  python3 manage-knowledge.py suggest <模块编号> <主题关键词> # 建议下一个层级
  python3 manage-knowledge.py add <模块编号> <JSON条目>      # 添加新条目
  python3 manage-knowledge.py list <模块编号>                 # 列出某模块所有记录
"""

import json, sys, os, re, fcntl
from difflib import SequenceMatcher

# 知识类模块白名单（仅这些模块需要知识索引）
KNOWLEDGE_MODULES = {"07", "08", "09", "10", "12", "13", "14", "15"}

BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "task")

def _module_path(module_id):
    """每个模块独立文件，避免单文件膨胀"""
    return os.path.join(BASE_DIR, f"knowledge-index-{module_id}.json")

def _valid_module(module_id):
    """验证是否为知识类模块，非知识类模块拒绝操作"""
    if module_id not in KNOWLEDGE_MODULES:
        print(f"⚠️ 模块 {module_id} 不是知识类模块，无需知识索引。", file=sys.stderr)
        return False
    return True

def _read_json(path):
    """线程安全的JSON读取"""
    with open(path, 'r', encoding='utf-8') as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_SH)
        data = json.load(f)
        fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        return data

def _write_json(path, data):
    """线程安全的JSON写入"""
    with open(path, 'w', encoding='utf-8') as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        json.dump(data, f, ensure_ascii=False, indent=2)
        fcntl.flock(f.fileno(), fcntl.LOCK_UN)

def load(module_id=None):
    """加载数据。module_id指定则只加载该模块，否则加载全部（用于list --all）"""
    if module_id:
        path = _module_path(module_id)
        if not os.path.exists(path):
            return []
        return _read_json(path)

    # 合并所有模块（仅 list --all 时使用）
    all_data = []
    for fname in os.listdir(BASE_DIR):
        if fname.startswith("knowledge-index-") and fname.endswith(".json"):
            all_data.extend(_read_json(os.path.join(BASE_DIR, fname)))
    return all_data

def save(data, module_id):
    path = _module_path(module_id)
    _write_json(path, data)

LEVEL_MAP = {
    "L1": "概念层 - 是什么、解决什么问题、与什么不同",
    "L2": "技术层 - 内部机制、关键参数、优化策略",
    "L3": "实践层 - 生产级方案、踩坑经验、数据对比",
    "L4": "前沿层 - 最新演进、与传统方案的融合",
}

def topic_similarity(topic_a, topic_b):
    """计算两个主题的相似度（0-1）"""
    return SequenceMatcher(None, topic_a.lower(), topic_b.lower()).ratio()

def check(module_id, query_topic, threshold=0.6):
    """
    检查某主题是否已被覆盖。
    返回: (is_covered, existing_records, suggested_level)
    """
    data = load(module_id)  # 只加载本模块数据
    matched = []

    query_keywords = set(re.findall(r'[\w\u4e00-\u9fff]+', query_topic.lower()))

    for entry in data:

        # 1. 检查 topic 字段的相似度
        sim = topic_similarity(entry["topic"].lower(), query_topic.lower())

        # 2. 检查关键词片段是否包含查询词
        kw = entry.get("keywords_snippet", "").lower()
        kw_hit = sum(1 for k in query_keywords if k in kw and len(k) > 1)

        # 3. 检查主题名是否包含查询词的关键词
        topic_text = entry["topic"].lower()
        topic_hit = sum(1 for k in query_keywords if k in topic_text and len(k) > 1)

        # 匹配条件：高相似度 OR 命中2个以上关键词
        if sim > threshold or topic_hit >= 2 or kw_hit >= 2:
            matched.append(entry)

    if not matched:
        return False, [], "L1"

    # 检查已覆盖的层级
    levels_covered = sorted(set(e["level"] for e in matched))
    level_order = ["L1", "L2", "L3", "L4"]

    # 达到 L4 → 彻底跳过
    if "L4" in levels_covered:
        return True, matched, None

    # 建议下一层级
    last_idx = max(level_order.index(l) for l in levels_covered)
    if last_idx >= 3:
        return True, matched, None

    next_level = level_order[last_idx + 1]

    # 检查最近30天内是否写过（任何层级）
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.now() - timedelta(days=30)
    recent = [e for e in matched if
              datetime.strptime(e["date"], "%Y-%m-%d") > thirty_days_ago]

    if recent:
        # 30天内有记录 → 确认是否已到下一层级
        recent_levels = set(e["level"] for e in recent)
        if next_level in recent_levels:
            # 下一层级也被覆盖了（近期），再推一级
            next_idx = level_order.index(next_level) + 1
            if next_idx < 4:
                next_level = level_order[next_idx]
            else:
                return True, matched, None

    return False, matched, next_level

def suggest_level(module_id, query_topic):
    """建议下一个合适的层级。"""
    covered, matched, next_level = check(module_id, query_topic)
    if next_level is None:
        return "L4", "前沿层", "⚠️ 已达最深层(L4)，建议彻底跳过此主题"
    if covered:
        return None, None, "当前层级刚写过，建议等30天"
    return next_level, LEVEL_MAP.get(next_level, ""), f"建议进入{LEVEL_MAP.get(next_level, '')}"

def add_entry(module_id, topic, title, level, depth, angle, keywords_snippet):
    """添加新条目到索引"""
    data = load(module_id)  # 只加载本模块
    from datetime import date
    entry = {
        "module": module_id,
        "date": str(date.today()),
        "topic": topic,
        "title": title,
        "level": level,
        "depth": depth,
        "angle": angle,
        "keywords_snippet": keywords_snippet,
    }
    data.append(entry)
    save(data, module_id)
    print(f"✅ 已记录: [{module_id}] {topic} ({level} {depth})")

def list_module(module_id):
    """列出某模块的所有记录"""
    entries = load(module_id)  # 只加载本模块
    if not entries:
        print(f"📭 [{module_id}] 暂无记录")
        return
    print(f"📚 [{module_id}] 共 {len(entries)} 条记录：")
    for e in sorted(entries, key=lambda x: x["date"], reverse=True):
        print(f"  {e['date']} | {e['level']} | {e['topic']} | {e['angle']}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    mod = sys.argv[2]

    if cmd == "check":
        if not _valid_module(mod): sys.exit(0)
        topic = sys.argv[3] if len(sys.argv) > 3 else ""
        covered, records, next_lvl = check(mod, topic)
        if next_lvl is None:
            print(f"🔴 已达L4最深层，彻底跳过此主题")
        elif covered:
            print(f"🔴 近期已覆盖，建议等30天或换方向")
            for r in records[-2:]:
                print(f"   {r['date']} | {r['level']} | {r['topic']}")
            print(f"💡 如继续写，建议进入{LEVEL_MAP.get(next_lvl, '')}")
        else:
            print(f"🟢 可写 | 建议层级: {next_lvl} {LEVEL_MAP.get(next_lvl, '')}")

    elif cmd == "suggest":
        topic = sys.argv[3] if len(sys.argv) > 3 else ""
        lvl, dep, msg = suggest_level(mod, topic)
        if lvl:
            print(f"💡 {msg}")

    elif cmd == "add":
        if not _valid_module(mod): sys.exit(0)
        entry = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        add_entry(mod, **entry)

    elif cmd == "list":
        list_module(mod)

    else:
        print(__doc__)
