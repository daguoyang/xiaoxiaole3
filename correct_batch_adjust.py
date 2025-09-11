#!/usr/bin/env python3
"""
基于游戏显示逻辑的正确批量调整脚本

游戏显示逻辑分析：
- 游戏显示步数 = 配置步数 - 16
- 游戏显示目标 = 配置目标 + 10

目标：
- 游戏显示步数 = 源码显示 + 1
- 游戏显示目标 = 源码显示 + 1-3

因此配置文件调整：
- 配置步数 = 源码配置步数 + 1  
- 配置目标 = 源码配置目标 + 1-3
"""

import json
import os
import random
from pathlib import Path

def analyze_display_logic():
    """分析并验证显示逻辑"""
    # 当前配置：moveCount=30, m_mk=[20]
    # 用户看到显示：步数14, 目标30
    
    config_steps = 30
    config_target = 20
    display_steps = 14
    display_target = 30
    
    step_offset = config_steps - display_steps  # 30 - 14 = 16
    target_offset = display_target - config_target  # 30 - 20 = 10
    
    print(f"显示逻辑分析：")
    print(f"  步数偏移：配置步数 - {step_offset} = 显示步数")
    print(f"  目标偏移：配置目标 + {target_offset} = 显示目标")
    
    return step_offset, target_offset

def adjust_level_config(level_num, step_offset=16, target_offset=10):
    """调整单个关卡配置"""
    source_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8 5/assets/resources/config"
    target_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config"
    
    source_file = f"{source_dir}/{level_num}.json"
    target_file = f"{target_dir}/{level_num}.json"
    
    # 检查源文件是否存在
    if not os.path.exists(source_file):
        print(f"源文件不存在: {source_file}")
        return False
        
    # 读取源码配置
    try:
        with open(source_file, 'r', encoding='utf-8') as f:
            source_config = json.load(f)
    except Exception as e:
        print(f"读取源码配置失败 {level_num}: {e}")
        return False
    
    # 读取当前配置
    try:
        with open(target_file, 'r', encoding='utf-8') as f:
            target_config = json.load(f)
    except Exception as e:
        print(f"读取当前配置失败 {level_num}: {e}")
        return False
    
    # 计算源码的游戏显示值
    source_config_steps = source_config['moveCount']
    source_display_steps = source_config_steps - step_offset
    
    source_config_targets = source_config['mapData'][0]['m_mk']
    source_display_targets = [t + target_offset for t in source_config_targets]
    
    # 调整目标：游戏显示比源码多1-3
    new_display_steps = source_display_steps + 1
    new_display_targets = []
    
    for target in source_display_targets:
        # 每个目标随机增加1-3个，权重分布：1(20%), 2(60%), 3(20%)
        random_add = random.choice([1, 1, 2, 2, 2, 3])
        new_display_targets.append(target + random_add)
    
    # 转换为配置文件值
    new_config_steps = new_display_steps + step_offset
    new_config_targets = [t - target_offset for t in new_display_targets]
    
    # 更新配置
    target_config['moveCount'] = new_config_steps
    target_config['mapData'][0]['m_mk'] = new_config_targets
    
    # 保存调整后的配置
    try:
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(target_config, f, separators=(',', ':'), ensure_ascii=False)
        
        # 打印调整信息
        if level_num <= 10:  # 只打印前10关的详细信息
            print(f"关卡 {level_num}:")
            print(f"  源码显示: 步数{source_display_steps}, 目标{source_display_targets}")
            print(f"  调整显示: 步数{new_display_steps}, 目标{new_display_targets}")
            print(f"  配置调整: 步数{source_config_steps}→{new_config_steps}, 目标{source_config_targets}→{new_config_targets}")
        
        return True
    except Exception as e:
        print(f"保存配置失败 {level_num}: {e}")
        return False

def main():
    """批量处理所有关卡"""
    print("=== 基于游戏显示逻辑的正确批量调整 ===")
    
    # 分析显示逻辑
    step_offset, target_offset = analyze_display_logic()
    print()
    
    # 设置随机种子确保可重现性
    random.seed(12345)
    
    success_count = 0
    fail_count = 0
    
    print("开始批量调整1700个关卡配置...")
    
    for level in range(1, 1701):  # 1到1700
        if level % 100 == 0:
            print(f"正在处理关卡 {level}...")
            
        if adjust_level_config(level, step_offset, target_offset):
            success_count += 1
        else:
            fail_count += 1
            
        # 每100个关卡显示一次进度
        if level % 100 == 0:
            print(f"已处理 {level} 个关卡，成功: {success_count}, 失败: {fail_count}")
    
    print(f"\n批量调整完成！")
    print(f"总计: 1700 个关卡")
    print(f"成功: {success_count} 个")
    print(f"失败: {fail_count} 个")
    print(f"成功率: {success_count/1700*100:.1f}%")

if __name__ == "__main__":
    main()