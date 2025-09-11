#!/usr/bin/env python3
import json
import os

def calculate_display_values(move_count, m_ct):
    """Calculate display values using original formulas"""
    # Steps formula: moveCount - 10 > 0 ? moveCount - 10 : moveCount
    display_steps = move_count - 10 if move_count - 10 > 0 else move_count
    
    # Targets formula: m_ct + 10 if m_ct >= 10, else m_ct + 30
    display_targets = m_ct + 10 if m_ct >= 10 else m_ct + 30
    
    return display_steps, display_targets

def check_ratio_levels():
    """Check levels 1-100 for targets/steps ratio > 3"""
    config_dir = "assets/resources/config"
    
    levels_to_adjust = []
    
    print("Checking levels 1-100 for targets/steps ratio > 3...")
    print("Level | Steps | Targets | Ratio | Needs Adjustment")
    print("-" * 55)
    
    for level in range(1, 101):
        config_file = os.path.join(config_dir, f"{level}.json")
        
        if not os.path.exists(config_file):
            print(f"Warning: {config_file} not found")
            continue
            
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            move_count = data['moveCount']
            m_ct = data['mapData'][0]['m_ct'][0]
            
            display_steps, display_targets = calculate_display_values(move_count, m_ct)
            
            ratio = display_targets / display_steps if display_steps > 0 else float('inf')
            needs_adjustment = ratio > 3
            
            print(f"{level:5} | {display_steps:5} | {display_targets:7} | {ratio:5.2f} | {'YES' if needs_adjustment else 'NO'}")
            
            if needs_adjustment:
                levels_to_adjust.append({
                    'level': level,
                    'display_steps': display_steps,
                    'display_targets': display_targets,
                    'ratio': ratio,
                    'original_data': data
                })
                
        except Exception as e:
            print(f"Error processing level {level}: {e}")
    
    print(f"\nFound {len(levels_to_adjust)} levels with ratio > 3")
    return levels_to_adjust

if __name__ == "__main__":
    levels_to_adjust = check_ratio_levels()
    
    if levels_to_adjust:
        print(f"\nLevels that need adjustment (ratio > 3):")
        for level_info in levels_to_adjust:
            print(f"Level {level_info['level']}: {level_info['display_targets']}/{level_info['display_steps']} = {level_info['ratio']:.2f}")
    else:
        print("\nNo levels found with targets/steps ratio > 3")