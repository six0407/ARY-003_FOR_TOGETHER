#!/bin/bash
# ARY MVP — 一键部署脚本
# 用法: ./deploy.sh [staging|production]

set -e

ENV=${1:-staging}
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
DB_DIR="$PROJECT_DIR/db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== ARY MVP 部署开始 [环境: $ENV] ==="

# 1. 创建目录
mkdir -p "$LOG_DIR" "$DB_DIR"

# 2. 安装依赖
echo "[1/4] 安装依赖..."
cd "$PROJECT_DIR"
npm install --production 2>&1 | tail -3

# 3. 运行测试
echo "[2/4] 运行回归测试..."
if npm test 2>&1; then
  echo "✅ 测试全部通过"
else
  echo "❌ 测试失败，部署中止"
  exit 1
fi

# 4. 配置环境
echo "[3/4] 配置环境..."
if [ "$ENV" = "production" ]; then
  export NODE_ENV=production
  export PORT=${PORT:-3000}
else
  export NODE_ENV=staging
  export PORT=${PORT:-3000}
fi

# 5. 启动服务 (通过 PM2 或直接启动)
echo "[4/4] 启动服务..."
if command -v pm2 &> /dev/null; then
  pm2 start server.js --name "ary-mvp" --update-env
  pm2 save
else
  echo "PM2 未安装，使用 nohup 启动..."
  nohup node server.js > "$LOG_DIR/ary-$TIMESTAMP.log" 2>&1 &
  echo "PID: $!"
fi

echo "=== 部署完成 ==="
echo "服务地址: http://localhost:${PORT:-3000}"
echo "健康检查: http://localhost:${PORT:-3000}/api/health"
