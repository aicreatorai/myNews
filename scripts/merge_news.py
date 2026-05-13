#!/usr/bin/env python3
"""
合并 17 个板块文件为前端兼容的单文件格式。
用法: python3 scripts/merge_news.py <日期: YYYYMMDD>
示例: python3 scripts/merge_news.py 20260513
"""

import sys
import os
import json
import re

# 项目根目录
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 17 个板块的映射（编号 → 标题）
SECTIONS = [
    ("01", "一", "🔥", "今日头条"),
    ("02", "二", "🤖", "科技热点"),
    ("03", "三", "🧠", "AI与前沿科技"),
    ("04", "四", "💻", "软件开发"),
    ("05", "五", "🔤", "开发语言"),
    ("06", "六", "🔶", "华为开发生态"),
    ("07", "七", "🍎", "iOS开发生态"),
    ("08", "八", "🤖", "Android开发生态"),
    ("09", "九", "🌐", "跨平台开发生态"),
    ("10", "十", "📲", "移动端生态"),
    ("11", "十一", "🧩", "AI开发生态"),
    ("12", "十二", "⭐", "GitHub实用Skills"),
    ("13", "十三", "💡", "AI知识点"),
    ("14", "十四", "📱", "产品发布"),
    ("15", "十五", "🏠", "国内热点"),
    ("16", "十六", "🌍", "国际大事件"),
    ("17", "十七", "📈", "财经市场"),
]


def parse_date(datestr):
    """解析 YYYYMMDD 格式日期"""
    from datetime import datetime
    dt = datetime.strptime(datestr, "%Y%m%d")
    weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    return dt.year, dt.month, dt.day, weekdays[dt.weekday()]


def extract_glance_and_headline(filepath):
    """从板块文件中提取要点速览和头条"""
    glance = []
    headline = ""
    in_glance = False
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    for line in lines:
        if "要点速览" in line or "今日要点" in line:
            in_glance = True
            continue
        if in_glance:
            stripped = line.strip()
            # 数字列表项：1. **xxx** — yyy
            match = re.match(r"^\d+\.\s*\*\*(.+?)\*\*\s*[—\-–]\s*(.+)", stripped)
            if match:
                glance.append(f"{match.group(1)} — {match.group(2)}")
                if not headline:
                    headline = match.group(1)
            # 表格格式
            elif stripped.startswith("|") and not stripped.startswith("|---"):
                cells = [c.strip() for c in stripped.split("|") if c.strip()]
                if len(cells) >= 2 and "分类" not in cells[0] and "---" not in cells[0]:
                    glance.append(cells[1])
                    if not headline:
                        headline = cells[1]
            elif stripped.startswith("---") or stripped.startswith("##") or stripped == "":
                if not stripped.startswith("|") and not stripped.startswith("---"):
                    in_glance = False
        if not in_glance:
            if ("🔥 今日头条" in line and "：" in line) or ("🔥" in line and "：" in line):
                m = re.search(r"：(.+)", line)
                if m and not headline:
                    headline = m.group(1).strip()
    return glance, headline


def read_section_file(num, name):
    """读取板块文件的内容部分（去掉头部元数据）"""
    filepath = os.path.join(ROOT, "news", f"{year_month}", f"{datestr}", f"{num:02d}_{name}.md")
    alt_filepath = os.path.join(ROOT, "news", f"{year_month}", f"{datestr}", f"{num:02d}_{name}.md")
    # 尝试精确文件名
    for prefix in [f"{num:02d}_"]:
        for fname in os.listdir(os.path.join(ROOT, "news", f"{year_month}", f"{datestr}")):
            if fname == f"{prefix}{name}.md":
                filepath = os.path.join(ROOT, "news", f"{year_month}", f"{datestr}", fname)
                break
    
    if not os.path.exists(filepath):
        print(f"[警告] 文件不存在: {filepath}")
        return []
    
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 去掉文件头部（直到第一个 ### 或 ## 之前）
    lines = content.split("\n")
    content_start = 0
    for i, line in enumerate(lines):
        if line.startswith("###") or line.startswith("## "):
            content_start = i
            break
    
    # 如果整个文件就是一个 ### 块，从第一个 ### 开始
    return lines[content_start:]


def merge(datestr):
    """主合并逻辑"""
    year, month, day, weekday = parse_date(datestr)
    year_month = f"{year}{month:02d}"
    
    input_dir = os.path.join(ROOT, "news", year_month, datestr)
    if not os.path.isdir(input_dir):
        print(f"[错误] 目录不存在: {input_dir}")
        sys.exit(1)
    
    output_file = os.path.join(ROOT, "news", year_month, f"{datestr}_早间.md")
    
    # 收集所有板块的要点速览
    all_glance = {}
    all_headlines = []
    
    for num_cn, section_cn, emoji, name in SECTIONS:
        # 找到对应的文件
        fname = None
        for fn in os.listdir(input_dir):
            if fn.endswith(".md") and name in fn:
                fname = fn
                break
        if not fname:
            continue
        filepath = os.path.join(input_dir, fname)
        gl, hl = extract_glance_and_headline(filepath)
        if gl:
            all_glance[name] = gl[0] if len(gl) == 1 else gl[-1]
        if hl:
            all_headlines.append(hl)
    
    # 构建合并文件
    out_lines = []
    out_lines.append("# 📰 早间新闻简报")
    out_lines.append("")
    out_lines.append("| 项目 | 内容 |")
    out_lines.append("|------|------|")
    out_lines.append(f"| **日期** | {year}年{month}月{day}日 {weekday} |")
    out_lines.append(f"| **生成时间** | 07:00 |")
    out_lines.append(f"| **新闻时段** | 昨日07:00 - 今日07:00 |")
    out_lines.append(f"| **编辑** | AI新闻助手 |")
    out_lines.append("")
    out_lines.append("---")
    out_lines.append("")
    out_lines.append("## 📊 今日要点速览")
    out_lines.append("")
    out_lines.append("| 分类 | 热点关键词 |")
    out_lines.append("|------|-----------|")
    for _, _, emoji, name in SECTIONS:
        kw = all_glance.get(name, "")
        out_lines.append(f"| {emoji} {name} | {kw} |")
    out_lines.append("")
    if all_headlines:
        out_lines.append(f"**🔥 今日头条：** {all_headlines[0]}")
    out_lines.append("")
    out_lines.append("---")
    out_lines.append("")
    
    # 逐个追加板块内容
    for num_cn, section_cn, emoji, name in SECTIONS:
        out_lines.append(f"## {section_cn}、{emoji} {name}")
        out_lines.append("")
        
        # 读取板块文件内容
        lines = read_section_file(num_cn, name)
        if not lines:
            out_lines.append("*(暂无内容)*")
            out_lines.append("")
            out_lines.append("---")
            out_lines.append("")
            continue
        
        out_lines.extend(lines)
        # 确保末尾有换行
        if out_lines[-1] != "":
            out_lines.append("")
        out_lines.append("---")
        out_lines.append("")
    
    # 写入文件
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines))
    
    print(f"[成功] 合并完成: {output_file}")
    return output_file


def update_index(datestr, filepath):
    """更新 news-index.json"""
    index_path = os.path.join(ROOT, "news-index.json")
    with open(index_path, "r", encoding="utf-8") as f:
        index = json.load(f)
    
    year_month = datestr[:6]
    from datetime import datetime
    dt = datetime.strptime(datestr, "%Y%m%d")
    weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    day_label = f"{dt.month:02d}-{dt.day:02d} {weekdays[dt.weekday()]}"
    
    new_entry = {
        "date": datestr,
        "label": day_label,
        "type": "morning",
        "typeCN": "早间",
        "file": f"news/{year_month}/{datestr}_早间.md"
    }
    
    # 找到对应月份
    found_month = False
    for month in index["months"]:
        if month["id"] == year_month:
            # 检查是否已存在
            for day in month["days"]:
                if day["date"] == datestr and day["type"] == "morning":
                    day.update(new_entry)
                    print(f"[索引] 更新已有条目: {datestr}")
                    found_month = True
                    break
            if not found_month:
                month["days"].insert(0, new_entry)
                found_month = True
            break
    
    if not found_month:
        index["months"].insert(0, {
            "id": year_month,
            "label": f"{year_month[:4]}年{year_month[4:]}月",
            "days": [new_entry]
        })
    
    from datetime import datetime
    index["updated"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"[索引] 更新完成，已添加 {datestr}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python3 scripts/merge_news.py <日期: YYYYMMDD>")
        print("示例: python3 scripts/merge_news.py 20260513")
        sys.exit(1)
    
    datestr = sys.argv[1]
    if not re.match(r"^\d{8}$", datestr):
        print(f"[错误] 日期格式错误: {datestr}，应为 YYYYMMDD")
        sys.exit(1)
    
    year_month = datestr[:6]
    
    # 合并文件
    output = merge(datestr)
    
    # 更新索引
    update_index(datestr, output)
    
    print("\n✅ 全部完成！")
    print(f"   合并文件: {output}")
    print(f"   请刷新网页查看效果")
