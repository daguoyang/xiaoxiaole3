#!/usr/bin/env python3
import json
import os

def adjust_high_ratio_levels():
    """Adjust levels with ratio > 3 to display steps=15, targets=45"""
    config_dir = "assets/resources/config"
    
    # Levels that need adjustment based on the check
    levels_to_adjust = [6, 13, 20, 36, 65, 83]
    
    # Calculate required values for display steps=15, targets=45
    # For display steps = 15: moveCount = 25 (since 25 - 10 = 15)
    # For display targets = 45: m_ct = 35 (since 35 + 10 = 45)
    required_move_count = 25
    required_m_ct = 35
    
    print(f"Adjusting {len(levels_to_adjust)} levels to display steps=15, targets=45")
    print(f"Required: moveCount={required_move_count}, m_ct={required_m_ct}")
    print("-" * 60)
    
    success_count = 0
    
    for level in levels_to_adjust:
        config_file = os.path.join(config_dir, f"{level}.json")
        
        try:
            # Read current config
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Store original values for logging
            original_move_count = data['moveCount']
            original_m_ct = data['mapData'][0]['m_ct'][0]
            
            # Calculate original display values
            original_steps = original_move_count - 10 if original_move_count - 10 > 0 else original_move_count
            original_targets = original_m_ct + 10 if original_m_ct >= 10 else original_m_ct + 30
            original_ratio = original_targets / original_steps if original_steps > 0 else float('inf')
            
            # Update values
            data['moveCount'] = required_move_count
            data['mapData'][0]['m_ct'][0] = required_m_ct
            
            # Write back to file
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
            
            print(f"Level {level:2}: ratio {original_ratio:.2f} ({original_targets}/{original_steps}) → 3.00 (45/15)")
            success_count += 1
            
        except Exception as e:
            print(f"Error processing level {level}: {e}")
    
    print("-" * 60)
    print(f"Adjustment complete: {success_count}/{len(levels_to_adjust)} successful")
    
    # Verify the adjusted levels
    print("\nVerifying adjusted levels:")
    for level in levels_to_adjust:
        config_file = os.path.join(config_dir, f"{level}.json")
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            move_count = data['moveCount']
            m_ct = data['mapData'][0]['m_ct'][0]
            
            # Calculate display values
            display_steps = move_count - 10 if move_count - 10 > 0 else move_count
            display_targets = m_ct + 10 if m_ct >= 10 else m_ct + 30
            ratio = display_targets / display_steps if display_steps > 0 else float('inf')
            
            print(f"Level {level:2}: Steps={display_steps}, Targets={display_targets}, Ratio={ratio:.2f}")
            
        except Exception as e:
            print(f"Error verifying level {level}: {e}")

if __name__ == "__main__":
    adjust_high_ratio_levels()