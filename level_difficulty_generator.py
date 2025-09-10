#!/usr/bin/env python3
"""
糖果消消乐关卡难度重新平衡生成器

基于用户定义的难度曲线和游戏平衡补偿公式，生成1700个关卡的参数。

游戏平衡补偿公式：
- 显示步数 = max(1, 配置步数 - 10)
- 显示目标数 = 配置目标数 + 10 (如果配置目标数 >= 10)
- 显示目标数 = 配置目标数 + 30 (如果配置目标数 < 10)

反推公式：
- 配置步数 = 显示步数 + 10
- 配置目标数 = 显示目标数 - 10 (如果显示目标数 >= 40，因为配置值至少10)
- 配置目标数 = 显示目标数 - 30 (如果显示目标数 < 40)
"""

import json
import os
import math
import random
from typing import Dict, List, Tuple

class LevelDifficultyGenerator:
    def __init__(self):
        # 难度阶段定义 (关卡区间, 显示T范围, 显示S范围, R范围)
        self.stages = {
            'tutorial': {'range': (1, 10), 'T': (20, 50), 'S': (20, 30), 'R': (0.8, 1.5)},
            'easy': {'range': (11, 200), 'T': (40, 80), 'S': (25, 35), 'R': (1.4, 3.0)},
            'normal': {'range': (201, 800), 'T': (60, 120), 'S': (28, 36), 'R': (2.0, 4.3)},
            'hard': {'range': (801, 1400), 'T': (90, 160), 'S': (30, 40), 'R': (3.0, 5.0)},
            'expert': {'range': (1401, 1700), 'T': (120, 220), 'S': (30, 45), 'R': (3.5, 5.5)},
        }
        
        # 特殊关卡设置
        self.spike_interval = (8, 12)  # 卡点关间隔
        self.relief_interval = (15, 30)  # 放松关间隔
        self.spike_multiplier = (1.2, 1.5)  # 卡点关目标数倍率
        self.relief_multiplier = (0.8, 0.9)  # 放松关比值倍率
        
        # 随机扰动范围
        self.random_ranges = {
            'tutorial': {'T': 5, 'S': 2},
            'easy': {'T': 8, 'S': 2},
            'normal': {'T': 10, 'S': 3},
            'hard': {'T': 12, 'S': 3},
            'expert': {'T': 15, 'S': 3},
        }
    
    def display_to_config(self, display_target: int, display_steps: int) -> Tuple[int, int]:
        """将显示数值转换为配置数值"""
        # 配置步数 = 显示步数 + 10
        config_steps = display_steps + 10
        
        # 配置目标数根据显示值推算
        if display_target >= 40:  # 说明配置值 >= 10
            config_target = display_target - 10
        else:  # 说明配置值 < 10
            config_target = display_target - 30
        
        # 安全检查
        config_target = max(1, config_target)
        config_steps = max(11, config_steps)  # 确保显示步数至少为1
        
        return config_target, config_steps
    
    def config_to_display(self, config_target: int, config_steps: int) -> Tuple[int, int]:
        """将配置数值转换为显示数值（用于验证）"""
        display_steps = max(1, config_steps - 10)
        
        if config_target >= 10:
            display_target = config_target + 10
        else:
            display_target = config_target + 30
        
        return display_target, display_steps
    
    def get_stage_for_level(self, level: int) -> str:
        """获取关卡所属的难度阶段"""
        for stage_name, stage_info in self.stages.items():
            start, end = stage_info['range']
            if start <= level <= end:
                return stage_name
        return 'expert'  # 默认专家级
    
    def linear_interpolate(self, level: int, stage_info: Dict) -> Tuple[int, int]:
        """线性插值计算基础显示数值"""
        start, end = stage_info['range']
        progress = (level - start) / (end - start) if end > start else 0
        
        t_min, t_max = stage_info['T']
        s_min, s_max = stage_info['S']
        
        base_display_target = int(t_min + progress * (t_max - t_min))
        base_display_steps = int(s_min + progress * (s_max - s_min))
        
        return base_display_target, base_display_steps
    
    def apply_random_perturbation(self, target: int, steps: int, stage_name: str) -> Tuple[int, int]:
        """应用随机扰动"""
        ranges = self.random_ranges[stage_name]
        
        target_delta = random.randint(-ranges['T'], ranges['T'])
        steps_delta = random.randint(-ranges['S'], ranges['S'])
        
        return target + target_delta, steps + steps_delta
    
    def is_spike_level(self, level: int) -> bool:
        """判断是否为卡点关"""
        if level <= 10:  # 教学阶段不设卡点关
            return False
        
        # 简单的模式：每10关一个卡点关
        return level % 10 == 0 and random.random() < 0.7
    
    def is_relief_level(self, level: int) -> bool:
        """判断是否为放松关"""
        if level <= 10:  # 教学阶段不需要放松关
            return False
        
        # 每20关有机会出现放松关
        return level % 20 == 5 and random.random() < 0.5
    
    def validate_ratio(self, display_target: int, display_steps: int, stage_info: Dict) -> bool:
        """验证比值是否在合理范围内"""
        ratio = display_target / display_steps
        r_min, r_max = stage_info['R']
        return r_min <= ratio <= r_max
    
    def adjust_to_valid_ratio(self, display_target: int, display_steps: int, stage_info: Dict) -> Tuple[int, int]:
        """调整参数到有效比值范围内"""
        ratio = display_target / display_steps
        r_min, r_max = stage_info['R']
        
        if ratio < r_min:
            # 比值太小，增加目标数或减少步数
            new_target = int(display_steps * r_min * 1.1)  # 稍微超出最小值
            display_target = min(new_target, stage_info['T'][1])  # 不超过最大目标数
        elif ratio > r_max:
            # 比值太大，减少目标数或增加步数
            new_target = int(display_steps * r_max * 0.9)  # 稍微低于最大值
            display_target = max(new_target, stage_info['T'][0])  # 不低于最小目标数
        
        return display_target, display_steps
    
    def generate_level_params(self, level: int) -> Dict:
        """生成单个关卡的参数"""
        stage_name = self.get_stage_for_level(level)
        stage_info = self.stages[stage_name]
        
        # 基础线性插值
        base_target, base_steps = self.linear_interpolate(level, stage_info)
        
        # 应用随机扰动
        target, steps = self.apply_random_perturbation(base_target, base_steps, stage_name)
        
        # 应用特殊关卡调整
        if self.is_spike_level(level):
            multiplier = random.uniform(*self.spike_multiplier)
            target = int(target * multiplier)
            print(f"关卡 {level}: 卡点关，目标数增加到 {target}")
        elif self.is_relief_level(level):
            # 放松关通过降低目标数实现
            multiplier = random.uniform(*self.relief_multiplier)
            target = int(target * multiplier)
            print(f"关卡 {level}: 放松关，目标数降低到 {target}")
        
        # 确保参数在范围内
        target = max(stage_info['T'][0], min(target, stage_info['T'][1]))
        steps = max(stage_info['S'][0], min(steps, stage_info['S'][1]))
        
        # 验证并调整比值
        if not self.validate_ratio(target, steps, stage_info):
            target, steps = self.adjust_to_valid_ratio(target, steps, stage_info)
        
        # 转换为配置值
        config_target, config_steps = self.display_to_config(target, steps)
        
        # 验证转换结果
        verify_target, verify_steps = self.config_to_display(config_target, config_steps)
        ratio = verify_target / verify_steps
        
        return {
            'level': level,
            'stage': stage_name,
            'display_target': verify_target,
            'display_steps': verify_steps,
            'config_target': config_target,
            'config_steps': config_steps,
            'ratio': ratio,
            'moveCount': config_steps,
            'm_ct': [config_target]
        }
    
    def generate_all_levels(self) -> List[Dict]:
        """生成所有关卡参数"""
        all_levels = []
        
        print("开始生成关卡难度参数...")
        print("=" * 80)
        
        for level in range(1, 1701):
            params = self.generate_level_params(level)
            all_levels.append(params)
            
            # 打印关键关卡信息
            if level <= 10 or level % 100 == 0 or level in [200, 800, 1400, 1700]:
                print(f"关卡 {level:4d} ({params['stage']:8s}): "
                      f"显示 {params['display_target']:3d}/{params['display_steps']:2d} "
                      f"配置 {params['config_target']:3d}/{params['config_steps']:2d} "
                      f"比值 {params['ratio']:.2f}")
        
        print("=" * 80)
        print("关卡生成完成！")
        
        return all_levels
    
    def analyze_distribution(self, levels: List[Dict]):
        """分析难度分布"""
        print("\n难度分布分析:")
        print("-" * 60)
        
        stage_stats = {}
        for level_data in levels:
            stage = level_data['stage']
            if stage not in stage_stats:
                stage_stats[stage] = {
                    'count': 0,
                    'ratios': [],
                    'targets': [],
                    'steps': []
                }
            
            stage_stats[stage]['count'] += 1
            stage_stats[stage]['ratios'].append(level_data['ratio'])
            stage_stats[stage]['targets'].append(level_data['display_target'])
            stage_stats[stage]['steps'].append(level_data['display_steps'])
        
        for stage, stats in stage_stats.items():
            avg_ratio = sum(stats['ratios']) / len(stats['ratios'])
            min_ratio = min(stats['ratios'])
            max_ratio = max(stats['ratios'])
            
            print(f"{stage:8s}: {stats['count']:3d}关 "
                  f"比值 {min_ratio:.2f}-{max_ratio:.2f} (平均{avg_ratio:.2f}) "
                  f"目标 {min(stats['targets'])}-{max(stats['targets'])} "
                  f"步数 {min(stats['steps'])}-{max(stats['steps'])}")

def main():
    generator = LevelDifficultyGenerator()
    
    # 设置随机种子以便复现
    random.seed(42)
    
    # 生成所有关卡
    all_levels = generator.generate_all_levels()
    
    # 分析分布
    generator.analyze_distribution(all_levels)
    
    # 自动应用（避免交互式输入问题）
    print(f"\n准备将这些难度参数应用到 {len(all_levels)} 个关卡配置文件...")
    response = 'y'
    
    if response == 'y':
        # 应用到配置文件
        config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config/"
        success_count = 0
        
        print("\n开始应用关卡参数...")
        
        for level_data in all_levels:
            level = level_data['level']
            config_path = os.path.join(config_dir, f"{level}.json")
            
            if os.path.exists(config_path):
                try:
                    # 读取现有配置
                    with open(config_path, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                    
                    # 更新关卡参数
                    config['moveCount'] = level_data['moveCount']
                    if config.get('mapData') and len(config['mapData']) > 0:
                        config['mapData'][0]['m_ct'] = level_data['m_ct']
                    
                    # 写入更新后的配置
                    with open(config_path, 'w', encoding='utf-8') as f:
                        json.dump(config, f, separators=(',', ':'), ensure_ascii=False)
                    
                    success_count += 1
                    
                except Exception as e:
                    print(f"关卡 {level} 更新失败: {e}")
        
        print(f"\n应用完成: {success_count}/{len(all_levels)} 个关卡更新成功")
        
        # 保存生成报告
        report_path = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/level_difficulty_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(all_levels, f, indent=2, ensure_ascii=False)
        
        print(f"详细报告已保存到: {report_path}")
    else:
        print("操作已取消")

if __name__ == "__main__":
    main()