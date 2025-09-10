#!/bin/bash
# 安全回滚脚本 - 恢复确认未使用的文件
# 生成时间: $(date)

set -e

echo "开始回滚文件..."

mv "safe_unused_files_backup_20250909_190156/assets/res/ui/Sprite/acheck/_logo.png" "assets/res/ui/Sprite/acheck/_logo.png" 2>/dev/null || echo "_logo.png 不存在"
mv "safe_unused_files_backup_20250909_190156/assets/res/ui/Sprite/acheck/Steps_d.png" "assets/res/ui/Sprite/acheck/Steps_d.png" 2>/dev/null || echo "Steps_d.png 不存在"

echo "回滚完成！"