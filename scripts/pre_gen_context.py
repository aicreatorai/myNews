#!/usr/bin/env python3
"""
pre_gen_context.py — 生成前上下文构建工具

自动从最近N天的新闻中提取：
1. 每个模块的近期标题列表（防重复）
2. 禁止主题词（3日内出现过的关键词）
3. 生成上下文文件供Agent在生成前阅读

用法:
  python3 scripts/pre_gen_context.py <YYYY-MM-DD>    # 生成当日上下文文件
  python3 scripts/pre_gen_context.py <YYYY-MM-DD> -d 5  # 回溯5天
"""

import os, sys, re, json
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter

NEWS_DIR = Path(__file__).parent.parent / "news"

# 知识模块列表（需要主题轮换的模块）
KNOWLEDGE_MODULES = ["07", "08", "09", "12", "13", "14", "15"]

# 排除词（停用词，不进入禁止主题列表）
STOP_WORDS = {
    "的", "是", "在", "和", "了", "有", "从", "到", "与", "及", "或", "等",
    "为", "以", "对", "向", "把", "被", "让", "使", "将", "不", "也", "就",
    "都", "而", "但", "却", "只", "还", "又", "要", "会", "可", "能",
    "一个", "一种", "这个", "那个", "这些", "那些", "每个", "所有", "任何",
    "已", "更", "最", "很", "太", "非常", "正在", "已经", "如果", "因为",
    "所以", "然", "并", "且", "进行", "可以", "需要", "月", "日", "最新",
    "之间", "一下", "方面", "最新版", "什么", "如何", "为什么",
}


def get_news_days(date_str: str, lookback: int) -> list:
    """获取最近N天的新闻目录列表"""
    target = datetime.strptime(date_str, "%Y-%m-%d")
    days = []
    for i in range(1, lookback + 1):
        d = target - timedelta(days=i)
        yyyymm = d.strftime("%Y%m")
        yyyymmdd = d.strftime("%Y%m%d")
        dir_path = NEWS_DIR / yyyymm / yyyymmdd
        if dir_path.exists():
            days.append((d.strftime("%Y-%m-%d"), dir_path))
    return days


def extract_titles(filepath: Path) -> list[str]:
    """从新闻文件中提取所有文章标题"""
    try:
        content = filepath.read_text(encoding='utf-8')
    except Exception:
        return []
    # 匹配 ### 1. [标签] 标题 或 ### 1. 标题
    titles = re.findall(r'###\s+\d+\.\s*(?:\[.*?\]\s*)?(.*?)(?:\n|$)', content)
    return [t.strip() for t in titles if len(t.strip()) > 5]


def extract_keywords(title: str, min_len: int = 3, max_len: int = 6) -> list[str]:
    """从标题中提取有意义的关键词"""
    words = re.findall(rf'[\u4e00-\u9fff]{{{min_len},{max_len}}}', title)
    return [w for w in words if w not in STOP_WORDS]


def build_forbidden_topics(days: list, module: str) -> list[str]:
    """为指定模块构建禁止主题关键词列表"""
    all_keywords = []
    for date_str, dir_path in days:
        for f in sorted(dir_path.glob(f"{module}_*.md")):
            titles = extract_titles(f)
            for t in titles:
                kws = extract_keywords(t)
                all_keywords.extend(kws)
    
    counter = Counter(all_keywords)
    # 出现2次及以上的关键词视为禁止主题
    forbidden = [kw for kw, cnt in counter.most_common(30) if cnt >= 2]
    return forbidden


def build_module_history(days: list, module: str) -> list[dict]:
    """构建指定模块的历史标题列表"""
    history = []
    for date_str, dir_path in days:
        for f in sorted(dir_path.glob(f"{module}_*.md")):
            titles = extract_titles(f)
            for t in titles:
                history.append({"date": date_str, "title": t})
    return history


def generate_context_file(date_str: str, lookback: int = 5):
    """生成完整上下文文件"""
    days = get_news_days(date_str, lookback)
    if not days:
        print(f"⚠️ 未找到 {date_str} 之前 {lookback} 天内的历史新闻", file=sys.stderr)
        return None
    
    output_dir = NEWS_DIR / datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y%m") / datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y%m%d")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "_PRE_GEN_CONTEXT.md"
    
    lines = []
    lines.append(f"# 生成前上下文参考")
    lines.append(f"")
    lines.append(f"> **生成日期**: {date_str} | **回溯天数**: {lookback}天")
    lines.append(f"> **用途**: 避免跨日/跨模块重复，指导主题轮换")
    lines.append(f"")
    
    # 1. 各模块近期标题
    lines.append("---")
    lines.append("")
    lines.append("## 📋 各模块近期已覆盖主题")
    lines.append("")
    lines.append("> ⚠️ **严禁**重复以下标题或核心观点，除非有实质性新进展。")
    lines.append("")
    
    all_modules = set()
    for _, dir_path in days:
        for f in dir_path.glob("*.md"):
            mod = f.name[:2]
            all_modules.add(mod)
    
    for mod in sorted(all_modules):
        history = build_module_history(days, mod)
        if not history:
            continue
        
        lines.append(f"### 模块 {mod}")
        lines.append("")
        recent = history[-15:]  # 最近15条
        for item in recent:
            lines.append(f"- [{item['date']}] {item['title']}")
        lines.append("")
    
    # 2. 禁止主题词（知识模块）
    lines.append("---")
    lines.append("")
    lines.append("## 🚫 禁止主题关键词（知识模块07/08/09/12/13/14/15）")
    lines.append("")
    lines.append("> 以下关键词在近3-5天内已被充分覆盖，**禁止**作为主要选题，除非有重大更新。")
    lines.append("")
    
    for mod in KNOWLEDGE_MODULES:
        forbidden = build_forbidden_topics(days, mod)
        if forbidden:
            lines.append(f"### 模块 {mod} 禁止主题")
            lines.append(f"- 关键词：{'、'.join(forbidden[:15])}")
            lines.append("")
    
    # 3. 高频跨模块主题
    lines.append("---")
    lines.append("")
    lines.append("## 🔄 跨模块高频主题警示")
    lines.append("")
    lines.append("> 以下主题在近5天内跨多个模块高频出现，避免再次覆盖：")
    lines.append("")
    
    all_titles = []
    for mod in sorted(all_modules):
        history = build_module_history(days, mod)
        all_titles.extend(history)
    
    # 提取所有标题中的关键词，找高频词
    all_kws = []
    for item in all_titles:
        kws = extract_keywords(item['title'])
        all_kws.extend(kws)
    
    kw_counter = Counter(all_kws)
    hot_kws = [(kw, cnt) for kw, cnt in kw_counter.most_common(40) if cnt >= 4 and kw not in STOP_WORDS]
    if hot_kws:
        for kw, cnt in hot_kws[:20]:
            # 找出哪些模块出现过
            mods = set()
            for item in all_titles:
                if kw in item['title']:
                    # 从item date反推模块
                    pass
            lines.append(f"- **{kw}**（{cnt}次）→ 建议回避")
        lines.append("")
    
    # 4. 主题建议
    lines.append("---")
    lines.append("")
    lines.append("## 💡 选题建议")
    lines.append("")
    lines.append("1. **优先选择**上述列表中**未出现**的主题方向")
    lines.append("2. **知识模块**必须轮换层级（L1→L2→L3→L4 循环），禁止连续同一层级")
    lines.append("3. **同模块**连续3天不能出现相同核心关键词")
    lines.append("4. **跨模块**同一主题最多出现在2个不同模块中")
    lines.append("5. **新闻模块（01/05/06）**关注日度新事件，不覆盖30天前旧闻")
    lines.append("")
    
    content = "\n".join(lines)
    output_file.write_text(content, encoding='utf-8')
    
    print(f"✅ 上下文文件已生成: {output_file}")
    print(f"   回溯 {len(days)} 天 | {len(all_modules)} 个模块")
    return output_file


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python3 scripts/pre_gen_context.py <YYYY-MM-DD> [-d 天数]")
        sys.exit(1)
    
    date_str = sys.argv[1]
    lookback = 5
    
    # 解析参数
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '-d' and i + 1 < len(sys.argv):
            lookback = int(sys.argv[i + 1])
            i += 2
        else:
            i += 1
    
    generate_context_file(date_str, lookback)
