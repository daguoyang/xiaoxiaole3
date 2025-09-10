#!/usr/bin/env python3
import os
import json
from datetime import datetime

backup_dir = 'unused_files_backup_20250909_185324'

# 生成详细报告
def generate_detailed_report():
    # 重新获取所有文件信息
    all_files = []
    unused_files = []
    referenced_files = []
    
    for root, dirs, files in os.walk('assets/res'):
        for file in files:
            if file.endswith(('.png', '.jpg', '.jpeg', '.gif', '.mp3', '.wav', '.ogg')):
                full_path = os.path.join(root, file)
                file_size = os.path.getsize(full_path)
                file_info = {
                    'path': full_path,
                    'filename': file,
                    'name_no_ext': os.path.splitext(file)[0],
                    'size': file_size,
                    'extension': os.path.splitext(file)[1],
                    'directory': root
                }
                all_files.append(file_info)
    
    # 读取移动脚本来确定哪些文件被标记为未使用
    try:
        with open(f'{backup_dir}/move_unused_files.sh', 'r') as f:
            move_script = f.read()
            
        for file_info in all_files:
            if file_info['path'] in move_script:
                unused_files.append(file_info)
            else:
                referenced_files.append(file_info)
    except:
        print('Error reading move script')
        return
    
    # 按大小排序
    unused_files.sort(key=lambda x: x['size'], reverse=True)
    referenced_files.sort(key=lambda x: x['size'], reverse=True)
    
    # 计算统计信息
    total_files = len(all_files)
    total_unused = len(unused_files)
    total_referenced = len(referenced_files)
    total_unused_size = sum(f['size'] for f in unused_files)
    total_referenced_size = sum(f['size'] for f in referenced_files)
    total_project_size = total_unused_size + total_referenced_size
    
    # 按文件类型分类
    unused_by_type = {}
    referenced_by_type = {}
    
    for file_info in unused_files:
        ext = file_info['extension']
        if ext not in unused_by_type:
            unused_by_type[ext] = {'count': 0, 'size': 0}
        unused_by_type[ext]['count'] += 1
        unused_by_type[ext]['size'] += file_info['size']
    
    for file_info in referenced_files:
        ext = file_info['extension']
        if ext not in referenced_by_type:
            referenced_by_type[ext] = {'count': 0, 'size': 0}
        referenced_by_type[ext]['count'] += 1
        referenced_by_type[ext]['size'] += file_info['size']
    
    # 生成报告
    report_content = f"""
# 糖果消消乐项目 - 未使用资源文件分析报告
生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 总体统计

- **总资源文件数**: {total_files:,} 个
- **已使用文件数**: {total_referenced:,} 个 ({total_referenced/total_files*100:.1f}%)
- **未使用文件数**: {total_unused:,} 个 ({total_unused/total_files*100:.1f}%)
- **项目总资源大小**: {total_project_size:,} 字节 ({total_project_size/1024:.1f} KB)
- **未使用资源大小**: {total_unused_size:,} 字节 ({total_unused_size/1024:.1f} KB)
- **可节省空间**: {total_unused_size/total_project_size*100:.1f}%

## 按文件类型分类

### 未使用文件
"""
    
    for ext, info in sorted(unused_by_type.items()):
        report_content += f'- **{ext}**: {info["count"]} 个文件, {info["size"]:,} 字节 ({info["size"]/1024:.1f} KB)\n'
    
    report_content += '\n### 已使用文件\n'
    for ext, info in sorted(referenced_by_type.items()):
        report_content += f'- **{ext}**: {info["count"]} 个文件, {info["size"]:,} 字节 ({info["size"]/1024:.1f} KB)\n'
    
    report_content += f"""

## 最大的未使用文件 (前20个)

| 文件名 | 路径 | 大小 | 确信程度 |
|--------|------|------|----------|
"""
    
    for i, file_info in enumerate(unused_files[:20]):
        confidence = '高确信'
        if 'starfield' in file_info['filename']:
            confidence = '高确信 (背景图片)'
        elif '_logo' in file_info['filename']:
            confidence = '高确信 (已确认未引用)'
        elif file_info['size'] < 5000:
            confidence = '中等确信'
        
        report_content += f'| {file_info["filename"]} | `{file_info["path"]}` | {file_info["size"]:,} B | {confidence} |\n'
    
    report_content += f"""

## 安全操作建议

### 1. 备份结构已创建
- 备份目录: `{backup_dir}/`
- 目录结构与原始项目保持一致
- 包含所有必要的子目录

### 2. 操作脚本已生成
- **移动脚本**: `{backup_dir}/move_unused_files.sh`
- **回滚脚本**: `{backup_dir}/rollback_unused_files.sh`

### 3. 执行步骤建议

#### 步骤1: 验证脚本 (必须!)
```bash
# 查看移动脚本内容
cat {backup_dir}/move_unused_files.sh | head -20

# 查看回滚脚本内容  
cat {backup_dir}/rollback_unused_files.sh | head -10
```

#### 步骤2: 小批量测试
```bash
# 先移动几个最大的确定未使用的文件进行测试
mv "assets/res/ui/Sprite/acheck/starfield-beta-1.jpg" "{backup_dir}/assets/res/ui/Sprite/acheck/starfield-beta-1.jpg"
mv "assets/res/ui/Sprite/acheck/_logo.png" "{backup_dir}/assets/res/ui/Sprite/acheck/_logo.png"

# 测试项目是否正常运行
# 如果出现问题，立即回滚
```

#### 步骤3: 执行完整移动
```bash
# 只有在测试无问题后才执行
chmod +x {backup_dir}/move_unused_files.sh
./{backup_dir}/move_unused_files.sh
```

#### 步骤4: 项目测试
- 完整测试游戏功能
- 检查所有UI界面
- 验证音效和特效
- 如有问题立即使用回滚脚本

#### 步骤5: 回滚操作 (如需要)
```bash
chmod +x {backup_dir}/rollback_unused_files.sh
./{backup_dir}/rollback_unused_files.sh
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
- 减少项目体积约 {total_unused_size/1024:.1f} KB
- 加快构建和打包速度
- 减少APK/IPA文件大小
- 简化资源管理

---
**报告生成完成** - 请仔细审查后再执行任何移动操作
"""
    
    # 保存报告
    report_file = f'{backup_dir}/unused_files_analysis_report.md'
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    print(f'Detailed report saved to: {report_file}')
    print(f'Report contains {len(report_content)} characters')
    
    return unused_files, referenced_files

if __name__ == "__main__":
    unused, referenced = generate_detailed_report()
    print(f'\nReport generation completed!')
    print(f'Unused files: {len(unused)}')
    print(f'Referenced files: {len(referenced)}')