#!/usr/bin/env python3
"""
修复新闻 Markdown 文件中 h3 标题格式问题。

已知问题：
1. 模块 05-15 的新闻标题需要【】包裹（模块01使用[标签]格式，不需要）
2. 部分文件用 ### 做文章内小标题（如 ### 导语），应改为 **▌ ...**
3. 部分文件用 ### 1.1 四级标题，应改为 **...**
"""

import re
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 模块01不需要【】，其他模块需要
MODULES_NEED_BRACKETS = frozenset(['05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15'])

def get_module_id(filename):
    """从文件名提取模块编号"""
    m = re.match(r'^(\d+)', filename)
    return m.group(1) if m else None

def is_news_item_title(line):
    """判断是否是新闻条目标题（有数字编号开头）"""
    return bool(re.match(r'^###\s+\d+\.?\d*\s+', line))

def is_sub_heading(line):
    """判断是否是 h3 格式的小标题（无数字开头）"""
    return bool(re.match(r'^###\s+(?!\d)', line))

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    changes = []
    mod_id = get_module_id(os.path.basename(filepath))
    
    for i, line in enumerate(lines):
        m = re.match(r'^(###\s+)(.*)', line)
        if not m:
            new_lines.append(line)
            continue
        
        prefix = m.group(1)
        title = m.group(2).strip()
        
        # 新闻条目标题: ### 1. xxx 或 ### 1.1 xxx
        if is_news_item_title(line):
            # 提取编号
            num_m = re.match(r'^(\d+\.?\d*)\s+', title)
            num_part = num_m.group(1)
            rest = title[num_m.end():].strip()
            
            # 模块01使用 [标签] 格式，不需要【】
            if mod_id == '01':
                new_lines.append(line)
                continue
            
            # 如果已经有【】则跳过
            if '【' in rest and '】' in rest:
                new_lines.append(line)
                continue
            
            # 提取并保留 [标签]（如 [主]、[副]、[L1]、[L2] 等）
            tags = ''
            while True:
                tag_m = re.match(r'^(\[[^\]]+\])\s*', rest)
                if tag_m:
                    tags += tag_m.group(1) + ' '
                    rest = rest[tag_m.end():]
                else:
                    break
            tags = tags.strip()
            
            # 添加【】
            if tags:
                new_title = f"{prefix}{num_part} {tags}【{rest}】"
            else:
                new_title = f"{prefix}{num_part} 【{rest}】"
            changes.append(f"  L{i+1}: 添加【】")
            new_lines.append(new_title)
        
        # 文章内小标题: ### 导语 / ### 更新全景 / ### 关键数据速览
        elif is_sub_heading(line):
            # 去掉可能的 [Lx] 标记
            clean = re.sub(r'^\[[^\]]+\]\s*', '', title).strip()
            new_title = f"**▌ {clean}**"
            changes.append(f"  L{i+1}: h3小标题→粗体: {clean[:30]}")
            new_lines.append(new_title)
        
        else:
            new_lines.append(line)
    
    if changes:
        new_content = '\n'.join(new_lines)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"✅ {os.path.basename(filepath)}: {len(changes)} 处修改")
        for c in changes[:5]:
            print(c)
        if len(changes) > 5:
            print(f"   ... 还有 {len(changes)-5} 处")
        return True
    else:
        return False

def scan_date(date_str):
    date_path = os.path.join(BASE, 'news', date_str[:4] + date_str[5:7], date_str.replace('-', ''))
    if not os.path.isdir(date_path):
        print(f"❌ 目录不存在: {date_path}")
        return 0
    
    print(f"\n{'='*50}")
    print(f"📅 {date_str}")
    print(f"{'='*50}")
    
    total = 0
    for fname in sorted(os.listdir(date_path)):
        if fname.endswith('.md'):
            fpath = os.path.join(date_path, fname)
            if fix_file(fpath):
                total += 1
    
    print(f"  共修复 {total} 个文件")
    return total

if __name__ == '__main__':
    # 默认扫描近几天的文件
    dates = sys.argv[1:] if len(sys.argv) > 1 else [
        '2026-06-09', '2026-06-10', '2026-06-05', '2026-06-06', '2026-06-07', '2026-06-08'
    ]
    grand_total = 0
    for d in dates:
        grand_total += scan_date(d)
    print(f"\n{'='*50}")
    print(f"🏁 总计修复 {grand_total} 个文件")
