#!/bin/bash
# ARY MVP — 数据备份脚本
# 用法: ./backup.sh [full|data|archive]

set -e

MODE=${1:-data}
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_PATH="$PROJECT_DIR/db/ary.sqlite"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

case "$MODE" in
  full)
    echo "=== 全量备份 ==="
    # SQLite + public 静态文件
    cp "$DB_PATH" "$BACKUP_DIR/ary-full-$TIMESTAMP.sqlite"
    tar -czf "$BACKUP_DIR/public-$TIMESTAMP.tar.gz" -C "$PROJECT_DIR" public/
    echo "备份完成: $BACKUP_DIR/ary-full-$TIMESTAMP.sqlite"
    echo "静态文件: $BACKUP_DIR/public-$TIMESTAMP.tar.gz"
    ;;

  data)
    echo "=== 数据备份 ==="
    cp "$DB_PATH" "$BACKUP_DIR/ary-data-$TIMESTAMP.sqlite"
    echo "备份完成: $BACKUP_DIR/ary-data-$TIMESTAMP.sqlite"
    ;;

  archive)
    echo "=== 赛后归档 ==="
    mkdir -p "$BACKUP_DIR/archive-$TIMESTAMP"
    cp "$DB_PATH" "$BACKUP_DIR/archive-$TIMESTAMP/ary.sqlite"
    cp "$PROJECT_DIR/logs/"*.log "$BACKUP_DIR/archive-$TIMESTAMP/" 2>/dev/null || true
    tar -czf "$BACKUP_DIR/archive-$TIMESTAMP/public.tar.gz" -C "$PROJECT_DIR" public/
    # 导出数据摘要
    sqlite3 "$BACKUP_DIR/archive-$TIMESTAMP/ary.sqlite" <<EOF
      .mode column
      SELECT 'Races:', COUNT(*) FROM races;
      SELECT 'Users:', COUNT(*) FROM users;
      SELECT 'Registrations:', COUNT(*) FROM registrations;
      SELECT 'Works:', COUNT(*) FROM works;
      SELECT 'Awards:', COUNT(*) FROM awards;
      SELECT 'Reports:', COUNT(*) FROM reports;
    EOF > "$BACKUP_DIR/archive-$TIMESTAMP/summary.txt"
    echo "归档完成: $BACKUP_DIR/archive-$TIMESTAMP/"
    ;;

  restore)
    echo "=== 恢复备份 ==="
    read -p "输入备份文件路径: " filepath
    if [ -f "$filepath" ]; then
      cp "$filepath" "$DB_PATH"
      echo "已恢复: $filepath"
    else
      echo "文件不存在: $filepath"
      exit 1
    fi
    ;;

  *)
    echo "用法: ./backup.sh [full|data|archive|restore]"
    exit 1
    ;;
esac
