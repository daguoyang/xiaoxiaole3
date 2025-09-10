#!/usr/bin/env python3
import json
import os
import statistics
from pathlib import Path

def calculate_display_values(config_steps, config_target):
    """Calculate display values based on the rules provided"""
    # Steps rule: display = config - 10 (if config > 10)
    display_steps = max(1, config_steps - 10) if config_steps > 10 else config_steps
    
    # Target rule: if config >= 10, display = config + 10; if < 10, display = config + 30
    if config_target >= 10:
        display_target = config_target + 10
    else:
        display_target = config_target + 30
    
    return display_steps, display_target

def reverse_calculate_config(display_steps, display_target):
    """Convert display values back to config values"""
    # Steps: config = display + 10
    config_steps = display_steps + 10
    
    # Target: if display >= 40, config = display - 10; else config = display - 30
    if display_target >= 40:
        config_target = display_target - 10
    else:
        config_target = max(1, display_target - 30)
    
    return config_steps, config_target

def analyze_level(config_path):
    """Analyze a single level configuration file"""
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        move_count = config.get('moveCount', 0)
        map_data = config.get('mapData', [])
        
        # Extract targets (m_ct values)
        targets = []
        for map_item in map_data:
            m_ct = map_item.get('m_ct', [])
            targets.extend(m_ct)
        
        # Get the primary target (usually the first one)
        primary_target = targets[0] if targets else 0
        
        # Calculate display values
        display_steps, display_target = calculate_display_values(move_count, primary_target)
        
        return {
            'level': int(os.path.basename(config_path).replace('.json', '')),
            'config_steps': move_count,
            'config_target': primary_target,
            'display_steps': display_steps,
            'display_target': display_target,
            'ratio': display_target / display_steps if display_steps > 0 else 0,
            'targets_count': len(targets),
            'all_targets': targets
        }
    except Exception as e:
        print(f"Error analyzing {config_path}: {e}")
        return None

def main():
    # Quick analysis and summary
    source_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8 5/assets/resources/config/"
    current_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"
    
    # Analyze source project (first 100 levels)
    source_ratios = []
    for level in range(1, 101):
        config_path = os.path.join(source_dir, f"{level}.json")
        if os.path.exists(config_path):
            result = analyze_level(config_path)
            if result and result['ratio'] > 0:
                source_ratios.append(result['ratio'])
    
    # Calculate source statistics
    source_min = min(source_ratios)
    source_max = max(source_ratios)
    source_mean = statistics.mean(source_ratios)
    source_median = statistics.median(source_ratios)
    
    # Analyze problematic levels in current project
    problematic_levels = []
    
    for level in range(1, 201):
        config_path = os.path.join(current_dir, f"{level}.json")
        if os.path.exists(config_path):
            result = analyze_level(config_path)
            if result:
                issues = []
                
                # Issue 1: Target < Steps (too easy)
                if result['display_target'] < result['display_steps']:
                    issues.append("Too Easy")
                
                # Issue 2: Ratio way outside normal range
                if result['ratio'] > source_max * 2:
                    issues.append("Too Hard")
                elif result['ratio'] < source_min * 0.5:
                    issues.append("Too Easy")
                
                if issues:
                    # Calculate recommended values using a reasonable difficulty curve
                    level_progress = min(1.0, (level - 1) / 99.0)  # 0 to 1 over first 100 levels
                    target_ratio = source_min + (source_max - source_min) * level_progress
                    
                    # Keep current steps, adjust target
                    recommended_display_target = int(result['display_steps'] * target_ratio)
                    recommended_config_steps, recommended_config_target = reverse_calculate_config(
                        result['display_steps'], recommended_display_target
                    )
                    
                    problematic_levels.append({
                        'level': level,
                        'issues': issues,
                        'current': {
                            'config_steps': result['config_steps'],
                            'config_target': result['config_target'],
                            'display_steps': result['display_steps'],
                            'display_target': result['display_target'],
                            'ratio': result['ratio']
                        },
                        'recommended': {
                            'config_steps': recommended_config_steps,
                            'config_target': recommended_config_target,
                            'display_steps': result['display_steps'],
                            'display_target': recommended_display_target,
                            'ratio': target_ratio
                        }
                    })
    
    # Generate summary report
    print("="*80)
    print("糖果消消乐关卡配置分析报告")
    print("="*80)
    
    print(f"\n【源码项目正常比例范围】(前100关)")
    print(f"  最小值: {source_min:.3f}")
    print(f"  最大值: {source_max:.3f}")
    print(f"  平均值: {source_mean:.3f}")
    print(f"  中位数: {source_median:.3f}")
    
    print(f"\n【当前项目异常关卡统计】(前200关)")
    print(f"  总计异常关卡: {len(problematic_levels)} 关")
    
    # Count by issue type
    too_easy_count = len([l for l in problematic_levels if "Too Easy" in l['issues']])
    too_hard_count = len([l for l in problematic_levels if "Too Hard" in l['issues']])
    
    print(f"  - 过于简单 (目标数 < 步数): {too_easy_count} 关")
    print(f"  - 过于困难 (比例过高): {too_hard_count} 关")
    
    print(f"\n【重点修复建议】")
    print("以下为过于简单的关卡修复方案 (目标数 < 步数):")
    
    too_easy_levels = [l for l in problematic_levels if "Too Easy" in l['issues'] and l['current']['display_target'] < l['current']['display_steps']]
    too_easy_levels.sort(key=lambda x: x['level'])
    
    print(f"\n关卡 | 当前配置 | 建议配置 | 说明")
    print("-" * 70)
    
    for level_data in too_easy_levels[:20]:  # Show first 20
        level = level_data['level']
        current = level_data['current']
        recommended = level_data['recommended']
        
        print(f"{level:3d}  | moveCount={current['config_steps']:2d}, m_ct=[{current['config_target']:2d}] | moveCount={recommended['config_steps']:2d}, m_ct=[{recommended['config_target']:2d}] | {current['display_target']}/{current['display_steps']} -> {recommended['display_target']}/{recommended['display_steps']}")
    
    if len(too_easy_levels) > 20:
        print(f"... 还有 {len(too_easy_levels) - 20} 个类似问题的关卡")
    
    # Show levels that are too hard
    too_hard_levels = [l for l in problematic_levels if "Too Hard" in l['issues']]
    if too_hard_levels:
        print(f"\n过于困难的关卡修复方案:")
        print(f"\n关卡 | 当前配置 | 建议配置 | 说明")
        print("-" * 70)
        
        for level_data in too_hard_levels[:10]:
            level = level_data['level']
            current = level_data['current']
            recommended = level_data['recommended']
            
            print(f"{level:3d}  | moveCount={current['config_steps']:2d}, m_ct=[{current['config_target']:2d}] | moveCount={recommended['config_steps']:2d}, m_ct=[{recommended['config_target']:2d}] | {current['display_target']}/{current['display_steps']} -> {recommended['display_target']}/{recommended['display_steps']}")
    
    print(f"\n【批量修复脚本】")
    print("可以使用以下Python脚本批量修复最严重的问题:")
    
    print(f"""
# 修复脚本示例 - 处理目标数小于步数的关卡
import json
import os

fixes = [""")
    
    for level_data in too_easy_levels[:10]:
        level = level_data['level']
        recommended = level_data['recommended']
        print(f"    ({level}, {recommended['config_steps']}, {recommended['config_target']}),")
    
    print(f"""
]

config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"

for level, new_move_count, new_target in fixes:
    config_path = os.path.join(config_dir, f"{{level}}.json")
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    config['moveCount'] = new_move_count
    config['mapData'][0]['m_ct'] = [new_target]
    
    with open(config_path, 'w') as f:
        json.dump(config, f, separators=(',', ':'))
    
    print(f"Fixed level {{level}}")
""")
    
    print(f"\n【总结】")
    print(f"当前项目在前200关中有 {len(problematic_levels)} 个关卡存在配置问题。")
    print(f"其中 {too_easy_count} 个关卡过于简单，{too_hard_count} 个关卡过于困难。")
    print(f"建议优先修复目标数小于步数的关卡，这些关卡几乎无需技巧即可通关，")
    print(f"会严重影响游戏体验和挑战性。")

if __name__ == "__main__":
    main()