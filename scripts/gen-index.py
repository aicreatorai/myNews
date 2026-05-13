#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen-index.py  —  扫描 news/ 目录，生成 news-index.json
每次生成新闻后运行此脚本，保持索引最新。
用法：python3 scripts/gen-index.py
"""

import os
import json
import re
from datetime import datetime, date

NEWS_DIR   = os.path.join(os.path.dirname(os.path.dirname(__file__)), "news")
OUTPUT     = os.path.join(os.path.dirname(os.path.dirname(__file__)), "news-index.json")
SW_FILE    = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sw.js")
APP_FILE   = os.path.join(os.path.dirname(os.path.dirname(__file__)), "js", "app.js")

WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

def weekday_cn(d: date) -> str:
    return WEEKDAYS[d.weekday()]

def parse_filename(fname: str):
    """
    解析文件名，返回 (datestr, type_label, type_key) 或 None。
    支持：20260429_早间.md  /  20260426_周报.md
    """
    m = re.match(r"^(\d{8})_(早间|周报|午间|晚间)\.md$", fname)
    if not m:
        return None
    datestr = m.group(1)
    type_cn = m.group(2)
    type_map = {"早间": "morning", "午间": "noon", "晚间": "evening", "周报": "weekly"}
    return datestr, type_cn, type_map.get(type_cn, type_cn)

def build_index():
    months_map = {}  # { "202604": { label, days: [] } }

    for month_dir in sorted(os.listdir(NEWS_DIR), reverse=True):
        month_path = os.path.join(NEWS_DIR, month_dir)
        if not os.path.isdir(month_path) or not re.match(r"^\d{6}$", month_dir):
            continue

        year  = int(month_dir[:4])
        month = int(month_dir[4:])
        month_label = f"{year}年{month:02d}月"

        days = []
        for fname in sorted(os.listdir(month_path), reverse=True):
            parsed = parse_filename(fname)
            if not parsed:
                continue
            datestr, type_cn, type_key = parsed
            try:
                d = date(int(datestr[:4]), int(datestr[4:6]), int(datestr[6:8]))
            except ValueError:
                continue

            days.append({
                "date":  datestr,
                "label": f"{d.month:02d}-{d.day:02d} {weekday_cn(d)}",
                "type":  type_key,
                "typeCN": type_cn,
                "file":  f"news/{month_dir}/{fname}"
            })

        if days:
            months_map[month_dir] = {
                "id":    month_dir,
                "label": month_label,
                "days":  days
            }

    months_list = [months_map[k] for k in sorted(months_map.keys(), reverse=True)]

    index = {
        "updated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "months":  months_list
    }
    return index

def bump_sw_version():
    """每次生成新索引时，更新 sw.js 中的 CACHE_VERSION，触发 SW 更新缓存"""
    if not os.path.exists(SW_FILE):
        return
    with open(SW_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    # 用当前时间戳作为版本号（格式 vYYYYMMDD-HHMMSS）
    new_ver = "v" + datetime.now().strftime("%Y%m%d-%H%M%S")
    updated = re.sub(
        r"(const CACHE_VERSION\s*=\s*')[^']*(')",
        lambda m: m.group(1) + new_ver + m.group(2),
        content
    )
    if updated != content:
        with open(SW_FILE, "w", encoding="utf-8") as f:
            f.write(updated)
        print(f"   SW 缓存版本已更新：{new_ver}")
    return new_ver

def bump_app_version(version):
    """同步更新 app.js 中的 APP_VERSION，确保版本检测生效"""
    if not os.path.exists(APP_FILE):
        return
    with open(APP_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    updated = re.sub(
        r"(const APP_VERSION\s*=\s*')[^']*(')",
        lambda m: m.group(1) + version + m.group(2),
        content
    )
    if updated != content:
        with open(APP_FILE, "w", encoding="utf-8") as f:
            f.write(updated)

def main():
    index = build_index()
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    total = sum(len(m["days"]) for m in index["months"])
    print(f"✅ news-index.json 已生成：{len(index['months'])} 个月份，共 {total} 期新闻")
    print(f"   输出路径：{OUTPUT}")
    ver = bump_sw_version()
    bump_app_version(ver)

if __name__ == "__main__":
    main()
