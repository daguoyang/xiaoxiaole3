#!/usr/bin/env python3
"""
糖果消消乐关卡配置修复脚本

本脚本用于修复目标数小于步数的关卡配置问题。
这些关卡目前过于简单，严重影响游戏体验。

使用方法:
python3 fix_level_configs.py

修复的关卡数量: 40个
修复类型: 调整配置目标数，保持合理的难度比例
"""

import json
import os
import sys
from pathlib import Path

def calculate_display_values(config_steps, config_target):
    """计算游戏显示的步数和目标数"""
    display_steps = max(1, config_steps - 10) if config_steps > 10 else config_steps
    
    if config_target >= 10:
        display_target = config_target + 10
    else:
        display_target = config_target + 30
    
    return display_steps, display_target

def fix_level_config(level, new_move_count, new_target):
    """修复单个关卡配置"""
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"
    config_path = os.path.join(config_dir, f"{level}.json")
    
    if not os.path.exists(config_path):
        print(f"  ✗ 关卡 {level} 配置文件不存在")
        return False
    
    try:
        # 读取当前配置
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # 保存原始配置用于对比
        old_move_count = config.get('moveCount', 0)
        old_target = 0
        if config.get('mapData') and len(config['mapData']) > 0:
            old_target = config['mapData'][0].get('m_ct', [0])[0]
        
        # 计算修复前后的显示值
        old_display_steps, old_display_target = calculate_display_values(old_move_count, old_target)
        new_display_steps, new_display_target = calculate_display_values(new_move_count, new_target)
        
        # 应用修复
        config['moveCount'] = new_move_count
        if config.get('mapData') and len(config['mapData']) > 0:
            config['mapData'][0]['m_ct'] = [new_target]
        
        # 写入修复后的配置
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, separators=(',', ':'), ensure_ascii=False)
        
        # 输出修复信息
        old_ratio = old_display_target / old_display_steps if old_display_steps > 0 else 0
        new_ratio = new_display_target / new_display_steps if new_display_steps > 0 else 0
        
        print(f"  ✓ 关卡 {level:3d}: {old_display_target:3d}/{old_display_steps:2d} (比例 {old_ratio:.2f}) → {new_display_target:3d}/{new_display_steps:2d} (比例 {new_ratio:.2f})")
        
        return True
        
    except Exception as e:
        print(f"  ✗ 修复关卡 {level} 失败: {e}")
        return False

def main():
    print("=" * 80)
    print("糖果消消乐关卡配置修复脚本")
    print("=" * 80)
    print("本脚本将修复40个目标数小于步数的关卡")
    print("这些关卡目前过于简单，会严重影响游戏体验")
    print()
    
    # 确认执行
    response = input("是否继续执行修复? (y/N): ").lower().strip()
    if response != 'y':
        print("修复已取消")
        return
    
    # 需要修复的关卡列表 (关卡号, 建议moveCount, 建议m_ct)
    # 这些配置基于源码项目的正常难度曲线计算得出
    fixes = [
        # 格式: (关卡, 配置步数, 配置目标数)
        (9, 40, 21),     # 27/30 -> 31/30
        (14, 45, 32),    # 33/35 -> 42/35
        (24, 45, 47),    # 20/35 -> 57/35
        (28, 39, 42),    # 23/29 -> 52/29
        (42, 41, 64),    # 30/31 -> 74/31
        (44, 50, 89),    # 35/40 -> 99/40
        (59, 68, 171),   # 37/58 -> 181/58
        (61, 49, 115),   # 35/39 -> 125/39
        (66, 47, 116),   # 35/37 -> 126/37
        (68, 52, 137),   # 30/42 -> 147/42
        (76, 50, 144),   # 35/40 -> 154/40
        (79, 64, 205),   # 21/54 -> 215/54
        (82, 48, 146),   # 35/38 -> 156/38
        (86, 60, 203),   # 35/50 -> 213/50
        (88, 66, 234),   # 22/56 -> 244/56
        (89, 36, 104),   # 25/26 -> 114/26
        (99, 46, 163),   # 35/36 -> 173/36
        (102, 63, 248),  # 35/53 -> 258/53
        (103, 38, 126),  # 20/28 -> 136/28
        (114, 56, 214),  # 38/46 -> 224/46
        (116, 57, 219),  # 46/47 -> 229/47
        (117, 53, 199),  # 36/43 -> 209/43
        (123, 33, 102),  # 22/23 -> 112/23
        (130, 68, 272),  # 41/58 -> 282/58
        (131, 59, 228),  # 35/49 -> 238/49
        (134, 46, 165),  # 25/36 -> 175/36
        (141, 43, 150),  # 29/33 -> 160/33
        (149, 42, 146),  # 24/32 -> 156/32
        (158, 61, 238),  # 37/51 -> 248/51
        (164, 54, 204),  # 20/44 -> 214/44
        (170, 54, 204),  # 35/44 -> 214/44
        (172, 49, 180),  # 38/39 -> 190/39
        (173, 49, 180),  # 36/39 -> 190/39
        (178, 49, 180),  # 24/39 -> 190/39
        (185, 61, 238),  # 38/51 -> 248/51
        (187, 61, 238),  # 35/51 -> 248/51
        (191, 60, 233),  # 36/50 -> 243/50
        (196, 47, 170),  # 34/37 -> 180/37
        (197, 34, 107),  # 20/24 -> 117/24
        (198, 50, 185),  # 22/40 -> 195/40
    ]
    
    print(f"开始修复 {len(fixes)} 个关卡...")
    print("-" * 80)
    
    success_count = 0
    
    # 执行修复
    for level, move_count, target in fixes:
        if fix_level_config(level, move_count, target):
            success_count += 1
    
    print("-" * 80)
    print(f"修复完成: {success_count}/{len(fixes)} 个关卡")
    
    if success_count == len(fixes):
        print("🎉 所有关卡修复成功!")
        print()
        print("修复效果:")
        print("- 消除了目标数小于步数的问题")
        print("- 恢复了合理的游戏挑战性")
        print("- 改善了游戏体验和难度曲线")
        print()
        print("建议:")
        print("1. 进行游戏测试验证修复效果")
        print("2. 监控玩家反馈和关卡通过率")
        print("3. 如有问题可以回滚到备份配置")
    else:
        print(f"⚠️  有 {len(fixes) - success_count} 个关卡修复失败")
        print("请检查错误信息并手动修复失败的关卡")

if __name__ == "__main__":
    main()