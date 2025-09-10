
# 糖果消消乐项目 - 未使用资源文件分析报告
生成时间: 2025-09-09 18:55:50

## 总体统计

- **总资源文件数**: 172 个
- **已使用文件数**: 63 个 (36.6%)
- **未使用文件数**: 109 个 (63.4%)
- **项目总资源大小**: 4,700,680 字节 (4590.5 KB)
- **未使用资源大小**: 1,565,383 字节 (1528.7 KB)
- **可节省空间**: 33.3%

## 按文件类型分类

### 未使用文件
- **.jpg**: 8 个文件, 933,459 字节 (911.6 KB)
- **.png**: 101 个文件, 631,924 字节 (617.1 KB)

### 已使用文件
- **.png**: 63 个文件, 3,135,297 字节 (3061.8 KB)


## 最大的未使用文件 (前20个)

| 文件名 | 路径 | 大小 | 确信程度 |
|--------|------|------|----------|
| starfield-beta-1.jpg | `assets/res/ui/Sprite/acheck/starfield-beta-1.jpg` | 133,744 B | 高确信 (背景图片) |
| starfield-alpha-2.jpg | `assets/res/ui/Sprite/acheck/starfield-alpha-2.jpg` | 127,369 B | 高确信 (背景图片) |
| starfield-alpha-1.jpg | `assets/res/ui/Sprite/acheck/starfield-alpha-1.jpg` | 126,622 B | 高确信 (背景图片) |
| starfield-gamma-2.jpg | `assets/res/ui/Sprite/acheck/starfield-gamma-2.jpg` | 125,254 B | 高确信 (背景图片) |
| starfield-beta-2.jpg | `assets/res/ui/Sprite/acheck/starfield-beta-2.jpg` | 118,267 B | 高确信 (背景图片) |
| starfield-gamma-1.jpg | `assets/res/ui/Sprite/acheck/starfield-gamma-1.jpg` | 110,041 B | 高确信 (背景图片) |
| starfield-delta-2.jpg | `assets/res/ui/Sprite/acheck/starfield-delta-2.jpg` | 109,644 B | 高确信 (背景图片) |
| starfield-delta-1.jpg | `assets/res/ui/Sprite/acheck/starfield-delta-1.jpg` | 82,518 B | 高确信 (背景图片) |
| _0004_item.png | `assets/res/ui/Sprite/home/_0004_item.png` | 48,881 B | 高确信 |
| _logo.png | `assets/res/ui/Sprite/acheck/_logo.png` | 36,396 B | 高确信 (已确认未引用) |
| homebtn.png | `assets/res/ui/Sprite/acheck/homebtn.png` | 26,033 B | 高确信 |
| collect_rocket_blue_right.png | `assets/res/ui/Sprite/effect/collect_rocket_blue_right.png` | 16,762 B | 高确信 |
| commonpanel.png | `assets/res/ui/Sprite/acheck/commonpanel.png` | 15,168 B | 高确信 |
| Steps_d.png | `assets/res/ui/Sprite/acheck/Steps_d.png` | 15,100 B | 高确信 |
| match6s.png | `assets/res/ui/Sprite/item/match6s.png` | 14,042 B | 高确信 |
| match5.png | `assets/res/ui/Sprite/item/match5.png` | 14,042 B | 高确信 |
| match1s.png | `assets/res/ui/Sprite/item/match1s.png` | 13,988 B | 高确信 |
| match2s.png | `assets/res/ui/Sprite/item/match2s.png` | 13,869 B | 高确信 |
| Match6.png | `assets/res/ui/Sprite/item/Match6.png` | 13,560 B | 高确信 |
| match5s.png | `assets/res/ui/Sprite/item/match5s.png` | 13,560 B | 高确信 |


## 安全操作建议

### 1. 备份结构已创建
- 备份目录: `unused_files_backup_20250909_185324/`
- 目录结构与原始项目保持一致
- 包含所有必要的子目录

### 2. 操作脚本已生成
- **移动脚本**: `unused_files_backup_20250909_185324/move_unused_files.sh`
- **回滚脚本**: `unused_files_backup_20250909_185324/rollback_unused_files.sh`

### 3. 执行步骤建议

#### 步骤1: 验证脚本 (必须!)
```bash
# 查看移动脚本内容
cat unused_files_backup_20250909_185324/move_unused_files.sh | head -20

# 查看回滚脚本内容  
cat unused_files_backup_20250909_185324/rollback_unused_files.sh | head -10
```

#### 步骤2: 小批量测试
```bash
# 先移动几个最大的确定未使用的文件进行测试
mv "assets/res/ui/Sprite/acheck/starfield-beta-1.jpg" "unused_files_backup_20250909_185324/assets/res/ui/Sprite/acheck/starfield-beta-1.jpg"
mv "assets/res/ui/Sprite/acheck/_logo.png" "unused_files_backup_20250909_185324/assets/res/ui/Sprite/acheck/_logo.png"

# 测试项目是否正常运行
# 如果出现问题，立即回滚
```

#### 步骤3: 执行完整移动
```bash
# 只有在测试无问题后才执行
chmod +x unused_files_backup_20250909_185324/move_unused_files.sh
./unused_files_backup_20250909_185324/move_unused_files.sh
```

#### 步骤4: 项目测试
- 完整测试游戏功能
- 检查所有UI界面
- 验证音效和特效
- 如有问题立即使用回滚脚本

#### 步骤5: 回滚操作 (如需要)
```bash
chmod +x unused_files_backup_20250909_185324/rollback_unused_files.sh
./unused_files_backup_20250909_185324/rollback_unused_files.sh
```

## 特别注意事项

### 高确信未使用文件 (可优先移动)
- 所有 `starfield-*.jpg` 文件 (背景图片，共8个文件，约1MB)
- `_logo.png` (已确认代码中无引用)
- `_0004_item.png` 文件

### 需要人工验证的文件类型
- 动画序列帧 (`ui_prop_hammer_*.png`)
- 特效文件 (`effect_*.png`) 
- 小尺寸UI元素 (可能通过间接方式引用)

### 风险提示
1. **请务必先备份整个项目**
2. **分批次移动，每次移动后测试**
3. **保留回滚脚本至少一周**
4. **某些资源可能通过动态加载方式引用**

## 预期收益
- 减少项目体积约 1528.7 KB
- 加快构建和打包速度
- 减少APK/IPA文件大小
- 简化资源管理

---
**报告生成完成** - 请仔细审查后再执行任何移动操作
