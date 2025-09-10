#!/usr/bin/env python3
"""
验证多目标关卡的显示效果
"""

import json
import os

def config_to_display(config_target: int, config_steps: int):
    """将配置数值转换为显示数值"""
    display_steps = max(1, config_steps - 10)
    
    if config_target >= 10:
        display_target = config_target + 10
    else:
        display_target = config_target + 30
    
    return display_target, display_steps

def verify_multi_target_levels():
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"
    
    test_levels = [3, 24, 88, 1700]  # 测试几个多目标关卡
    
    print("多目标关卡验证:")
    print("=" * 80)
    
    for level in test_levels:
        config_path = os.path.join(config_dir, f"{level}.json")
        
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            if config.get('mapData') and len(config['mapData']) > 0:
                map_data = config['mapData'][0]
                m_id = map_data.get('m_id', [])
                m_ct = map_data.get('m_ct', [])
                
                print(f"\n关卡 {level}:")
                print(f"  目标类型: {m_id} (共{len(m_id)}种)")
                print(f"  配置数量: {m_ct} (共{len(m_ct)}个)")
                
                if len(m_id) == len(m_ct):
                    print(f"  ✅ 配置正确: 每种目标类型都有对应数量")
                    
                    # 计算各目标的显示效果
                    print(f"  游戏中显示:")
                    total_display = 0
                    for i, (target_type, config_target) in enumerate(zip(m_id, m_ct)):
                        if config_target >= 10:
                            display_target = config_target + 10
                        else:
                            display_target = config_target + 30
                        total_display += display_target
                        print(f"    目标{i+1} (类型{target_type}): 配置{config_target} → 显示{display_target}")
                    
                    config_steps = config.get('moveCount', 20)
                    display_steps = max(1, config_steps - 10)
                    print(f"  步数: 配置{config_steps} → 显示{display_steps}")
                    print(f"  总比值: {total_display}/{display_steps} = {total_display/display_steps:.2f}")
                    
                else:
                    print(f"  ❌ 配置错误: 目标类型{len(m_id)}种，但只有{len(m_ct)}个数量")

if __name__ == "__main__":
    verify_multi_target_levels()