#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""更新并行新闻生成配置中的条数要求"""

import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_FILE = os.path.join(BASE_DIR, "task", "并行新闻生成配置.md")

# Read the file
with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old and new content
old_table = """| 01 | 01_新闻早报.md | **合并**今日热点+国内+国际+财经 | **12-18条**(500-700字) | 01_今日头条.md（文件名不变） |
| 05 | 05_科技前沿.md | 科技前沿 | 5-8条 | 05_科技前沿.md |
| 06 | 06_科技动态.md | 科技动态 | 5-8条 | 06_科技动态.md |
| 07 | 07_AI知识点.md | AI知识 | 4-6条 | 07_AI知识点.md |
| 08 | 08_AI工具使用.md | AI工具 | 3-4条 | 08_AI工具使用.md |
| 09 | 09_开发语言.md | 开发语言 | 3-5条 | 09_开发语言.md |
| 10 | 10_GitHubSkills.md | GitHub | 3-6条 | 10_GitHubSkills.md |
| 11 | 11_移动开发.md | 移动开发 | 8-12条 | 11_移动开发.md |
| 12 | 12_AI创业.md | AI创业 | 5-8条 | 12_AI创业.md |
| 13 | 13_AI教育.md | AI教育 | 3-5条 | 13_AI教育.md |
| 14 | 14_个人成长.md | 个人成长 | 4-6条 | 14_个人成长.md |
| 15 | 15_AI产品经理.md | AI产品 | 3-5条 | 15_AI产品经理.md |"""

new_table = """| 01 | 01_新闻早报.md | **合并**今日热点+国内+国际+财经 | **15-20条**(500-700字) | 01_今日头条.md（文件名不变） |
| 05 | 05_科技前沿.md | 科技前沿 | **8-10条** | 05_科技前沿.md |
| 06 | 06_科技动态.md | 科技动态 | **8-10条** | 06_科技动态.md |
| 07 | 07_AI知识点.md | AI知识 | **6-8条** | 07_AI知识点.md |
| 08 | 08_AI工具使用.md | AI工具 | **4-6条** | 08_AI工具使用.md |
| 09 | 09_开发语言.md | 开发语言 | **5-7条** | 09_开发语言.md |
| 10 | 10_GitHubSkills.md | GitHub | **6-8条** | 10_GitHubSkills.md |
| 11 | 11_移动开发.md | 移动开发 | **12-15条** | 11_移动开发.md |
| 12 | 12_AI创业.md | AI创业 | **8-10条** | 12_AI创业.md |
| 13 | 13_AI教育.md | AI教育 | **5-7条** | 13_AI教育.md |
| 14 | 14_个人成长.md | 个人成长 | **6-8条** | 14_个人成长.md |
| 15 | 15_AI产品经理.md | AI产品 | **5-7条** | 15_AI产品经理.md |"""

if old_table in content:
    content = content.replace(old_table, new_table)
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ 配置更新成功")
else:
    print("❌ 未找到匹配内容")
