#!/bin/bash
# 早间新闻 - 本地开发服务器启动脚本
# 用法: bash start.sh [端口号]

PORT=${1:-8080}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "📰 早间新闻 - 本地开发服务器"
echo "================================"
echo "端口: $PORT"
echo "地址: http://localhost:$PORT"
echo "按 Ctrl+C 停止服务器"
echo "================================"

cd "$SCRIPT_DIR" && python3 -m http.server "$PORT"
