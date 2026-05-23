#!/usr/bin/env python3
"""
主次轮换追踪工具
用法: python3 scripts/manage-rotation.py set 07 T1,T3,T5    # 记录本周主主题
      python3 scripts/manage-rotation.py get 07             # 查上周主主题（用作本周的副）
"""
import json, os, sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROTATION_FILE = os.path.join(ROOT, "task", "morning_news", "topic-rotation.json")

def load():
    if not os.path.exists(ROTATION_FILE):
        return {}
    with open(ROTATION_FILE) as f:
        return json.load(f)

def save(data):
    with open(ROTATION_FILE, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def cmd_set(mod_id, topics_str):
    """记录本周主主题"""
    data = load()
    topics = [t.strip() for t in topics_str.split(",") if t.strip()]
    data[mod_id] = {
        "last_main": topics,
        "last_week": datetime.now().strftime("%Y-%m-%d")
    }
    save(data)
    print(f"✅ {mod_id} 本周主主题: {', '.join(topics)}")

def cmd_get(mod_id):
    """获取上周主主题"""
    data = load()
    info = data.get(mod_id, {})
    mains = info.get("last_main", [])
    week = info.get("last_week", "未知")
    if mains:
        print(f"📌 {mod_id} 上周主主题（{week}）: {', '.join(mains)}")
        print(f"   → 本周这些主题应降为副主题")
    else:
        print(f"📌 {mod_id} 无上周记录，本轮可自由分配")

def cmd_clear(mod_id):
    data = load()
    data[mod_id] = {"last_main": [], "last_week": ""}
    save(data)
    print(f"✅ {mod_id} 轮换记录已清除")

def cmd_show():
    data = load()
    for mod_id in sorted(data.keys()):
        info = data[mod_id]
        mains = info.get("last_main", [])
        week = info.get("last_week", "")
        status = f"上周主: {', '.join(mains)}" if mains else "无记录"
        print(f"  {mod_id}: {status} ({week})")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: manage-rotation.py <set|get|clear|show> [模块ID] [主题列表]")
        cmd_show()
        sys.exit(0)

    cmd = sys.argv[1]
    if cmd == "show":
        cmd_show()
    elif cmd == "get" and len(sys.argv) >= 3:
        cmd_get(sys.argv[2])
    elif cmd == "set" and len(sys.argv) >= 4:
        cmd_set(sys.argv[2], sys.argv[3])
    elif cmd == "clear" and len(sys.argv) >= 3:
        cmd_clear(sys.argv[2])
    else:
        print("❌ 参数不足")
