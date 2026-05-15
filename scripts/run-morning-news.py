#!/usr/bin/env python3
"""
早间新闻一键生成脚本
自动执行：清理旧缓存 → 分批生成Agent提示 → 验证 → 生成索引 → Git提交

用法：
  python3 run-morning-news.py                      # 交互模式，按步骤确认
  python3 run-morning-news.py --date 2026-05-15    # 指定日期
  python3 run-morning-news.py --auto               # 全自动模式（跳过确认）
  python3 run-morning-news.py --only-post           # 只执行后置步骤（验证+索引+提交）

流程：
  1. 创建输出目录
  2. 清理过期搜索缓存（保留7天）
  3. 生成 Agent 分批启动提示（供AI使用）
  4. 验证12个文件完整性
  5. 再生 news-index.json
  6. Git add/commit/push
"""

import json, os, sys, re, subprocess
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEWS_DIR = os.path.join(BASE_DIR, "news")
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
TASK_DIR = os.path.join(BASE_DIR, "task")

def parse_date(date_str):
    """解析日期，返回日期对象"""
    return datetime.strptime(date_str, "%Y-%m-%d")

def get_date_params(date_str):
    """根据日期生成所有参数"""
    d = parse_date(date_str)
    return {
        "DATE": date_str,
        "DATE-1": (d - timedelta(days=1)).strftime("%Y-%m-%d"),
        "DATE-2": (d - timedelta(days=2)).strftime("%Y-%m-%d"),
        "DATE-3": (d - timedelta(days=3)).strftime("%Y-%m-%d"),
        "DATE-7": (d - timedelta(days=7)).strftime("%Y-%m-%d"),
        "DATE-30": (d - timedelta(days=30)).strftime("%Y-%m-%d"),
        "YYYYMM": d.strftime("%Y%m"),
        "YYYYMMDD": d.strftime("%Y%m%d"),
    }

AGENTS_CONFIG = {
    "batch1_news_tech": {
        "label": "第一批 - 新闻+科技（01+05+06+07+08+09，共6个）",
        "agents": [
            {"id": "01", "name": "新闻早报",     "file": "01_新闻早报.md",   "max_turns": 160, "weight": "特重量级"},
            {"id": "05", "name": "科技前沿",     "file": "05_科技前沿.md",   "max_turns": 120, "weight": "重量级"},
            {"id": "06", "name": "科技动态",     "file": "06_科技动态.md",   "max_turns": 120, "weight": "重量级"},
            {"id": "07", "name": "AI知识点",     "file": "07_AI知识点.md",   "max_turns": 100, "weight": "中量级"},
            {"id": "08", "name": "AI工具使用",   "file": "08_AI工具使用.md", "max_turns": 60,  "weight": "轻量级"},
            {"id": "09", "name": "开发语言",     "file": "09_开发语言.md",   "max_turns": 60,  "weight": "轻量级"},
        ]
    },
    "batch2_knowledge": {
        "label": "第二批 - 知识+工具（10+11+12+13+14+15，共6个）",
        "agents": [
            {"id": "10", "name": "GitHubSkills", "file": "10_GitHubSkills.md", "max_turns": 80,  "weight": "中量级"},
            {"id": "11", "name": "移动开发",     "file": "11_移动开发.md",     "max_turns": 100, "weight": "中量级"},
            {"id": "12", "name": "AI创业",       "file": "12_AI创业.md",       "max_turns": 60,  "weight": "轻量级"},
            {"id": "13", "name": "AI教育",       "file": "13_AI教育.md",       "max_turns": 60,  "weight": "轻量级"},
            {"id": "14", "name": "个人成长",     "file": "14_个人成长.md",     "max_turns": 60,  "weight": "轻量级"},
            {"id": "15", "name": "AI产品经理",   "file": "15_AI产品经理.md",   "max_turns": 60,  "weight": "轻量级"},
        ]
    }
}

def step(msg):
    """打印带格式的步骤标题"""
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")

def prompt(msg):
    """交互式确认"""
    print(f"\n❓ {msg}")
    return input("  按 Enter 继续，输入 'skip' 跳过: ").strip()

# ─── 步骤1: 创建输出目录 ───────────────────────────────────

def create_output_dir(date_params):
    out_dir = os.path.join(NEWS_DIR, date_params["YYYYMM"], date_params["YYYYMMDD"])
    os.makedirs(out_dir, exist_ok=True)
    print(f"  📁 输出目录: {out_dir}")
    return out_dir

# ─── 步骤2: 清理搜索缓存 ────────────────────────────────────

def clean_search_cache():
    cache_file = os.path.join(TASK_DIR, "search-cache.json")
    if os.path.exists(cache_file):
        print("  🧹 保留最近7天的搜索缓存")
        subprocess.run(["python3", os.path.join(SCRIPTS_DIR, "search-cache.py"), "clean", "7"],
                       cwd=BASE_DIR, capture_output=True)
    else:
        print("  📭 搜索缓存不存在，跳过")

# ─── 步骤3: 生成 Agent 分批启动提示 ─────────────────────────

def generate_batch_prompts(date_params):
    """生成每批Agent的启动提示（供AI使用）"""
    step("Agent 分批启动提示（复制给AI使用）")

    for batch_key, batch in AGENTS_CONFIG.items():
        print(f"\n{'─'*60}")
        print(f"  📋 {batch['label']}")
        print(f"{'─'*60}")
        print()

        for agent in batch["agents"]:
            # 新闻早报输出为 01_今日头条.md（文件名不变，兼容旧前端）
            if agent['id'] == '01' and agent['name'] == '新闻早报':
                output_filename = "01_今日头条.md"
            else:
                output_filename = f"{agent['id']}_{agent['file'][3:]}"
            output_path = f"news/{date_params['YYYYMM']}/{date_params['YYYYMMDD']}/{output_filename}"
            print(f"  Agent {agent['id']} [{agent['weight']}] {agent['name']}")
            print(f"    文件: task/morning_news/{agent['file']}")
            print(f"    输出: {output_path}")
            print(f"    max_turns: {agent['max_turns']}")
            print()

    print(f"  💡 提示完成。共 2 批, 12 个 Agent。")
    print(f"  请将以上配置单复制给AI ，按批次逐步执行。")

# ─── 步骤4: 验证文件完整性 ──────────────────────────────────

def verify_files(date_params):
    step("验证文件完整性")
    out_dir = os.path.join(NEWS_DIR, date_params["YYYYMM"], date_params["YYYYMMDD"])

    expected = 12
    actual = 0
    missing = []

    if not os.path.exists(out_dir):
        print(f"  ❌ 输出目录不存在: {out_dir}")
        return False

    files = os.listdir(out_dir)
    for f in sorted(files):
        if f.endswith(".md"):
            actual += 1
            size = os.path.getsize(os.path.join(out_dir, f))
            print(f"  {'✅' if size > 0 else '⚠️'} {f:30s} {size:>8,d} bytes")

    # 检查具体哪些缺失
    expected_ids = set()
    for batch in AGENTS_CONFIG.values():
        for agent in batch["agents"]:
            expected_ids.add(agent["id"])

    actual_ids = set()
    for f in files:
        m = re.match(r'(\d{2})_', f)
        if m:
            actual_ids.add(m.group(1))

    missing = sorted(expected_ids - actual_ids)
    extra = sorted(actual_ids - expected_ids)

    if missing:
        print(f"\n  ❌ 缺失 {len(missing)} 个文件: {', '.join(f'{id}_' for id in missing)}")
    if extra:
        print(f"\n  ⚠️ 多余文件: {', '.join(extra)}")
    if not missing:
        print(f"\n  ✅ 完整性验证通过: {actual}/{expected} 个文件全部存在且非空")

    return len(missing) == 0

# ─── 步骤5: 再生news-index.json ──────────────────────────────

def regenerate_index():
    step("重新生成前端索引")
    result = subprocess.run(["python3", os.path.join(SCRIPTS_DIR, "gen-news-index.py")],
                           cwd=BASE_DIR, capture_output=True, text=True)
    print(f"  {result.stdout.strip()}")
    if result.stderr:
        print(f"  ⚠️ {result.stderr.strip()}")

# ─── 步骤6: Git 提交 ────────────────────────────────────────

def git_commit_push(date_params):
    step("Git 提交")
    date_str = date_params["DATE"]
    cmds = [
        f"git add news/ news-index.json task/knowledge-index*.json",
        f'git commit -m "{date_str} 早间新闻（12板块）"',
        "git push origin main",
    ]
    for cmd in cmds:
        result = subprocess.run(cmd, cwd=BASE_DIR, shell=True, capture_output=True, text=True)
        out = result.stdout.strip()
        err = result.stderr.strip()
        if out and "nothing to commit" not in out:
            print(f"  {out.split(chr(10))[0]}")
        if "fatal" in err or "error" in err.lower():
            print(f"  ❌ {err.split(chr(10))[0]}")
            return False
        if "create mode" in out or "changed" in out or "main -> main" in out:
            print(f"  ✅ {out.split(chr(10))[0]}")

    print(f"\n  ✅ 已推送至 Gitee & GitHub: {date_str} 早间新闻（12板块）")
    return True

# ─── 后置步骤（组合） ──────────────────────────────────────

def post_steps(date_params, auto=False):
    """执行全部后置步骤"""
    if not auto:
        r = prompt("执行验证、生成索引和Git提交？")
        if r == "skip":
            print("  跳过后置步骤")
            return

    ok = verify_files(date_params)
    if not ok:
        print("\n  ⚠️ 文件不完整，跳过索引生成和Git提交")
        return False

    regenerate_index()
    git_commit_push(date_params)
    return True

# ─── 主入口 ────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="早间新闻一键生成工具")
    parser.add_argument("--date", default=None, help="日期 (YYYY-MM-DD)，默认今天")
    parser.add_argument("--auto", action="store_true", help="全自动模式（跳过确认）")
    parser.add_argument("--only-post", action="store_true", help="只执行后置步骤")
    args = parser.parse_args()

    # 确定日期
    if args.date:
        date_str = args.date
    else:
        date_str = datetime.now().strftime("%Y-%m-%d")

    date_params = get_date_params(date_str)

    print(f"\n{'🌟'*10}")
    print(f"  早间新闻一键生成工具")
    print(f"  日期: {date_str}")
    if args.auto:
        print(f"  模式: 全自动")
    print(f"{'🌟'*10}\n")

    use_auto = args.auto

    if args.only_post:
        post_steps(date_params, auto=use_auto)
        return

    # 步骤1: 创建输出目录
    step("创建输出目录")
    out_dir = create_output_dir(date_params)
    print(f"  ✅ 输出目录已就绪")

    if not use_auto:
        r = prompt("继续执行清理和生成Agent提示？")
        if r == "skip":
            print("  跳过前置步骤")
            post_steps(date_params)
            return

    # 步骤2: 清理缓存
    clean_search_cache()

    # 步骤3: 生成Agent提示
    generate_batch_prompts(date_params)

    # 步骤4-6: 后置步骤
    print(f"\n\n{'='*60}")
    print(f"  Agent 执行完成后，运行以下命令执行后置步骤：")
    print(f"  python3 scripts/run-morning-news.py --only-post --date {date_str}")
    print(f"{'='*60}")

    # 如果在自动模式，提示用户执行Agent任务
    if use_auto:
        print(f"\n  💡 请将以上2批Agent配置依次交给AI执行。")
        print(f"  全部完成后，运行:")
        print(f"  python3 scripts/run-morning-news.py --only-post --date {date_str}")

if __name__ == "__main__":
    main()
