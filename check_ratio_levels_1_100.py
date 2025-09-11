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

def check_ratio_levels_1_100():
    """Check levels 1-100 for targets/steps ratio > 3"""
    
    # First restore from backup if it exists
    backup_dir = "original_backup"
    config_dir = "assets/resources/config"
    
    levels_to_adjust = []
    
    print("Checking levels 1-100 for targets/steps ratio > 3...")
    print("Level | Steps | Targets | Ratio | Needs Adjustment")
    print("-" * 55)
    
    for level in range(1, 101):
        backup_file = os.path.join(backup_dir, f"{level}.json")
        config_file = os.path.join(config_dir, f"{level}.json")
        
        # Try to restore from backup first
        if os.path.exists(backup_file):
            try:
                with open(backup_file, 'r', encoding='utf-8') as f:
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
                print(f"Error processing backup for level {level}: {e}")
        else:
            print(f"Warning: No backup found for level {level}")
    
    print(f"\nFound {len(levels_to_adjust)} levels with ratio > 3")
    return levels_to_adjust

if __name__ == "__main__":
    levels_to_adjust = check_ratio_levels_1_100()
    
    if levels_to_adjust:
        print(f"\nLevels that need adjustment (ratio > 3):")
        for level_info in levels_to_adjust:
            print(f"Level {level_info['level']}: {level_info['display_targets']}/{level_info['display_steps']} = {level_info['ratio']:.2f}")
    else:
        print("\nNo levels found with targets/steps ratio > 3")