#!/usr/bin/env python3
"""
改进版多目标关卡修复脚本

使用更自然的目标分配策略：
1. 不同目标类型有不同的数量
2. 基于游戏设计原则创造有趣的变化
3. 保持总体难度平衡
"""

import json
import os
import random
from typing import List, Tuple

def config_to_display(config_target: int, config_steps: int) -> Tuple[int, int]:
    """将配置数值转换为显示数值"""
    display_steps = max(1, config_steps - 10)
    
    if config_target >= 10:
        display_target = config_target + 10
    else:
        display_target = config_target + 30
    
    return display_target, display_steps

def distribute_targets_naturally(total_target: int, num_targets: int, level: int) -> List[int]:
    """
    自然分配目标数量，创造有趣的变化
    
    分配策略：
    1. 主目标 (50-70%) + 次要目标 (30-50%)
    2. 早期关卡差异较小，后期关卡差异较大
    3. 添加随机因子避免过于规律
    """
    
    if num_targets == 1:
        return [total_target]
    
    # 根据关卡数调整变化程度
    if level <= 50:
        variation_factor = 0.3  # 早期变化较小
    elif level <= 200:
        variation_factor = 0.4  # 中期适中变化
    else:
        variation_factor = 0.5  # 后期变化较大
    
    targets = []
    
    if num_targets == 2:
        # 两个目标：主次分配 (60-40 到 70-30)
        main_ratio = 0.6 + random.random() * 0.1  # 60%-70%
        main_target = int(total_target * main_ratio)
        secondary_target = total_target - main_target
        
        # 确保都至少为1
        main_target = max(1, main_target)
        secondary_target = max(1, secondary_target)
        
        # 随机决定哪个是主目标
        if random.random() < 0.5:
            targets = [main_target, secondary_target]
        else:
            targets = [secondary_target, main_target]
    
    elif num_targets == 3:
        # 三个目标：主(45-55%) + 次(25-35%) + 辅(15-25%)
        main_ratio = 0.45 + random.random() * 0.1  # 45%-55%
        secondary_ratio = 0.25 + random.random() * 0.1  # 25%-35%
        tertiary_ratio = 1.0 - main_ratio - secondary_ratio
        
        main_target = max(1, int(total_target * main_ratio))
        secondary_target = max(1, int(total_target * secondary_ratio))
        tertiary_target = max(1, total_target - main_target - secondary_target)
        
        targets = [main_target, secondary_target, tertiary_target]
        # 随机排序避免固定模式
        random.shuffle(targets)
    
    elif num_targets == 4:
        # 四个目标：递减分配 40%, 30%, 20%, 10%
        ratios = [0.4, 0.3, 0.2, 0.1]
        # 添加随机变化
        for i in range(len(ratios)):
            ratios[i] += (random.random() - 0.5) * 0.1
        
        # 归一化确保总和为1
        total_ratio = sum(ratios)
        ratios = [r / total_ratio for r in ratios]
        
        targets = []
        remaining = total_target
        for i, ratio in enumerate(ratios[:-1]):
            target = max(1, int(total_target * ratio))
            targets.append(target)
            remaining -= target
        
        targets.append(max(1, remaining))
        random.shuffle(targets)
    
    else:
        # 5个或更多目标：递减分配
        targets = []
        remaining = total_target
        
        for i in range(num_targets - 1):
            # 剩余目标平均分配，但添加变化
            avg = remaining / (num_targets - i)
            variation = avg * variation_factor * (random.random() - 0.5)
            target = max(1, int(avg + variation))
            targets.append(target)
            remaining -= target
        
        targets.append(max(1, remaining))
    
    # 确保所有目标至少为1，且总和正确
    targets = [max(1, t) for t in targets]
    
    # 调整总和
    current_total = sum(targets)
    if current_total != total_target:
        diff = total_target - current_total
        # 将差值分配给最大的目标
        max_idx = targets.index(max(targets))
        targets[max_idx] = max(1, targets[max_idx] + diff)
    
    return targets

def fix_multi_target_level_natural(level: int) -> bool:
    """用自然分配策略修复单个关卡的多目标配置"""
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"
    config_path = os.path.join(config_dir, f"{level}.json")
    
    if not os.path.exists(config_path):
        return False
    
    try:
        # 读取配置
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        if not config.get('mapData') or len(config['mapData']) == 0:
            return False
        
        map_data = config['mapData'][0]
        m_id = map_data.get('m_id', [])
        m_ct = map_data.get('m_ct', [])
        
        # 检查是否需要修复
        if len(m_id) <= 1:
            return False  # 单目标或无目标，不需要修复
        
        if len(m_ct) >= len(m_id):
            # 已经有足够的目标数量，但可能是均分的，需要重新分配
            current_total = sum(m_ct)
        else:
            # 缺少目标数量
            current_total = m_ct[0] if m_ct else 1
        
        # 用自然分配策略重新分配目标数量
        new_targets = distribute_targets_naturally(current_total, len(m_id), level)
        
        # 更新配置
        map_data['m_ct'] = new_targets
        
        # 写回文件
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, separators=(',', ':'), ensure_ascii=False)
        
        # 计算显示值验证
        display_targets = []
        for target in new_targets:
            if target >= 10:
                display_targets.append(target + 10)
            else:
                display_targets.append(target + 30)
        
        display_steps = max(1, config.get('moveCount', 20) - 10)
        total_display = sum(display_targets)
        ratio = total_display / display_steps if display_steps > 0 else 0
        
        print(f"关卡 {level:3d}: {len(m_id)}目标 配置{new_targets} 显示{display_targets} 总比值{ratio:.2f}")
        
        return True
        
    except Exception as e:
        print(f"修复关卡 {level} 失败: {e}")
        return False

def main():
    print("改进多目标关卡配置 - 使用自然分配策略...")
    print("=" * 70)
    
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"
    
    # 设置随机种子保证可重复性
    random.seed(12345)
    
    # 扫描所有关卡文件
    fixed_count = 0
    checked_count = 0
    
    for level in range(1, 1701):
        config_path = os.path.join(config_dir, f"{level}.json")
        
        if os.path.exists(config_path):
            checked_count += 1
            if fix_multi_target_level_natural(level):
                fixed_count += 1
    
    print("=" * 70)
    print(f"处理完成: 检查了 {checked_count} 个关卡，优化了 {fixed_count} 个多目标关卡")
    
    # 验证几个关键关卡的效果
    print("\n验证优化结果:")
    print("-" * 50)
    
    test_levels = [3, 24, 61, 200, 500, 1000, 1700]
    
    for level in test_levels:
        config_path = os.path.join(config_dir, f"{level}.json")
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            if config.get('mapData') and len(config['mapData']) > 0:
                map_data = config['mapData'][0]
                m_id = map_data.get('m_id', [])
                m_ct = map_data.get('m_ct', [])
                
                if len(m_id) > 1:
                    # 计算显示值
                    display_targets = []
                    for target in m_ct:
                        if target >= 10:
                            display_targets.append(target + 10)
                        else:
                            display_targets.append(target + 30)
                    
                    config_steps = config.get('moveCount', 20)
                    display_steps = max(1, config_steps - 10)
                    
                    print(f"关卡 {level:3d}: {len(m_id)}种目标")
                    print(f"         配置数量: {m_ct}")
                    print(f"         显示数量: {display_targets}")
                    print(f"         是否均匀: {'否' if len(set(m_ct)) > 1 else '是'}")
                    print()

if __name__ == "__main__":
    main()