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

def calculate_required_move_count(display_targets, max_ratio=4.3):
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

def adjust_levels_387_390():
    """调整第387关和第390关的步数"""
    config_dir = "assets/resources/config"
    levels_to_adjust = [387, 390]
    
    print("调整第387关和第390关的步数，使比值不超过4.3...")
    print("Level | 原步数 | 原目标 | 原比值 | 新步数 | 新moveCount | 新比值")
    print("-" * 75)
    
    success_count = 0
    
    for level in levels_to_adjust:
        config_file = os.path.join(config_dir, f"{level}.json")
        
        if not os.path.exists(config_file):
            print(f"Warning: {config_file} not found")
            continue
            
        try:
            # 读取当前配置
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 获取原始值
            original_move_count = data['moveCount']
            m_ct = data['mapData'][0]['m_ct'][0]
            
            # 计算原始显示值
            original_steps, original_targets = calculate_display_values(original_move_count, m_ct)
            original_ratio = original_targets / original_steps if original_steps > 0 else float('inf')
            
            # 计算新的moveCount
            new_move_count, new_display_steps = calculate_required_move_count(original_targets, 4.3)
            new_ratio = original_targets / new_display_steps if new_display_steps > 0 else float('inf')
            
            # 更新配置
            data['moveCount'] = new_move_count
            
            # 写回文件
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
            
            print(f"{level:5} | {original_steps:6} | {original_targets:6} | {original_ratio:6.2f} | {new_display_steps:6} | {new_move_count:11} | {new_ratio:6.2f}")
            success_count += 1
            
        except Exception as e:
            print(f"Error processing level {level}: {e}")
    
    print("-" * 75)
    print(f"调整完成: {success_count}/{len(levels_to_adjust)} 个关卡成功调整")
    
    # 验证调整结果
    print("\n验证调整结果:")
    for level in levels_to_adjust:
        config_file = os.path.join(config_dir, f"{level}.json")
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            move_count = data['moveCount']
            m_ct = data['mapData'][0]['m_ct'][0]
            
            display_steps, display_targets = calculate_display_values(move_count, m_ct)
            ratio = display_targets / display_steps if display_steps > 0 else float('inf')
            
            print(f"Level {level}: 显示步数={display_steps}, 显示目标={display_targets}, 比值={ratio:.2f}")
            
        except Exception as e:
            print(f"Error verifying level {level}: {e}")

if __name__ == "__main__":
    adjust_levels_387_390()