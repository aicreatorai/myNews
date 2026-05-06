#!/bin/bash
# 一键推送脚本：同时推送到 GitHub (main) 和 Gitee (master)
# 用法: ./scripts/push.sh [commit message]
#   - 如果提供 commit message，会先执行 git add + commit
#   - 如果不提供，直接推送已有的提交

set -e

cd "$(dirname "$0")/.."

# 如果传了参数，先提交
if [ -n "$1" ]; then
    echo "📦 添加所有变更..."
    git add -A

    if git diff --cached --quiet; then
        echo "✅ 没有新的变更需要提交"
    else
        echo "📝 提交: $1"
        git commit -m "$1"
    fi
fi

echo ""
echo "🚀 推送到 Gitee (main -> master)..."
git push gitee main:master

echo ""
echo "🚀 推送到 GitHub (main)..."
if git push origin main 2>/dev/null; then
    echo "✅ GitHub 推送成功"
else
    echo "⚠️  GitHub 推送失败（账号可能被暂停），Gitee 推送成功"
fi

echo ""
echo "🎉 完成！"
echo "  Gitee:  https://gitee.com/maxinde/myNews"
echo "  GitHub: https://github.com/aicreatorai/myNews"
