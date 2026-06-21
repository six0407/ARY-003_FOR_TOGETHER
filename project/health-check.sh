#!/bin/bash
# ARY MVP — 健康检查脚本
# 用法: ./health-check.sh [url]
# 返回值: 0=健康, 1=异常

set -e

BASE_URL=${1:-http://localhost:3000}
LOG_FILE="$(cd "$(dirname "$0")" && pwd)/logs/health-check.log"

mkdir -p "$(dirname "$LOG_FILE")"

check() {
  local label=$1
  local url=$2
  local status_code
  status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")

  if [ "$status_code" = "200" ]; then
    echo "[OK] $label ($status_code)"
    return 0
  else
    echo "[FAIL] $label ($status_code)"
    return 1
  fi
}

echo "=== ARY 健康检查 $(date) ==="
echo "目标: $BASE_URL"
echo "---"

FAILED=0

# 1. Public Pages
check "首页"         "$BASE_URL/home.html"     || FAILED=1
check "公开页"       "$BASE_URL/works.html"    || FAILED=1
check "赛程页"       "$BASE_URL/race.html"     || FAILED=1
check "结果页"       "$BASE_URL/results.html"  || FAILED=1

# 2. API
check "健康检查 API"  "$BASE_URL/api/health"    || FAILED=1
check "赛程 API"     "$BASE_URL/api/races"     || FAILED=1

# 3. Console
check "控制台"       "$BASE_URL/console.html"  || FAILED=1
check "管理后台"     "$BASE_URL/admin.html"    || FAILED=1

# 4. Live
check "Live Hall"   "$BASE_URL/live-hall.html" || FAILED=1
check "大屏控制"    "$BASE_URL/screen.html"    || FAILED=1

echo "---"
if [ "$FAILED" = "0" ]; then
  echo "结果: ✅ 全部正常"
else
  echo "结果: ❌ 存在异常"
fi

# 记录日志
echo "[$(date +%Y-%m-%dT%H:%M:%S)] status=$([ $FAILED -eq 0 ] && echo OK || echo FAIL)" >> "$LOG_FILE"

exit $FAILED
