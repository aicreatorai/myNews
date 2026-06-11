#!/usr/bin/env python3
"""将06-09旧格式文件(## X、Title)转换为新格式(### N. 【Title】)"""
import re, os, glob

BASE = '/Users/ysrtc/Desktop/myNews'
DATE = '20260609'
DIR = os.path.join(BASE, 'news', '202606', DATE)

def fix_single_article_format(filepath):
    """处理 ## 一、标题 / ## 1. 标题 / ## 【标题】 等格式 → ### N. 【标题】"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    article_num = 0
    changed = False
    
    # 需要忽略的文件头部分（保留）
    header_done = False
    
    for line in lines:
        # 匹配各种 h2 标题格式
        m = re.match(r'^##\s+(.+)$', line)
        if m:
            title_text = m.group(1).strip()
            
            # 跳过已知的元信息行
            if title_text in ['导语', '编辑日期'] or title_text.startswith('搜索时段'):
                new_lines.append(line)
                continue
            
            # 检查这个 h2 是否已经是正确格式（有【】且不含中文数字序号）
            if '【' in title_text and '】' in title_text:
                # 已经是新闻条目格式，但需要从 h2 转为 h3
                article_num += 1
                changed = True
                # 提取【】内的内容
                inner = re.search(r'【(.+?)】', title_text)
                t = inner.group(1) if inner else title_text
                new_lines.append('')
                new_lines.append(f'### {article_num}. 【{t}】')
                new_lines.append('')
                continue
            
            # 匹配 ## 一、Title / ## 二、Title 等
            m2 = re.match(r'^[一二三四五六七八九十]+[、.．]\s*(.*)', title_text)
            if m2:
                article_num += 1
                t = m2.group(1).strip()
                changed = True
                new_lines.append('')
                new_lines.append(f'### {article_num}. 【{t}】')
                new_lines.append('')
                continue
            
            # 匹配 ## 1. Title 等
            m3 = re.match(r'^(\d+)[.．、]\s*(.*)', title_text)
            if m3:
                article_num += 1
                t = m3.group(2).strip()
                changed = True
                new_lines.append('')
                new_lines.append(f'### {article_num}. 【{t}】')
                new_lines.append('')
                continue
            
            # 其他 h2 也转成 h3 条目
            article_num += 1
            changed = True
            new_lines.append('')
            new_lines.append(f'### {article_num}. 【{title_text}】')
            new_lines.append('')
            continue
        
        # 处理 **▌ xxx** → **xxx**（去掉▌前缀）
        line = re.sub(r'\*\*▌\s+(.*?)\*\*', r'**\1**', line)
        new_lines.append(line)
    
    if changed:
        result = '\n'.join(new_lines)
        result = re.sub(r'\n{3,}', '\n\n', result)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(result)
        return True, article_num
    return False, article_num

# 需要修复的文件列表（跳过01模块，它不需要【】格式）
skip_modules = {'01'}

print(f"扫描目录: {DIR}")
print()

for fname in sorted(os.listdir(DIR)):
    if not fname.endswith('.md'): continue
    mod = fname.split('_')[0]
    if mod in skip_modules: continue
    
    fpath = os.path.join(DIR, fname)
    with open(fpath, 'r') as f:
        content = f.read()
    
    # 检查是否有 h3 新闻条目
    h3_count = len(re.findall(r'^###\s+\d+', content, re.MULTILINE))
    
    # 检查 h2 结构
    h2_lines = [l for l in content.split('\n') if re.match(r'^##\s+', l)]
    
    print(f"{fname}: h3={h3_count}, h2总数={len(h2_lines)}")
    
    if h3_count == 0 and len(h2_lines) > 0:
        fixed, num = fix_single_article_format(fpath)
        if fixed:
            print(f"  ✅ 重构完成 → {num} 条新闻")
        else:
            print(f"  ⏭️ 无需修改")
    elif h3_count > 0:
        print(f"  ✅ 已有 h3 条目，跳过")
    else:
        print(f"  ⏭️ 无 h2/h3，跳过")
