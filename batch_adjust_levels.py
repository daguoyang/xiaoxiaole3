#!/usr/bin/env python3
"""
批量调整1700个关卡配置
- 步数：源码+1
- 目标数：源码+1-3个（随机分布）
"""

import json
import os
import random
from pathlib import Path

def adjust_level_config(level_num):
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
    
    # 调整步数：源码+1
    source_steps = source_config['moveCount']
    target_config['moveCount'] = source_steps + 1
    
    # 调整目标数：源码+1-3个随机
    source_targets = source_config['mapData'][0]['m_mk']
    new_targets = []
    
    for target in source_targets:
        # 每个目标随机增加1-3个
        random_add = random.choice([1, 1, 2, 2, 2, 3])  # 权重分布：1(20%), 2(60%), 3(20%)
        new_targets.append(target + random_add)
    
    target_config['mapData'][0]['m_mk'] = new_targets
    
    # 保存调整后的配置
    try:
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(target_config, f, separators=(',', ':'), ensure_ascii=False)
        return True
    except Exception as e:
        print(f"保存配置失败 {level_num}: {e}")
        return False

def main():
    """批量处理所有关卡"""
    print("开始批量调整1700个关卡配置...")
    
    # 设置随机种子确保可重现性
    random.seed(12345)
    
    success_count = 0
    fail_count = 0
    
    for level in range(1, 1701):  # 1到1700
        if level % 100 == 0:
            print(f"正在处理关卡 {level}...")
            
        if adjust_level_config(level):
            success_count += 1
        else:
            fail_count += 1
            
        # 每100个关卡显示一次进度
        if level % 100 == 0:
            print(f"已处理 {level} 个关卡，成功: {success_count}, 失败: {fail_count}")
    
    print(f"批量调整完成！")
    print(f"总计: 1700 个关卡")
    print(f"成功: {success_count} 个")
    print(f"失败: {fail_count} 个")
    print(f"成功率: {success_count/1700*100:.1f}%")

if __name__ == "__main__":
    main()