#!/usr/bin/env python3
"""扫描 news/ 目录，生成 news-index.json 供前端使用。"""

import json
import os
import re
from datetime import datetime

NEWS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "news")
OUTPUT = os.path.join(os.path.dirname(NEWS_DIR), "news-index.json")

CATEGORIES = {
    "01": {"name": "新闻早报",     "icon": "🔥"},
    "02": {"name": "AI与设计创意", "icon": "🎨"},
    "03": {"name": "AI与数据工程", "icon": "⚙️"},
    "04": {"name": "技术精选推荐", "icon": "🌟"},
    "05": {"name": "科技前沿",     "icon": "🧠"},
    "06": {"name": "科技动态",     "icon": "🤖"},
    "07": {"name": "AI知识点",     "icon": "🧩"},
    "08": {"name": "AI工具使用",   "icon": "✨"},
    "09": {"name": "开发语言",     "icon": "🔤"},
    "10": {"name": "GitHubSkills", "icon": "⭐"},
    "11": {"name": "移动开发",     "icon": "📱"},
    "12": {"name": "AI创业",       "icon": "💰"},
    "13": {"name": "AI教育",       "icon": "📚"},
    "14": {"name": "个人成长",     "icon": "🌱"},
    "15": {"name": "AI产品经理",   "icon": "📋"},
}

def parse_date_from_filename(filename):
    """从文件名解析日期，返回 YYYY-MM-DD 或 None"""
    m = re.match(r'(\d{4})(\d{2})(\d{2})', filename)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return None

def scan():
    index = {"dates": [], "months": []}
    months_set = set()

    if not os.path.isdir(NEWS_DIR):
        print(f"错误：找不到目录 {NEWS_DIR}")
        return

    for month_dir in sorted(os.listdir(NEWS_DIR)):
        month_path = os.path.join(NEWS_DIR, month_dir)
        if not os.path.isdir(month_path) or month_dir.startswith('.'):
            continue

        month_data = {"month": month_dir, "dates": []}

        for entry in sorted(os.listdir(month_path)):
            entry_path = os.path.join(month_path, entry)

            # 子目录格式：20260513/
            if os.path.isdir(entry_path):
                date_str = parse_date_from_filename(entry)
                if not date_str:
                    continue

                files = sorted(os.listdir(entry_path))
                categories = []
                for f in files:
                    m = re.match(r'(\d{2})_(.+)\.md$', f)
                    if m:
                        cat_id = m.group(1)
                        file_name = m.group(2)
                        # 始终从文件名提取分类名（向后兼容旧版23板块）
                        # 图标通过匹配分类名获取
                        icon = "📄"
                        for v in CATEGORIES.values():
                            if v["name"] == file_name:
                                icon = v["icon"]
                                break
                        categories.append({
                            "id": cat_id,
                            "file": f,
                            "name": file_name,
                            "icon": icon
                        })

                day_entry = {
                    "date": date_str,
                    "format": "subdir",
                    "has_multi": True,
                    "categories": categories,
                    "path": f"{month_dir}/{entry}"
                }
                month_data["dates"].append(day_entry)
                months_set.add(month_dir)

            # flat 文件格式：20260501_早间.md
            elif entry.endswith('.md') and not entry.startswith('.'):
                date_str = parse_date_from_filename(entry)
                if not date_str:
                    continue

                is_weekly = '周报' in entry
                day_entry = {
                    "date": date_str,
                    "format": "flat",
                    "has_multi": False,
                    "title": entry,
                    "type": "周报" if is_weekly else "早间",
                    "path": f"{month_dir}/{entry}"
                }
                month_data["dates"].append(day_entry)
                months_set.add(month_dir)

        if month_data["dates"]:
            index["months"].append(month_data)
            index["dates"].extend(month_data["dates"])

    # 日期去重：同一天既有subdir又有flat时，优先保留subdir
    seen_dates = set()
    deduped_dates = []
    for d in index["dates"]:
        if d["date"] not in seen_dates:
            seen_dates.add(d["date"])
            deduped_dates.append(d)
        else:
            # 已存在该日期，subdir 优先级高于 flat
            for i, existing in enumerate(deduped_dates):
                if existing["date"] == d["date"] and existing["format"] == "flat" and d["format"] == "subdir":
                    deduped_dates[i] = d
                    break
    index["dates"] = deduped_dates

    # 按日期降序排列
    index["dates"].sort(key=lambda x: x["date"], reverse=True)
    for m in index["months"]:
        m["dates"].sort(key=lambda x: x["date"], reverse=True)

    index["categories"] = [
        {"id": k, "name": v["name"], "icon": v["icon"]}
        for k, v in sorted(CATEGORIES.items())
    ]

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"✅ 索引已生成：{OUTPUT}")
    print(f"   - {len(index['dates'])} 天")
    print(f"   - {len(index['months'])} 个月份")
    print(f"   - {len(index['categories'])} 个分类")

    # 知识索引统计（按模块拆分）
    ki_dir = os.path.join(os.path.dirname(NEWS_DIR), "task")
    total_records = 0
    module_count = 0
    if os.path.isdir(ki_dir):
        for fname in os.listdir(ki_dir):
            if fname.startswith("knowledge-index-") and fname.endswith(".json"):
                module_count += 1
                fpath = os.path.join(ki_dir, fname)
                try:
                    with open(fpath, 'r', encoding='utf-8') as f:
                        total_records += len(json.load(f))
                except (UnicodeDecodeError, json.JSONDecodeError) as e:
                    print(f"   ⚠️ 跳过 {fname}: {e}")
        print(f"   - 知识索引: {total_records} 条记录, {module_count} 个模块")
    else:
        print(f"   - 知识索引: task/ 目录不存在，跳过")

if __name__ == "__main__":
    scan()
