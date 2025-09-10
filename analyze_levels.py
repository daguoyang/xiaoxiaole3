#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os

def analyze_level_configs():
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"
    results = []
    
    # 分析前100个关卡
    for level in range(1, 101):
        file_path = os.path.join(config_dir, f"{level}.json")
        
        if not os.path.exists(file_path):
            continue
            
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            config_moves = data.get('moveCount', 0)
            block_count = data.get('blockCount', 0)
            
            # 计算实际显示步数：配置步数 > 10 则减10，否则保持原值
            actual_moves = config_moves - 10 if config_moves > 10 else config_moves
            
            # 计算目标数总和
            total_targets = 0
            map_data = data.get('mapData', [])
            for map_item in map_data:
                m_ct = map_item.get('m_ct', [])
                total_targets += sum(m_ct)
            
            # 计算实际显示目标数
            # 如果配置目标数 >= 10：游戏显示 = 配置数 + 10
            # 如果配置目标数 < 10：游戏显示 = 配置数 + 30
            if total_targets >= 10:
                actual_targets = total_targets + 10
            else:
                actual_targets = total_targets + 30
            
            # 计算比例
            ratio = actual_targets / actual_moves if actual_moves > 0 else float('inf')
            
            # 判断问题级别
            risk_level = "正常"
            if actual_moves <= 1:
                risk_level = "高危险"
            elif actual_moves <= 3:
                risk_level = "中危险"  
            elif actual_moves <= 5:
                risk_level = "低危险"
            elif actual_moves <= 10 and ratio >= 6:  # 步数很少但目标很多
                risk_level = "步数不足"
            elif ratio >= 8:  # 目标数是步数的8倍以上
                risk_level = "目标严重过多"
            elif ratio >= 5:  # 目标数是步数的5倍以上
                risk_level = "目标过多"
            elif ratio < 0.5:
                risk_level = "目标过少"
            
            results.append({
                'level': level,
                'config_moves': config_moves,
                'actual_moves': actual_moves,
                'config_targets': total_targets,
                'actual_targets': actual_targets,
                'ratio': ratio,
                'risk_level': risk_level
            })
            
        except Exception as e:
            print(f"Error reading level {level}: {e}")
    
    return results

def print_analysis(results):
    print("=" * 100)
    print("糖果消消乐关卡配置分析报告")
    print("=" * 100)
    
    # 分类统计
    risk_stats = {}
    problem_levels = []
    
    print("\n详细关卡分析：")
    print("-" * 100)
    print(f"{'关卡':<4} {'配置步数':<8} {'显示步数':<8} {'配置目标':<8} {'显示目标':<8} {'目标/步数':<10} {'风险级别':<10}")
    print("-" * 100)
    
    for result in results:
        level = result['level']
        config_moves = result['config_moves']
        actual_moves = result['actual_moves']
        config_targets = result['config_targets']
        actual_targets = result['actual_targets']
        ratio = result['ratio']
        risk_level = result['risk_level']
        
        # 统计风险级别
        risk_stats[risk_level] = risk_stats.get(risk_level, 0) + 1
        
        # 记录问题关卡
        if risk_level != "正常":
            problem_levels.append(result)
        
        # 格式化比例显示
        ratio_str = f"{ratio:.2f}" if ratio != float('inf') else "∞"
        
        print(f"{level:<4} {config_moves:<8} {actual_moves:<8} {config_targets:<8} {actual_targets:<8} {ratio_str:<10} {risk_level:<10}")
    
    print("-" * 100)
    
    # 风险统计
    print(f"\n风险级别统计：")
    for risk, count in risk_stats.items():
        print(f"  {risk}: {count}个关卡")
    
    # 按风险级别分组
    high_risk = [r for r in problem_levels if r['risk_level'] == '高危险']
    medium_risk = [r for r in problem_levels if r['risk_level'] == '中危险']
    low_risk = [r for r in problem_levels if r['risk_level'] == '低危险']
    target_issues = [r for r in problem_levels if '目标' in r['risk_level']]
    severe_target_issues = [r for r in problem_levels if r['risk_level'] == '目标严重过多']
    insufficient_moves = [r for r in problem_levels if r['risk_level'] == '步数不足']
    
    # 问题关卡详细分析
    if problem_levels:
        print(f"\n问题关卡详细分析：")
        print("=" * 60)
        
        if high_risk:
            print(f"\n高危险关卡 ({len(high_risk)}个)：")
            for r in high_risk:
                print(f"  关卡{r['level']}: 显示{r['actual_moves']}步, 需要完成{r['actual_targets']}个目标")
        
        if medium_risk:
            print(f"\n中危险关卡 ({len(medium_risk)}个)：")
            for r in medium_risk:
                print(f"  关卡{r['level']}: 显示{r['actual_moves']}步, 需要完成{r['actual_targets']}个目标")
        
        if low_risk:
            print(f"\n低危险关卡 ({len(low_risk)}个)：")
            for r in low_risk:
                print(f"  关卡{r['level']}: 显示{r['actual_moves']}步, 需要完成{r['actual_targets']}个目标")
        
        if severe_target_issues:
            print(f"\n目标严重过多关卡 ({len(severe_target_issues)}个)：")
            for r in severe_target_issues:
                print(f"  关卡{r['level']}: 显示{r['actual_moves']}步, 需要完成{r['actual_targets']}个目标, 比例{r['ratio']:.2f}")
        
        if insufficient_moves:
            print(f"\n步数不足关卡 ({len(insufficient_moves)}个)：")
            for r in insufficient_moves:
                print(f"  关卡{r['level']}: 显示{r['actual_moves']}步, 需要完成{r['actual_targets']}个目标, 比例{r['ratio']:.2f}")
        
        other_target_issues = [r for r in target_issues if r['risk_level'] not in ['目标严重过多', '步数不足']]
        if other_target_issues:
            print(f"\n其他目标数量问题关卡 ({len(other_target_issues)}个)：")
            for r in other_target_issues:
                print(f"  关卡{r['level']}: 显示{r['actual_moves']}步, 需要完成{r['actual_targets']}个目标, 比例{r['ratio']:.2f}")
    
    # 难度递进分析
    print(f"\n关卡难度递进分析：")
    print("=" * 60)
    
    # 检查相邻关卡的难度变化
    difficulty_jumps = []
    for i in range(1, len(results)):
        prev_ratio = results[i-1]['ratio']
        curr_ratio = results[i]['ratio']
        
        if prev_ratio != float('inf') and curr_ratio != float('inf'):
            change_ratio = curr_ratio / prev_ratio
            if change_ratio > 3 or change_ratio < 0.3:  # 难度变化超过3倍
                difficulty_jumps.append({
                    'from_level': results[i-1]['level'],
                    'to_level': results[i]['level'],
                    'from_ratio': prev_ratio,
                    'to_ratio': curr_ratio,
                    'change': change_ratio
                })
    
    if difficulty_jumps:
        print("发现显著难度跳跃的关卡：")
        for jump in difficulty_jumps:
            direction = "增加" if jump['change'] > 1 else "降低"
            print(f"  关卡{jump['from_level']} → 关卡{jump['to_level']}: 难度{direction}{jump['change']:.2f}倍")
    else:
        print("未发现显著的难度跳跃")
    
    # 修复建议
    print(f"\n修复建议：")
    print("=" * 60)
    
    if high_risk:
        print("1. 高危险关卡修复：")
        for r in high_risk:
            suggested_moves = max(10, r['actual_targets'] // 3)  # 建议步数为目标数的1/3，最少10步
            suggested_config = suggested_moves + 10
            print(f"   关卡{r['level']}: 建议配置步数改为{suggested_config} (显示{suggested_moves}步)")
    
    if medium_risk or low_risk:
        print("2. 中低危险关卡修复：")
        for r in medium_risk + low_risk:
            suggested_moves = max(8, r['actual_targets'] // 2)  # 建议步数为目标数的1/2，最少8步
            suggested_config = suggested_moves + 10
            print(f"   关卡{r['level']}: 建议配置步数改为{suggested_config} (显示{suggested_moves}步)")
    
    if target_issues:
        print("3. 目标数量问题修复：")
        for r in target_issues:
            if r['risk_level'] == '目标过多':
                suggested_targets = max(r['actual_moves'] * 3, 5)  # 建议目标数为步数的3倍
                print(f"   关卡{r['level']}: 建议减少目标数到{suggested_targets}个")
            else:
                suggested_targets = max(r['actual_moves'] * 1, 10)  # 建议目标数为步数的1倍，最少10个
                print(f"   关卡{r['level']}: 建议增加目标数到{suggested_targets}个")

if __name__ == "__main__":
    results = analyze_level_configs()
    print_analysis(results)