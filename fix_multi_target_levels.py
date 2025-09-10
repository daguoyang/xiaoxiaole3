#!/usr/bin/env python3
"""
修复多目标关卡配置中的NaN显示问题

问题：难度调整脚本只设置了一个目标数量，但某些关卡有多个目标类型，
导致第二个、第三个目标显示为NaN。

解决方案：为每个目标类型分配合理的目标数量。
"""

import json
import os
from typing import List, Tuple

def config_to_display(config_target: int, config_steps: int) -> Tuple[int, int]:
    """将配置数值转换为显示数值"""
    display_steps = max(1, config_steps - 10)
    
    if config_target >= 10:
        display_target = config_target + 10
    else:
        display_target = config_target + 30
    
    return display_target, display_steps

def distribute_targets(total_target: int, num_targets: int) -> List[int]:
    """将总目标数合理分配给多个目标类型"""
    if num_targets == 1:
        return [total_target]
    
    # 基础分配
    base_amount = total_target // num_targets
    remainder = total_target % num_targets
    
    targets = [base_amount] * num_targets
    
    # 分配余数（优先给前面的目标）
    for i in range(remainder):
        targets[i] += 1
    
    # 确保每个目标至少为1
    for i in range(len(targets)):
        targets[i] = max(1, targets[i])
    
    return targets

def fix_multi_target_level(level: int) -> bool:
    """修复单个关卡的多目标配置"""
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"
    config_path = os.path.join(config_dir, f"{level}.json")
    
    if not os.path.exists(config_path):
        return False
    
    try:
        # 读取配置
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        if not config.get('mapData') or len(config['mapData']) == 0:
            return False
        
        map_data = config['mapData'][0]
        m_id = map_data.get('m_id', [])
        m_ct = map_data.get('m_ct', [])
        
        # 检查是否需要修复
        if len(m_id) <= 1:
            return False  # 单目标或无目标，不需要修复
        
        if len(m_ct) >= len(m_id):
            return False  # 已经有足够的目标数量
        
        # 需要修复
        current_total = m_ct[0] if m_ct else 1
        
        # 重新分配目标数量
        new_targets = distribute_targets(current_total, len(m_id))
        
        # 更新配置
        map_data['m_ct'] = new_targets
        
        # 写回文件
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, separators=(',', ':'), ensure_ascii=False)
        
        # 计算显示值验证
        display_target_total = 0
        for target in new_targets:
            if target >= 10:
                display_target_total += target + 10
            else:
                display_target_total += target + 30
        
        display_steps = max(1, config.get('moveCount', 20) - 10)
        ratio = display_target_total / display_steps if display_steps > 0 else 0
        
        print(f"关卡 {level:3d}: {len(m_id)}个目标 配置{new_targets} 显示总数{display_target_total} 比值{ratio:.2f}")
        
        return True
        
    except Exception as e:
        print(f"修复关卡 {level} 失败: {e}")
        return False

def main():
    print("检查和修复多目标关卡配置...")
    print("=" * 60)
    
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"
    
    # 扫描所有关卡文件
    fixed_count = 0
    checked_count = 0
    
    for level in range(1, 1701):
        config_path = os.path.join(config_dir, f"{level}.json")
        
        if os.path.exists(config_path):
            checked_count += 1
            if fix_multi_target_level(level):
                fixed_count += 1
    
    print("=" * 60)
    print(f"扫描完成: 检查了 {checked_count} 个关卡，修复了 {fixed_count} 个多目标关卡")
    
    # 验证几个关键关卡
    print("\n验证修复结果:")
    print("-" * 40)
    
    test_levels = [3, 24]
    
    for level in test_levels:
        config_path = os.path.join(config_dir, f"{level}.json")
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            if config.get('mapData') and len(config['mapData']) > 0:
                map_data = config['mapData'][0]
                m_id = map_data.get('m_id', [])
                m_ct = map_data.get('m_ct', [])
                
                print(f"关卡 {level}: 目标类型 {len(m_id)}个 {m_id}")
                print(f"         目标数量 {len(m_ct)}个 {m_ct}")
                
                if len(m_id) == len(m_ct):
                    print(f"         ✅ 配置正确")
                else:
                    print(f"         ❌ 配置错误: 目标类型与数量不匹配")
                print()

if __name__ == "__main__":
    main()