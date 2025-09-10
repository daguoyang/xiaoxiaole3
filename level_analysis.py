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

def analyze_source_project():
    """Analyze first 100 levels from source project to establish normal ratios"""
    source_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8 5/assets/resources/config/"
    results = []
    
    print("Analyzing source project (first 100 levels)...")
    for level in range(1, 101):
        config_path = os.path.join(source_dir, f"{level}.json")
        if os.path.exists(config_path):
            result = analyze_level(config_path)
            if result:
                results.append(result)
    
    return results

def analyze_current_project():
    """Analyze first 200 levels from current project"""
    current_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"
    results = []
    
    print("Analyzing current project (first 200 levels)...")
    for level in range(1, 201):
        config_path = os.path.join(current_dir, f"{level}.json")
        if os.path.exists(config_path):
            result = analyze_level(config_path)
            if result:
                results.append(result)
    
    return results

def calculate_statistics(data):
    """Calculate statistics for the ratio data"""
    ratios = [item['ratio'] for item in data if item['ratio'] > 0]
    if not ratios:
        return None
    
    return {
        'min': min(ratios),
        'max': max(ratios),
        'mean': statistics.mean(ratios),
        'median': statistics.median(ratios),
        'stdev': statistics.stdev(ratios) if len(ratios) > 1 else 0
    }

def find_abnormal_levels(current_data, source_stats):
    """Find levels with abnormal ratios compared to source"""
    abnormal_levels = []
    
    normal_min = source_stats['min']
    normal_max = source_stats['max']
    normal_mean = source_stats['mean']
    normal_stdev = source_stats['stdev']
    
    # Define thresholds
    # 1. Ratio is outside 2 standard deviations
    # 2. Target < Steps (ratio < 1.0)
    # 3. Ratio is more than 2x the normal max
    
    for level_data in current_data:
        ratio = level_data['ratio']
        issues = []
        
        # Issue 1: Target < Steps
        if level_data['display_target'] < level_data['display_steps']:
            issues.append("target_less_than_steps")
        
        # Issue 2: Ratio too low
        if ratio < normal_min * 0.5:  # Less than half of normal minimum
            issues.append("ratio_too_low")
        
        # Issue 3: Ratio too high
        if ratio > normal_max * 2:  # More than twice normal maximum
            issues.append("ratio_too_high")
        
        # Issue 4: Way outside normal range
        if ratio < (normal_mean - 2 * normal_stdev) or ratio > (normal_mean + 2 * normal_stdev):
            if ratio < normal_min or ratio > normal_max:
                issues.append("outside_normal_range")
        
        if issues:
            abnormal_levels.append({
                'level': level_data['level'],
                'issues': issues,
                'current_ratio': ratio,
                'display_steps': level_data['display_steps'],
                'display_target': level_data['display_target'],
                'config_steps': level_data['config_steps'],
                'config_target': level_data['config_target'],
            })
    
    return abnormal_levels

def generate_fix_recommendations(abnormal_level, source_stats):
    """Generate fix recommendations for an abnormal level"""
    level = abnormal_level['level']
    current_steps = abnormal_level['display_steps']
    current_target = abnormal_level['display_target']
    issues = abnormal_level['issues']
    
    recommendations = []
    
    # Calculate target range based on source statistics
    min_target_ratio = source_stats['min']
    max_target_ratio = source_stats['max']
    mean_ratio = source_stats['mean']
    
    # Recommend target based on current steps and normal ratios
    if current_steps > 0:
        # Use mean ratio as base, but adjust based on level difficulty curve
        # Earlier levels should be easier (lower ratio), later levels harder (higher ratio)
        difficulty_factor = min(1.0, level / 100.0)  # Scale from 0 to 1 over first 100 levels
        target_ratio = min_target_ratio + (max_target_ratio - min_target_ratio) * difficulty_factor
        
        recommended_display_target = int(current_steps * target_ratio)
        
        # Convert back to config values
        # For target: if display >= 40, config = display - 10; else config = display - 30
        if recommended_display_target >= 40:
            recommended_config_target = recommended_display_target - 10
        else:
            recommended_config_target = max(1, recommended_display_target - 30)
        
        # For steps: config = display + 10
        recommended_config_steps = current_steps + 10
        
        recommendations.append({
            'type': 'target_adjustment',
            'recommended_config_steps': recommended_config_steps,
            'recommended_config_target': recommended_config_target,
            'recommended_display_steps': current_steps,
            'recommended_display_target': recommended_display_target,
            'new_ratio': target_ratio,
            'reason': f'Adjust to normal difficulty curve (ratio: {target_ratio:.2f})'
        })
    
    return recommendations

def main():
    # Analyze source project
    source_data = analyze_source_project()
    source_stats = calculate_statistics(source_data)
    
    print(f"\nSOURCE PROJECT ANALYSIS (First 100 levels):")
    print(f"Total levels analyzed: {len(source_data)}")
    print(f"Ratio Statistics:")
    print(f"  Min: {source_stats['min']:.3f}")
    print(f"  Max: {source_stats['max']:.3f}")
    print(f"  Mean: {source_stats['mean']:.3f}")
    print(f"  Median: {source_stats['median']:.3f}")
    print(f"  Std Dev: {source_stats['stdev']:.3f}")
    
    # Analyze current project
    current_data = analyze_current_project()
    current_stats = calculate_statistics(current_data)
    
    print(f"\nCURRENT PROJECT ANALYSIS (First 200 levels):")
    print(f"Total levels analyzed: {len(current_data)}")
    print(f"Ratio Statistics:")
    print(f"  Min: {current_stats['min']:.3f}")
    print(f"  Max: {current_stats['max']:.3f}")
    print(f"  Mean: {current_stats['mean']:.3f}")
    print(f"  Median: {current_stats['median']:.3f}")
    print(f"  Std Dev: {current_stats['stdev']:.3f}")
    
    # Find abnormal levels
    abnormal_levels = find_abnormal_levels(current_data, source_stats)
    
    print(f"\nABNORMAL LEVELS FOUND: {len(abnormal_levels)}")
    print("="*80)
    
    # Generate detailed report
    for abnormal in abnormal_levels:
        level = abnormal['level']
        print(f"\nLEVEL {level}:")
        print(f"  Issues: {', '.join(abnormal['issues'])}")
        print(f"  Current: {abnormal['display_target']} targets / {abnormal['display_steps']} steps = {abnormal['current_ratio']:.3f} ratio")
        print(f"  Config: moveCount={abnormal['config_steps']}, m_ct=[{abnormal['config_target']}]")
        
        # Generate fix recommendations
        fixes = generate_fix_recommendations(abnormal, source_stats)
        for fix in fixes:
            print(f"  RECOMMENDATION:")
            print(f"    New config: moveCount={fix['recommended_config_steps']}, m_ct=[{fix['recommended_config_target']}]")
            print(f"    Display: {fix['recommended_display_target']} targets / {fix['recommended_display_steps']} steps = {fix['new_ratio']:.3f} ratio")
            print(f"    Reason: {fix['reason']}")
    
    # Summary by issue type
    issue_counts = {}
    for abnormal in abnormal_levels:
        for issue in abnormal['issues']:
            issue_counts[issue] = issue_counts.get(issue, 0) + 1
    
    print(f"\nISSUE SUMMARY:")
    for issue, count in issue_counts.items():
        print(f"  {issue}: {count} levels")
    
    print(f"\nTOP PRIORITY FIXES (target < steps):")
    target_less_than_steps = [a for a in abnormal_levels if 'target_less_than_steps' in a['issues']]
    target_less_than_steps.sort(key=lambda x: x['level'])
    
    for abnormal in target_less_than_steps[:10]:  # Show first 10
        fixes = generate_fix_recommendations(abnormal, source_stats)
        if fixes:
            fix = fixes[0]
            print(f"  Level {abnormal['level']}: moveCount={fix['recommended_config_steps']}, m_ct=[{fix['recommended_config_target']}]")

if __name__ == "__main__":
    main()