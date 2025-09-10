#!/usr/bin/env python3
"""
验证关卡参数调整后的合理性
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

def verify_levels():
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"
    
    test_levels = [1, 10, 50, 100, 200, 500, 800, 1000, 1400, 1700]
    
    print("关卡参数验证:")
    print("=" * 80)
    print(f"{'关卡':>4s} {'配置步数':>6s} {'配置目标':>6s} {'显示步数':>6s} {'显示目标':>6s} {'比值':>6s} {'阶段':>8s}")
    print("-" * 80)
    
    for level in test_levels:
        config_path = os.path.join(config_dir, f"{level}.json")
        
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            config_steps = config.get('moveCount', 0)
            config_target = 0
            if config.get('mapData') and len(config['mapData']) > 0:
                m_ct = config['mapData'][0].get('m_ct', [0])
                config_target = m_ct[0] if m_ct else 0
            
            display_target, display_steps = config_to_display(config_target, config_steps)
            ratio = display_target / display_steps if display_steps > 0 else 0
            
            # 判断阶段
            if level <= 10:
                stage = "教学"
            elif level <= 200:
                stage = "简单"
            elif level <= 800:
                stage = "核心"
            elif level <= 1400:
                stage = "困难"
            else:
                stage = "专家"
            
            print(f"{level:4d} {config_steps:6d} {config_target:6d} {display_steps:6d} {display_target:6d} {ratio:6.2f} {stage:>8s}")
        else:
            print(f"关卡 {level} 配置文件不存在")
    
    print("=" * 80)

if __name__ == "__main__":
    verify_levels()