#!/usr/bin/env python3
import json
import os

def calculate_display_values(move_count, m_ct):
    """使用原始显示公式计算显示值"""
    # 步数显示公式: moveCount - 10 > 0 ? moveCount - 10 : moveCount
    display_steps = move_count - 10 if move_count - 10 > 0 else move_count
    
    # 目标显示公式: m_ct + 10 if m_ct >= 10 else m_ct + 30
    display_targets = m_ct + 10 if m_ct >= 10 else m_ct + 30
    
    return display_steps, display_targets

def calculate_required_move_count(display_targets, max_ratio=4.5):
    """根据目标数和最大比值计算所需的moveCount"""
    # display_targets / display_steps <= max_ratio
    # display_steps >= display_targets / max_ratio
    min_display_steps = display_targets / max_ratio
    
    # 向上取整确保比值不超过限制
    min_display_steps = int(min_display_steps) + (1 if min_display_steps % 1 > 0 else 0)
    
    # 根据显示步数计算所需的moveCount
    # display_steps = moveCount - 10 if moveCount - 10 > 0 else moveCount
    # 如果min_display_steps > 10，则 moveCount = min_display_steps + 10
    # 如果min_display_steps <= 10，则 moveCount = min_display_steps
    if min_display_steps > 10:
        required_move_count = min_display_steps + 10
    else:
        required_move_count = min_display_steps
    
    return required_move_count, min_display_steps

def check_levels_501_plus():
    """检查第501关以后的目标数/步数比值"""
    config_dir = "assets/resources/config"
    levels_to_adjust = []
    
    # 先确定要检查到哪一关（检查到1700关）
    max_level = 1700
    
    print(f"检查第501-{max_level}关的目标数/步数比值是否大于5...")
    print("Level | Steps | Targets | Ratio | Needs Adjustment | New Steps | New moveCount")
    print("-" * 85)
    
    checked_count = 0
    found_count = 0
    
    for level in range(501, max_level + 1):
        config_file = os.path.join(config_dir, f"{level}.json")
        
        if not os.path.exists(config_file):
            continue
            
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            move_count = data['moveCount']
            m_ct = data['mapData'][0]['m_ct'][0]
            
            display_steps, display_targets = calculate_display_values(move_count, m_ct)
            
            ratio = display_targets / display_steps if display_steps > 0 else float('inf')
            needs_adjustment = ratio > 5.0
            
            checked_count += 1
            
            new_move_count = move_count
            new_display_steps = display_steps
            
            if needs_adjustment:
                new_move_count, new_display_steps = calculate_required_move_count(display_targets, 4.5)
                levels_to_adjust.append({
                    'level': level,
                    'current_move_count': move_count,
                    'current_steps': display_steps,
                    'current_targets': display_targets,
                    'current_ratio': ratio,
                    'new_move_count': new_move_count,
                    'new_steps': new_display_steps,
                    'original_data': data
                })
                found_count += 1
                
                # 显示需要调整的关卡
                status = "YES"
                print(f"{level:5} | {display_steps:5} | {display_targets:7} | {ratio:5.2f} | {status:15} | {new_display_steps:9} | {new_move_count:12}")
            
            # 每检查100关显示一次进度
            if level % 100 == 0:
                print(f"... 已检查到第{level}关，发现{found_count}个需要调整的关卡")
                
        except Exception as e:
            print(f"Error processing level {level}: {e}")
    
    print(f"\n检查完成: 检查了{checked_count}个关卡，找到 {len(levels_to_adjust)} 个关卡的比值大于5.0")
    return levels_to_adjust

if __name__ == "__main__":
    levels_to_adjust = check_levels_501_plus()
    
    if levels_to_adjust:
        print(f"\n需要调整的关卡（比值 > 5.0）:")
        for level_info in levels_to_adjust:
            print(f"Level {level_info['level']}: {level_info['current_targets']}/{level_info['current_steps']} = {level_info['current_ratio']:.2f} → {level_info['current_targets']}/{level_info['new_steps']} = {level_info['current_targets']/level_info['new_steps']:.2f}")
            
        # 保存调整列表到文件，供后续脚本使用
        with open('levels_to_adjust_501_plus.json', 'w', encoding='utf-8') as f:
            json.dump(levels_to_adjust, f, indent=2, ensure_ascii=False)
        print(f"\n调整列表已保存到 levels_to_adjust_501_plus.json")
    else:
        print("\n第501关以后没有发现比值大于5.0的关卡")