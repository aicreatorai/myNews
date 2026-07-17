#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify-quality.py — myNews 新闻质量门禁

对单日各模块做硬性质量校验，输出 JSON 报告 + 人类可读摘要。
任一模块触发 CRITICAL 失败则退出码 1（供自动化判定是否进入纠错批次）。

校验维度：
  1. 条数：知识模块固定条数；新闻模块 ≥6。
  2. 深度（中文字数/条）：知识 ≥ 知识下限；新闻 ≥ 新闻下限。
  3. 结构（知识模块）：必须含 导语/它是什么/解决/原理/动手/对比/来源 七块语义。
  4. 来源：知识每条 ≥2 个独立来源项；新闻每条 ≥1 个。

用法：
  python3 scripts/verify-quality.py --date 20260717
  python3 scripts/verify-quality.py --date 20260717 --json report.json
"""
import os, re, glob, json, argparse, sys

BASE = "/Users/ysrtc/Desktop/myNews/news"
KNOW = {"07_AI知识点","08_AI工具使用","09_开发语言","10_GitHubSkills",
        "12_AI创业","13_AI教育","14_个人成长","15_AI产品经理"}
NEWS = {"01_今日头条","05_科技前沿","06_科技动态","11_移动开发"}

# 知识模块固定条数
KNOW_COUNT = {"07":6,"08":6,"09":6,"10":6,"12":6,"13":5,"14":6,"15":6}

# 深度下限（中文字/条）
KNOW_AVG_FLOOR, KNOW_MIN_FLOOR = 850, 700
NEWS_AVG_FLOOR, NEWS_MIN_FLOOR = 700, 550

STRUCT_BLOCKS = [
    ("导语",  r"导语"),
    ("它是什么", r"它是什么|是什么|▌\s*它"),
    ("解决",  r"解决"),
    ("原理",  r"原理"),
    ("动手验证", r"动手|验证"),
    ("对比选型", r"对比"),
    ("来源",  r"来源"),
]

def cjk_count(s):
    return len(re.findall(r"[\u4e00-\u9fff]", s))

def split_entries(txt):
    parts = re.split(r"(?m)^###\s+", txt)
    return [p for p in parts[1:]]

def count_sources(entry):
    """粗略统计一条的来源项数：在 entry 中找出所有 '来源：' 行，对每条按
    / 、 ； ; 换行 切分计数，取最大值（避免误匹配正文内嵌的 '来源：XX'）。"""
    best = 0
    for m in re.finditer(r"来源[^\n：:]*[：:]\s*(.+?)(?=\n#|\Z)", entry, re.S):
        seg = m.group(1)
        items = re.split(r"[／/、；;\n]", seg)
        items = [x.strip(" )）】]*`") for x in items if x.strip(" )）】]*`")]
        items = [x for x in items if len(x) >= 2]
        c = max(len(items), len(re.findall(r"https?://|arXiv", seg)))
        if c > best:
            best = c
    if best == 0:
        # 退而求其次：统计 URL / arXiv 迹象
        best = len(re.findall(r"https?://|arXiv", entry))
    return best

def verify_module(mod, path):
    txt = open(path, encoding="utf-8").read()
    entries = split_entries(txt)
    n = len(entries)
    counts = [cjk_count(e) for e in entries]
    issues = []
    critical = False

    is_know = mod in KNOW
    # 条数
    if is_know:
        want = KNOW_COUNT.get(mod[:2])
        if n != want:
            issues.append(f"条数 {n} ≠ 固定值 {want}")
            critical = True
    else:
        if n < 6:
            issues.append(f"条数 {n} < 6")
            critical = True

    # 深度
    if counts:
        avg = sum(counts)/len(counts); mn = min(counts)
        if is_know:
            if avg < KNOW_AVG_FLOOR:
                issues.append(f"深度均值 {avg:.0f} < {KNOW_AVG_FLOOR}"); critical = True
            if mn < KNOW_MIN_FLOOR:
                issues.append(f"最浅条目 {mn} < {KNOW_MIN_FLOOR}"); critical = True
        else:
            if avg < NEWS_AVG_FLOOR:
                issues.append(f"深度均值 {avg:.0f} < {NEWS_AVG_FLOOR}"); critical = True
            if mn < NEWS_MIN_FLOOR:
                issues.append(f"最浅条目 {mn} < {NEWS_MIN_FLOOR}"); critical = True
    else:
        issues.append("未解析到条目"); critical = True

    # 结构（仅知识模块）
    struct_missing = []
    if is_know:
        for name, pat in STRUCT_BLOCKS:
            if not re.search(pat, txt):
                struct_missing.append(name)
        if struct_missing:
            issues.append(f"缺结构块: {','.join(struct_missing)}"); critical = True

    # 来源
    src_under = []
    src_floor = 2 if is_know else 1
    for i, e in enumerate(entries, 1):
        if count_sources(e) < src_floor:
            src_under.append(i)
    if src_under:
        issues.append(f"来源不足(需≥{src_floor})条目: {src_under}")
        # 来源不足视为重要但不一定阻断（除非全部缺失）
        if len(src_under) >= max(1, len(entries)//2):
            critical = True

    return {
        "module": mod,
        "type": "knowledge" if is_know else "news",
        "entries": n,
        "depth_avg": round(sum(counts)/len(counts)) if counts else 0,
        "depth_min": min(counts) if counts else 0,
        "struct_missing": struct_missing,
        "src_under": src_under,
        "issues": issues,
        "critical": critical,
        "pass": len(issues) == 0,
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True, help="YYYYMMDD")
    ap.add_argument("--json", help="输出 JSON 报告路径")
    args = ap.parse_args()

    d = args.date
    ym = d[:6]
    folder = os.path.join(BASE, ym, d)
    if not os.path.isdir(folder):
        print(f"❌ 目录不存在: {folder}", file=sys.stderr)
        sys.exit(2)

    mods = sorted({os.path.basename(f)[:-3] for f in glob.glob(os.path.join(folder, "*.md"))
                   if not f.endswith("_PRE_GEN_CONTEXT.md")})
    # 仅校验 12 个主模块
    targets = [m for m in mods if m.split("_")[0] in
               {"01","05","06","07","08","09","10","11","12","13","14","15"}]

    results = []
    for mod in targets:
        p = os.path.join(folder, mod + ".md")
        if os.path.exists(p):
            results.append(verify_module(mod, p))
        else:
            results.append({"module": mod, "issues": ["文件缺失"], "critical": True, "pass": False})

    # 摘要
    fails = [r for r in results if not r["pass"]]
    crits = [r for r in results if r["critical"]]
    print(f"质量门禁报告 — {d}  ({len(results)} 模块)")
    print("="*70)
    for r in results:
        tag = "✅" if r["pass"] else ("⚠️" if not r["critical"] else "❌")
        print(f"{tag} {r['module']:14s} 条{r['entries']} 均深{r['depth_avg']:>4} 最浅{r['depth_min']:>4}"
              + (f"  | {'; '.join(r['issues'])}" if r['issues'] else "  全合格"))
    print("="*70)
    print(f"合格 {len(results)-len(fails)}/{len(results)}  严重失败(需纠错) {len(crits)}")
    if crits:
        print("需纠错模块: " + ", ".join(r["module"] for r in crits))

    report = {"date": d, "modules": results,
              "failed": [r["module"] for r in fails],
              "critical": [r["module"] for r in crits]}
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

    sys.exit(1 if crits else 0)

if __name__ == "__main__":
    main()
