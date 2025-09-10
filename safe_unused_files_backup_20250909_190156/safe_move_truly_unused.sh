#!/bin/bash
# 安全移动脚本 - 只移动确认未使用的文件
# 生成时间: $(date)
# 警告：这个脚本已经排除了主地图使用的starfield背景图片

set -e  # 遇到错误立即退出

echo "开始移动确认未使用的文件..."

# 确认未使用的文件（绝对安全）
echo "移动 _logo.png (确认未引用)..."
mv "assets/res/ui/Sprite/acheck/_logo.png" "safe_unused_files_backup_20250909_190156/assets/res/ui/Sprite/acheck/_logo.png" 2>/dev/null || echo "文件不存在或已移动"

echo "移动 Steps_d.png (备用文件)..."
mv "assets/res/ui/Sprite/acheck/Steps_d.png" "safe_unused_files_backup_20250909_190156/assets/res/ui/Sprite/acheck/Steps_d.png" 2>/dev/null || echo "文件不存在或已移动"

echo "完成！只移动了确认安全的文件。"
echo "注意: starfield背景图片已被保留，因为它们正在被主地图使用。"