#!/usr/bin/env python3
import json
import os

def add_steps_to_all_levels():
    """Add 2 steps to all 1700 levels"""
    config_dir = "assets/resources/config"
    
    print("给所有1700关增加2步...")
    print("原理：moveCount + 2 → 显示步数 + 2")
    print("-" * 50)
    
    success_count = 0
    error_count = 0
    
    # Process levels 1-1700
    for level in range(1, 1701):
        config_file = os.path.join(config_dir, f"{level}.json")
        
        if not os.path.exists(config_file):
            print(f"Warning: {config_file} not found")
            error_count += 1
            continue
            
        try:
            # Read current config
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Store original value for logging
            original_move_count = data['moveCount']
            
            # Add 2 steps
            data['moveCount'] = original_move_count + 2
            
            # Write back to file
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
            
            # Calculate display steps for verification
            original_display = original_move_count - 10 if original_move_count - 10 > 0 else original_move_count
            new_display = data['moveCount'] - 10 if data['moveCount'] - 10 > 0 else data['moveCount']
            
            if level <= 10 or level % 100 == 0:  # Show first 10 levels and every 100th level
                print(f"Level {level:4}: moveCount {original_move_count:2} → {data['moveCount']:2} (显示 {original_display:2} → {new_display:2})")
            
            success_count += 1
            
        except Exception as e:
            print(f"Error processing level {level}: {e}")
            error_count += 1
        
        # Progress indicator
        if level % 200 == 0:
            print(f"已处理 {level} 个关卡，成功: {success_count}, 失败: {error_count}")
    
    print("-" * 50)
    print(f"所有关卡处理完成！")
    print(f"总计: 1700 个关卡")
    print(f"成功: {success_count} 个")
    print(f"失败: {error_count} 个")
    print(f"成功率: {success_count/1700*100:.1f}%")
    
    # Verify a few levels
    print("\n验证前5关:")
    for level in range(1, 6):
        config_file = os.path.join(config_dir, f"{level}.json")
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            move_count = data['moveCount']
            m_ct = data['mapData'][0]['m_ct'][0]
            
            # Calculate display values
            display_steps = move_count - 10 if move_count - 10 > 0 else move_count
            display_targets = m_ct + 10 if m_ct >= 10 else m_ct + 30
            
            print(f"Level {level}: 显示步数={display_steps}, 显示目标={display_targets}")
            
        except Exception as e:
            print(f"Error verifying level {level}: {e}")

if __name__ == "__main__":
    add_steps_to_all_levels()