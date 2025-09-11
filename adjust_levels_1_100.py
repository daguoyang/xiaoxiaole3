#!/usr/bin/env python3
import json
import os

def calculate_required_values(target_display_steps, target_display_targets):
    """Calculate required moveCount and m_ct to achieve target display values"""
    # For display steps = 15:
    # display_steps = moveCount - 10 if moveCount - 10 > 0 else moveCount
    # So we need moveCount = 25 (since 25 - 10 = 15)
    required_move_count = target_display_steps + 10
    
    # For display targets = 45:
    # display_targets = m_ct + 10 if m_ct >= 10 else m_ct + 30
    # Since 45 > 40, we use the first formula: m_ct + 10 = 45
    # So m_ct = 35
    required_m_ct = target_display_targets - 10
    
    return required_move_count, required_m_ct

def adjust_levels_1_100():
    """Adjust levels 1-100 to display steps=15, targets=45"""
    config_dir = "assets/resources/config"
    target_steps = 15
    target_targets = 45
    
    required_move_count, required_m_ct = calculate_required_values(target_steps, target_targets)
    
    print(f"Adjusting levels 1-100 to display steps={target_steps}, targets={target_targets}")
    print(f"Required: moveCount={required_move_count}, m_ct={required_m_ct}")
    print("-" * 60)
    
    success_count = 0
    error_count = 0
    
    for level in range(1, 101):
        config_file = os.path.join(config_dir, f"{level}.json")
        
        if not os.path.exists(config_file):
            print(f"Warning: {config_file} not found")
            error_count += 1
            continue
            
        try:
            # Read current config
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Store original values for logging
            original_move_count = data['moveCount']
            original_m_ct = data['mapData'][0]['m_ct'][0]
            
            # Update values
            data['moveCount'] = required_move_count
            data['mapData'][0]['m_ct'][0] = required_m_ct
            
            # Write back to file
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
            
            print(f"Level {level:3}: moveCount {original_move_count:2} → {required_move_count:2}, m_ct {original_m_ct:2} → {required_m_ct:2}")
            success_count += 1
            
        except Exception as e:
            print(f"Error processing level {level}: {e}")
            error_count += 1
    
    print("-" * 60)
    print(f"Adjustment complete: {success_count} successful, {error_count} errors")
    
    # Verify a few levels
    print("\nVerifying first 5 levels:")
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
            
            print(f"Level {level}: Display Steps={display_steps}, Display Targets={display_targets}")
            
        except Exception as e:
            print(f"Error verifying level {level}: {e}")

if __name__ == "__main__":
    adjust_levels_1_100()