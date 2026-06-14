#!/usr/bin/env python3
"""
补救脚本：将错误转换的 **▌ N. Title** 恢复为 ### N. 【Title】
同时也转换还是 ### N. Title（无【】）的为 ### N. 【Title】
"""
import re, os, glob, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Case 1: **▌ N. Title** → ### N. 【Title】
    content1 = re.sub(
        r'\*\*▌\s+(\d+\.?\d*)\s+(.*?)\*\*',
        r'### \1 【\2】',
        content
    )
    
    # Case 2: still has ### N. Title (no brackets) → add them
    lines = content1.split('\n')
    new_lines = []
    for line in lines:
        m = re.match(r'^(###\s+)(\d+\.?\d*)\s+(.*)$', line)
        if m and '【' not in m.group(3):
            prefix = m.group(1)
            num = m.group(2)
            title = m.group(3)
            # 保留 [标签]
            tags = ''
            rest = title
            while True:
                tm = re.match(r'^(\[[^\]]+\])\s*', rest)
                if tm:
                    tags += tm.group(1) + ' '
                    rest = rest[tm.end():]
                else:
                    break
            tags = tags.strip()
            if tags:
                new_lines.append(f'{prefix}{num} {tags}【{rest}】')
            else:
                new_lines.append(f'{prefix}{num} 【{rest}】')
        else:
            new_lines.append(line)
    
    new_content = '\n'.join(new_lines)
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

if __name__ == '__main__':
    total = 0
    for root, dirs, files in os.walk(os.path.join(BASE, 'news')):
        for fn in files:
            if fn.endswith('.md'):
                mod = re.match(r'^\d+', fn).group(0) if re.match(r'^\d+', fn) else ''
                if mod == '01':  # 01模块不需要【】
                    continue
                fpath = os.path.join(root, fn)
                if fix_file(fpath):
                    total += 1
                    print(f'✅ {os.path.relpath(fpath, BASE)}')
    print(f'\n共修复 {total} 个文件')
