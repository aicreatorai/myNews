#!/usr/bin/env python3
"""
合并 17 个板块文件为前端兼容的单文件格式，并更新索引。
用法: python3 scripts/merge_news.py <日期: YYYYMMDD>
"""

import sys, os, json, re
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (板块编号, 中文序号, emoji, 分类名称) — 与前端 CATEGORIES 顺序一致
SECTIONS = [
    ("01","一","🔥","今日头条"), ("02","二","🤖","科技热点"),
    ("03","三","🧠","AI与前沿科技"), ("04","四","💻","软件开发"),
    ("05","五","🔤","开发语言"), ("06","六","🔶","华为开发生态"),
    ("07","七","🍎","iOS开发生态"), ("08","八","🤖","Android开发生态"),
    ("09","九","🌐","跨平台开发生态"), ("10","十","📲","移动端生态"),
    ("11","十一","🧩","AI开发生态"), ("12","十二","⭐","GitHub实用Skills"),
    ("13","十三","💡","AI知识点"), ("14","十四","📱","产品发布"),
    ("15","十五","🏠","国内热点"), ("16","十六","🌍","国际大事件"),
    ("17","十七","📈","财经市场"),
]


def main(datestr):
    if not re.match(r"^\d{8}$", datestr):
        print(f"[错误] 日期格式: {datestr}，应为 YYYYMMDD"); sys.exit(1)

    dt = datetime.strptime(datestr, "%Y%m%d")
    ym = datestr[:6]
    weekdays = ["周一","周二","周三","周四","周五","周六","周日"]
    weekday = weekdays[dt.weekday()]

    input_dir = os.path.join(ROOT, "news", ym, datestr)
    output_file = os.path.join(ROOT, "news", ym, f"{datestr}_早间.md")

    if not os.path.isdir(input_dir):
        print(f"[错误] 目录不存在: {input_dir}"); sys.exit(1)

    # ---- 遍历目录找到所有板块文件 ----
    section_files = {}
    for fname in os.listdir(input_dir):
        if not fname.endswith(".md"):
            continue
        # 匹配 01_今日头条.md 这类文件名
        m = re.match(r"^(\d+)_(.+)\.md$", fname)
        if m:
            section_files[m.group(1)] = os.path.join(input_dir, fname)

    # ---- 构建合并内容 ----
    out = []
    out.append("# 📰 早间新闻简报")
    out.append("")
    out.append("| 项目 | 内容 |")
    out.append("|------|------|")
    out.append(f"| **日期** | {dt.year}年{dt.month}月{dt.day}日 {weekday} |")
    out.append(f"| **生成时间** | 07:00 |")
    out.append(f"| **新闻时段** | {datestr[:4]}-{datestr[4:6]}-{datestr[6:8]} 07:00 前 24 小时 |")
    out.append(f"| **编辑** | AI新闻助手 |")
    out.append("")
    out.append("---")
    out.append("")
    out.append("## 📊 今日要点速览")
    out.append("")
    out.append("| 分类 | 热点关键词 |")
    out.append("|------|-----------|")

    # 收集要点速览
    all_glance = {}
    first_headline = ""
    for num, cn, emoji, name in SECTIONS:
        if num not in section_files:
            out.append(f"| {emoji} {name} | |")
            continue
        fp = section_files[num]
        with open(fp, "r", encoding="utf-8") as f:
            raw = f.read()
        # 从文件中提取关键词
        kw = ""
        for line in raw.split("\n"):
            s = line.strip()
            # 数字列表项
            m2 = re.match(r"^\d+\.\s*\*\*(.+?)\*\*\s*[—\-–]", s)
            if m2:
                kw = m2.group(1)
                if not first_headline:
                    first_headline = kw
                break
        all_glance[num] = kw

    for num, cn, emoji, name in SECTIONS:
        kw = all_glance.get(num, "")
        out.append(f"| {emoji} {name} | {kw} |")

    out.append("")
    out.append(f"**🔥 今日头条：** {first_headline}")
    out.append("")
    out.append("---")
    out.append("")

    # ---- 追加各板块内容 ----
    for num, cn, emoji, name in SECTIONS:
        out.append(f"## {cn}、{emoji} {name}")
        out.append("")
        if num not in section_files:
            out.append("*(暂无内容)*")
            out.append("")
            out.append("---")
            out.append("")
            continue

        fp = section_files[num]
        with open(fp, "r", encoding="utf-8") as f:
            lines = f.read().split("\n")

        # 去掉文件头部（第一个 ### 之前的内容）
        start = 0
        for i, line in enumerate(lines):
            if line.startswith("### "):
                start = i
                break

        content = lines[start:]
        out.extend(content)
        if out[-1] != "":
            out.append("")
        out.append("---")
        out.append("")

    # ---- 写入文件 ----
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"[成功] 合并完成: {output_file}")

    # ---- 更新 news-index.json ----
    index_path = os.path.join(ROOT, "news-index.json")
    with open(index_path, "r", encoding="utf-8") as f:
        idx = json.load(f)

    new_entry = {
        "date": datestr,
        "label": f"{dt.month:02d}-{dt.day:02d} {weekday}",
        "type": "morning",
        "typeCN": "早间",
        "file": f"news/{ym}/{datestr}_早间.md",
        "dir": f"news/{ym}/{datestr}/"
    }

    found = False
    for m in idx["months"]:
        if m["id"] == ym:
            for d in m["days"]:
                if d["date"] == datestr and d["type"] == "morning":
                    d.update(new_entry)
                    found = True
                    break
            if not found:
                m["days"].insert(0, new_entry)
                found = True
            break

    if not found:
        idx["months"].insert(0, {
            "id": ym,
            "label": f"{ym[:4]}年{ym[4:6]}月",
            "days": [new_entry]
        })

    idx["updated"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)
    print(f"[索引] 更新完成，已添加 {datestr}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python3 scripts/merge_news.py <日期: YYYYMMDD>"); sys.exit(1)
    main(sys.argv[1])
