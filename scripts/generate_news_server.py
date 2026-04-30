#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
早间新闻生成脚本 - GitHub Actions / 服务器独立运行版

功能：
- 联网搜索最新新闻（使用 Tavily API）
- 调用 AI 生成新闻分析（支持 DeepSeek / OpenAI / 阿里通义等）
- 生成 17 个板块的 Markdown 新闻简报
- 自动推送到 GitHub

依赖：
- openai
- tavily-python
- python-dotenv
- requests

安装依赖：
    pip install -r requirements.txt

配置环境变量或 .env 文件：
    DEEPSEEK_API_KEY=sk-xxx
    TAVILY_API_KEY=tvly-xxx
    GITHUB_TOKEN=ghp_xxx

运行：
    python scripts/generate_news_server.py

GitHub Actions 定时：每天 UTC 00:00 = 北京时间 08:00
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/tmp/news_gen.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# 加载环境变量
load_dotenv()

# ============================================================
# 配置区域
# ============================================================

# AI API 配置（支持 DeepSeek / OpenAI / 阿里通义 等 OpenAI 兼容接口）
AI_CONFIG = {
    # DeepSeek（推荐，便宜且中文好）
    "deepseek": {
        "api_key": os.getenv("DEEPSEEK_API_KEY", ""),
        "base_url": "https://api.deepseek.com",
        "model": "deepseek-chat",
    },
    # OpenAI（可选）
    "openai": {
        "api_key": os.getenv("OPENAI_API_KEY", ""),
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o",
    },
    # 阿里通义（可选）
    "qwen": {
        "api_key": os.getenv("DASHSCOPE_API_KEY", ""),
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "model": "qwen-plus",
    },
}

# 搜索 API 配置
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

# GitHub 配置
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPO = os.getenv("GITHUB_REPO", "")

# 新闻板块配置（17个板块）
SECTIONS = [
    {
        "id": "today_headlines",
        "name": "今日头条",
        "emoji": "🔥",
        "count": (5, 10),
        "keywords": [
            "重大新闻 今日 2026",
            "时政要闻 2026年4月",
            "经济政策 最新 2026",
            "社会热点 今日 2026",
        ],
        "prompt_template": "今日头条板块，要求选择当日最重要、影响力最大的新闻，24小时以内发生的重大事件",
    },
    {
        "id": "tech_news",
        "name": "科技热点",
        "emoji": "🤖",
        "count": (5, 10),
        "keywords": [
            "AI大模型 最新 2026",
            "芯片半导体 出口管制 2026",
            "互联网平台 监管 2026",
            "科技公司 财报 2026",
            "量子计算 最新进展 2026",
        ],
        "prompt_template": "科技热点板块，覆盖 AI/大模型、科技公司动态、芯片半导体、互联网/APP、前沿科研等子领域",
    },
    {
        "id": "ai_frontier",
        "name": "AI与前沿科技",
        "emoji": "🧠",
        "count": (5, 10),
        "keywords": [
            "大模型 发布 2026年4月",
            "AI Agent 最新动态 2026",
            "具身智能 机器人 2026",
            "文生视频 AI 2026",
            "RAG MCP Agent 2026",
        ],
        "prompt_template": "AI与前沿科技板块，专注人工智能、大模型、前沿科技，需要技术深度和全球视野",
    },
    {
        "id": "software_dev",
        "name": "软件开发",
        "emoji": "💻",
        "count": (5, 10),
        "keywords": [
            "IDE 更新 2026",
            "框架 发布 新版本 2026",
            "开发工具 最新 2026",
            "开源项目 GitHub Trending 2026",
            "低代码 平台 更新 2026",
        ],
        "prompt_template": "软件开发板块，关注 IDE、框架、开发工具、开源项目等软件工程领域动态",
    },
    {
        "id": "dev_languages",
        "name": "开发语言",
        "emoji": "🔤",
        "count": (5, 10),
        "keywords": [
            "Python 更新 2026",
            "Rust 新版本 2026",
            "TypeScript 发布 2026",
            "Go语言 最新 2026",
            "Swift 更新 2026",
        ],
        "prompt_template": "开发语言板块，报道主流编程语言的版本更新、性能优化、生态发展",
    },
    {
        "id": "huawei_ecosystem",
        "name": "华为开发生态",
        "emoji": "🔶",
        "count": (5, 10),
        "keywords": [
            "鸿蒙HarmonyOS 更新 2026",
            "HarmonyOS NEXT 新版本 2026",
            "DevEco Studio 更新 2026",
            "华为 开发者生态 2026",
            "HMS 华为移动服务 2026",
        ],
        "prompt_template": "华为开发生态板块，关注鸿蒙系统、HarmonyOS、DevEco Studio、鲲鹏、昇腾等华为技术生态",
    },
    {
        "id": "ios_ecosystem",
        "name": "iOS开发生态",
        "emoji": "🍎",
        "count": (5, 10),
        "keywords": [
            "Swift 更新 2026",
            "Xcode 新功能 2026",
            "iOS 新版本 更新 2026",
            "App Store 政策 更新 2026",
            "SwiftUI 新特性 2026",
        ],
        "prompt_template": "iOS开发生态板块，关注 Swift、Xcode、iOS SDK、App Store 等苹果开发技术",
    },
    {
        "id": "android_ecosystem",
        "name": "Android开发生态",
        "emoji": "🤖",
        "count": (5, 10),
        "keywords": [
            "Kotlin 更新 2026",
            "Jetpack Compose 发布 2026",
            "Android Studio 新版本 2026",
            "Android 新功能 2026",
            "Google Play 政策 更新 2026",
        ],
        "prompt_template": "Android开发生态板块，关注 Kotlin、Jetpack Compose、Android Studio 等安卓开发技术",
    },
    {
        "id": "cross_platform",
        "name": "跨平台开发生态",
        "emoji": "🌐",
        "count": (5, 10),
        "keywords": [
            "Flutter 更新 2026",
            "React Native 新版本 2026",
            "Kotlin Multiplatform 最新 2026",
            "跨平台框架 更新 2026",
            "MAUI .NET 新版本 2026",
        ],
        "prompt_template": "跨平台开发生态板块，关注 Flutter、React Native、Kotlin Multiplatform、MAUI 等跨平台技术",
    },
    {
        "id": "mobile_ecosystem",
        "name": "移动端生态",
        "emoji": "📱",
        "count": (5, 10),
        "keywords": [
            "iOS市场份额 2026",
            "Android 新机发布 2026",
            "折叠屏手机 最新 2026",
            "移动端 App 趋势 2026",
            "智能手机 市场动态 2026",
        ],
        "prompt_template": "移动端生态板块，关注 iOS/Android 市场份额对比、新机发布、移动 App 趋势",
    },
    {
        "id": "ai_dev_ecosystem",
        "name": "AI开发生态",
        "emoji": "🧩",
        "count": (5, 10),
        "keywords": [
            "LangChain 更新 2026",
            "vLLM 发布 最新 2026",
            "Hugging Face 新模型 2026",
            "AI开发框架 更新 2026",
            "向量数据库 最新 2026",
        ],
        "prompt_template": "AI开发生态板块，关注 LangChain、vLLM、Hugging Face、向量数据库等 AI 开发工具和框架",
    },
    {
        "id": "github_skills",
        "name": "GitHub实用Skills",
        "emoji": "⚡",
        "count": (5, 10),
        "keywords": [
            "GitHub Trending 项目 2026",
            "GitHub 热门开源工具 2026",
            "GitHub Actions 自动化 2026",
            "GitHub Copilot 更新 2026",
            "开源项目 精品 推荐 2026",
        ],
        "prompt_template": "GitHub实用Skills板块，推荐 GitHub 上优质的 Skills、开源项目、开发工具",
    },
    {
        "id": "ai_knowledge",
        "name": "AI知识点",
        "emoji": "📚",
        "count": (3, 5),
        "keywords": [
            "Transformer 原理 讲解 2026",
            "RAG 优化技术 2026",
            "Agent MCP 协议 2026",
            "LoRA 微调 方法 2026",
            "Prompt 工程 技巧 2026",
        ],
        "prompt_template": "AI知识点板块，深入讲解 AI 领域的技术原理和知识点，如 Transformer、RAG、Agent、LoRA 等",
    },
    {
        "id": "product_launch",
        "name": "产品发布",
        "emoji": "🎁",
        "count": (5, 10),
        "keywords": [
            "iPhone 新品 发布 2026",
            "MacBook 新品 发布 2026",
            "新能源汽车 新车 发布 2026",
            "智能硬件 产品 发布 2026",
            "消费电子 新品 发布 2026",
        ],
        "prompt_template": "产品发布板块，关注各大厂商的新产品发布、预售、上市信息",
    },
    {
        "id": "china_news",
        "name": "国内热点新闻",
        "emoji": "🏠",
        "count": (5, 10),
        "keywords": [
            "两会 最新政策 2026",
            "中国经济 数据 2026",
            "国内社会热点 2026年4月",
            "中国政策 发布 2026",
            "区域发展 重大工程 2026",
        ],
        "prompt_template": "国内热点新闻板块，关注国内政治、经济、社会、文化等领域的重大事件和政策",
    },
    {
        "id": "world_news",
        "name": "国际大事件",
        "emoji": "🌍",
        "count": (5, 10),
        "keywords": [
            "G7峰会 最新 2026",
            "俄乌战争 最新 2026",
            "中美关系 动态 2026",
            "国际政治 经济 重大事件 2026",
            "地缘政治 最新 2026",
        ],
        "prompt_template": "国际大事件板块，关注国际政治、经济、军事、文化等领域的重大事件",
    },
    {
        "id": "finance_market",
        "name": "财经市场",
        "emoji": "📈",
        "count": (5, 10),
        "keywords": [
            "美股 收盘 今日 2026",
            "A股 今日行情 2026",
            "黄金价格 今日 2026",
            "原油价格 今日 2026",
            "人民币汇率 今日 2026",
            "加密货币 行情 2026",
        ],
        "prompt_template": "财经市场板块，关注全球股市、债市、商品、外汇、加密货币等金融市场动态",
    },
]

# ============================================================
# AI 客户端初始化
# ============================================================

def get_ai_client():
    """获取可用的 AI 客户端"""
    # 优先使用 DeepSeek
    if AI_CONFIG["deepseek"]["api_key"]:
        return AI_CONFIG["deepseek"]
    # 其次使用 OpenAI
    elif AI_CONFIG["openai"]["api_key"]:
        return AI_CONFIG["openai"]
    # 最后使用通义
    elif AI_CONFIG["qwen"]["api_key"]:
        return AI_CONFIG["qwen"]
    else:
        raise ValueError("未配置任何 AI API Key，请设置 DEEPSEEK_API_KEY / OPENAI_API_KEY / DASHSCOPE_API_KEY")

# ============================================================
# 搜索功能
# ============================================================

def search_with_tavily(keywords: list, max_results_per_keyword: int = 3) -> list:
    """
    使用 Tavily API 搜索新闻

    Args:
        keywords: 搜索关键词列表
        max_results_per_keyword: 每个关键词返回的结果数

    Returns:
        搜索结果列表
    """
    try:
        from tavily import TavilyClient
    except ImportError:
        logger.warning("Tavily 未安装，使用模拟搜索结果")
        return simulate_search(keywords)

    if not TAVILY_API_KEY:
        logger.warning("TAVILY_API_KEY 未配置，使用模拟搜索结果")
        return simulate_search(keywords)

    try:
        client = TavilyClient(api_key=TAVILY_API_KEY)
        all_results = []

        for keyword in keywords:
            try:
                result = client.search(
                    query=keyword,
                    max_results=max_results_per_keyword,
                    search_depth="advanced",
                    include_answer="advanced",
                    include_raw_content=False,
                )
                all_results.extend(result.get("results", []))
                logger.info(f"搜索成功: {keyword} - 获得 {len(result.get('results', []))} 条结果")
            except Exception as e:
                logger.error(f"搜索失败: {keyword} - {e}")

        return all_results

    except Exception as e:
        logger.error(f"Tavily 搜索异常: {e}")
        return simulate_search(keywords)


def simulate_search(keywords: list) -> list:
    """
    模拟搜索结果（当没有 API Key 时使用）
    用于测试脚本功能
    """
    logger.warning("使用模拟搜索结果，请配置 TAVILY_API_KEY 获取真实数据")

    mock_results = []
    for kw in keywords:
        mock_results.append({
            "title": f"关于「{kw}」的最新报道",
            "url": "https://example.com/news",
            "content": f"这是关于 {kw} 的新闻内容摘要。近期该领域有重大进展，各方关注度持续上升。",
            "score": 0.95,
        })
    return mock_results

# ============================================================
# AI 生成功能
# ============================================================

def call_ai(system_prompt: str, user_prompt: str, max_tokens: int = 4000) -> str:
    """
    调用 AI API 生成内容

    Args:
        system_prompt: 系统提示词
        user_prompt: 用户提示词
        max_tokens: 最大 token 数

    Returns:
        AI 生成的内容
    """
    try:
        from openai import OpenAI
    except ImportError:
        raise ImportError("请安装 openai: pip install openai")

    client_config = get_ai_client()

    client = OpenAI(
        api_key=client_config["api_key"],
        base_url=client_config["base_url"],
    )

    try:
        response = client.chat.completions.create(
            model=client_config["model"],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"AI 调用失败: {e}")
        return f"AI 生成失败: {str(e)}"

# ============================================================
# 新闻生成 Prompt 模板
# ============================================================

SYSTEM_PROMPT = """你是一个专业的新闻编辑。请严格按照要求的格式生成新闻内容。

重要规则：
1. 只基于搜索结果撰写内容，不得编造数据
2. 每条新闻必须包含所有要求的字段
3. AI智能分析需要包含5个维度：短期趋势、行业影响、风险预警、机会捕捉、行动建议
4. 字数要求：核心内容 280-320字，AI分析 200-250字
5. 信息来源必须真实存在
6. 禁止使用训练数据的记忆内容，必须基于搜索结果"""

def generate_section_content(section: dict, search_results: list, date_str: str) -> str:
    """生成单个板块的内容"""

    # 构建搜索结果摘要
    search_summary = "\n".join([
        f"- {r.get('title', '')}: {r.get('content', '')[:200]}..."
        for r in search_results[:10]
    ]) if search_results else "暂无搜索结果"

    user_prompt = f"""## 任务
请为【{section['name']}】板块生成 {section['count'][0]}-{section['count'][1]} 条新闻。

## 板块要求
{section['prompt_template']}

## 搜索结果
{search_summary}

## 输出格式
每个板块的新闻必须包含以下结构：

### 1. 【标题】（25字以内）

**🔥 核心事件：**（280-320字）
📌 **出台背景**：政策/事件出台的背景原因
📌 **核心内容**：政策/事件的主要措施
📌 **发布主体**：政策/文件的发布机构
📌 **关键数据**：量化指标
📌 **实施节点**：政策生效时间
📌 **直接影响**：对相关领域的直接作用效果

**📅 背景回顾：**（60-80字）

**⚖️ 影响评估：**（60-80字）

**🌐 各界反应：**（60-80字）

**🚀 后续展望：**（60-80字）

**🤖 AI智能分析：**（200-250字）
🔮 **短期趋势**：基于事件数据和历史规律，研判未来1-3个月走势走向
📊 **行业影响**：对政治/经济/社会各方的连锁影响评估（受益方+受损方）
⚠️ **风险预警**：潜在风险点、黑天鹅可能性、需警惕的信号
💡 **机会捕捉**：投资/创业/职业发展机会
🎯 **行动建议**：具体可操作的观察重点、关注指标、下一步跟踪事项

**🔗 信息来源：** [媒体名称] / [报道日期]

---
（重复上述格式生成 {section['count'][0]}-{section['count'][1]} 条新闻）

## 注意事项
- 如果搜索结果不足 {section['count'][0]} 条，按实际搜索结果数量生成
- 严禁编造任何数据和信息
- AI分析必须全部基于搜索结果，不得扩展发挥"""

    return call_ai(SYSTEM_PROMPT, user_prompt, max_tokens=8000)


# ============================================================
# 文件操作
# ============================================================

def get_output_path() -> tuple:
    """获取输出文件路径"""
    today = datetime.now()
    date_str = today.strftime("%Y年%m月%d日")
    file_date = today.strftime("%Y%m%d")
    month_folder = today.strftime("%Y%m")

    # 在脚本同级的 news 目录创建文件
    script_dir = Path(__file__).parent.parent
    news_dir = script_dir / "news" / month_folder
    news_dir.mkdir(parents=True, exist_ok=True)

    filepath = news_dir / f"{file_date}_早间.md"
    return str(filepath), date_str


def write_header(filepath: str, date_str: str) -> None:
    """写入文件头部"""
    today = datetime.now().strftime("%Y-%m-%d")

    header = f"""# 📰 {date_str} 早间新闻简报

> 🤖 本简报由 AI 自动生成 | 📅 生成时间：{today}

---

## 📋 今日要点速览

（由 AI 根据各板块内容自动生成）

---

## 📑 目录

1. [🔥 今日头条](#1-🔥-今日头条)
2. [🤖 科技热点](#2-🤖-科技热点)
3. [🧠 AI与前沿科技](#3-🧠-ai与前沿科技)
4. [💻 软件开发](#4-💻-软件开发)
5. [🔤 开发语言](#5-🔤-开发语言)
6. [🔶 华为开发生态](#6-🔶-华为开发生态)
7. [🍎 iOS开发生态](#7-🍎-ios开发生态)
8. [🤖 Android开发生态](#8-🤖-android开发生态)
9. [🌐 跨平台开发生态](#9-🌐-跨平台开发生态)
10. [📱 移动端生态](#10-📱-移动端生态)
11. [🧩 AI开发生态](#11-🧩-ai开发生态)
12. [⚡ GitHub实用Skills](#12-⚡-github实用skills)
13. [📚 AI知识点](#13-📚-ai知识点)
14. [🎁 产品发布](#14-🎁-产品发布)
15. [🏠 国内热点新闻](#15-🏠-国内热点新闻)
16. [🌍 国际大事件](#16-🌍-国际大事件)
17. [📈 财经市场](#17-📈-财经市场)

---

"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(header)

    logger.info(f"文件头部已创建: {filepath}")


def append_section(filepath: str, section: dict, content: str) -> None:
    """追加板块内容到文件"""
    section_header = f"\n---\n\n## {section['emoji']} {section['name']}\n\n"

    with open(filepath, "a", encoding="utf-8") as f:
        f.write(section_header)
        f.write(content)
        f.write("\n")

    logger.info(f"板块已追加: {section['name']}")


def push_to_github(filepath: str) -> bool:
    """推送文件到 GitHub"""

    # 检查是否在 GitHub Actions 环境
    is_actions = os.getenv("GITHUB_ACTIONS") == "true"

    if is_actions:
        # 在 GitHub Actions 中直接通过文件系统操作
        logger.info("GitHub Actions 环境检测到，跳过 git push（Actions 会自动处理）")
        return True

    # 本地环境需要手动 push
    if not GITHUB_TOKEN:
        logger.warning("GITHUB_TOKEN 未配置，跳过推送")
        return False

    try:
        import subprocess
        repo_dir = Path(__file__).parent.parent

        subprocess.run(["git", "add", filepath], cwd=repo_dir, check=True)
        subprocess.run([
            "git", "commit", "-m",
            f"📰 {datetime.now().strftime('%Y-%m-%d')} 早间新闻自动生成"
        ], cwd=repo_dir, check=True)
        subprocess.run([
            "git", "push"
        ], cwd=repo_dir, check=True)

        logger.info("已推送到 GitHub")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"推送失败: {e}")
        return False


# ============================================================
# 主流程
# ============================================================

def main():
    """主流程"""
    logger.info("=" * 50)
    logger.info("早间新闻生成任务开始")
    logger.info("=" * 50)

    # 获取输出路径
    filepath, date_str = get_output_path()
    logger.info(f"输出文件: {filepath}")

    # 写入文件头部
    write_header(filepath, date_str)

    # 逐个板块生成
    total_sections = len(SECTIONS)
    for idx, section in enumerate(SECTIONS, 1):
        logger.info(f"\n[{idx}/{total_sections}] 正在生成：{section['name']}")

        # 搜索新闻
        search_results = search_with_tavily(section["keywords"])
        logger.info(f"搜索完成，获得 {len(search_results)} 条结果")

        # 生成内容
        content = generate_section_content(section, search_results, date_str)

        # 追加到文件
        append_section(filepath, section, content)

        # 每生成一个板块休息一下，避免 API 限流
        if idx < total_sections:
            import time
            time.sleep(2)

    logger.info("\n" + "=" * 50)
    logger.info("所有板块生成完成！")
    logger.info(f"文件位置: {filepath}")
    logger.info("=" * 50)

    # 推送到 GitHub
    push_to_github(filepath)

    return filepath


if __name__ == "__main__":
    try:
        result_file = main()
        print(f"\n✅ 生成完成: {result_file}")
    except Exception as e:
        logger.error(f"生成失败: {e}", exc_info=True)
        sys.exit(1)
