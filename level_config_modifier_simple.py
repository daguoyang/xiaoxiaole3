#!/usr/bin/env python3
"""
关卡配置修改脚本 - 简化版
目标：所有关卡保持相同难度，只修改步数和目标数：减步数=减目标数，加步数=加目标数
"""

import json
import os
import random
import math
from typing import Dict, List, Any

class LevelConfigModifierSimple:
    def __init__(self, config_dir: str):
        self.config_dir = config_dir
        self.backup_dir = os.path.join(config_dir, "../config_backup_simple")
        self.modified_count = 0
        
    def ensure_backup_dir(self):
        """确保备份目录存在"""
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)
            print(f"📁 创建备份目录: {self.backup_dir}")
    
    def backup_original_config(self, level: int):
        """备份原始配置文件"""
        source_file = os.path.join(self.config_dir, f"{level}.json")
        backup_file = os.path.join(self.backup_dir, f"{level}.json")
        
        if os.path.exists(source_file) and not os.path.exists(backup_file):
            with open(source_file, 'r', encoding='utf-8') as f:
                original_data = json.load(f)
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(original_data, f, ensure_ascii=False, indent=2)
    
    def get_change_multiplier(self, level: int) -> float:
        """获取变化倍数，基于关卡级别和随机种子"""
        # 设置随机种子确保可重现性
        random.seed(level * 42 + 12345)
        
        # 根据关卡级别确定变化范围
        if level <= 50:
            # 前50关：变化幅度较小 (85%-115%)
            min_mult, max_mult = 0.85, 1.15
        elif level <= 200:
            # 中级关卡：变化幅度中等 (80%-120%)
            min_mult, max_mult = 0.80, 1.20
        else:
            # 高级关卡：变化幅度较大 (75%-125%)
            min_mult, max_mult = 0.75, 1.25
        
        # 生成随机倍数
        multiplier = random.uniform(min_mult, max_mult)
        return multiplier
    
    def modify_level_config(self, level: int) -> bool:
        """修改单个关卡配置"""
        try:
            config_file = os.path.join(self.config_dir, f"{level}.json")
            
            if not os.path.exists(config_file):
                print(f"⚠️ 关卡{level}配置文件不存在")
                return False
            
            # 备份原始文件
            self.backup_original_config(level)
            
            # 读取原始配置
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # 应用修改策略
            modified_config = self.apply_simple_modification(config, level)
            
            # 写回修改后的配置
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(modified_config, f, ensure_ascii=False, separators=(',', ':'))
            
            self.modified_count += 1
            return True
            
        except Exception as e:
            print(f"❌ 修改关卡{level}失败: {e}")
            return False
    
    def apply_simple_modification(self, config: Dict[str, Any], level: int) -> Dict[str, Any]:
        """应用简化修改策略：步数和目标数同方向变化"""
        modified_config = config.copy()
        
        # 获取变化倍数
        multiplier = self.get_change_multiplier(level)
        
        # 判断是增加还是减少
        if multiplier > 1.0:
            direction_text = f"🔵 增加 ({multiplier:.2f}x)"
        else:
            direction_text = f"🟡 减少 ({multiplier:.2f}x)"
        
        print(f"📋 关卡{level}: {direction_text}")
        
        # 1. 修改移动步数 (moveCount)
        if 'moveCount' in config:
            original_moves = config['moveCount']
            new_moves = max(10, int(original_moves * multiplier))
            modified_config['moveCount'] = new_moves
            
            if new_moves != original_moves:
                print(f"🎮 关卡{level}: 步数 {original_moves} → {new_moves}")
        
        # 2. 修改目标数量 (mapData中的m_ct) - 与步数同方向变化
        if 'mapData' in config and isinstance(config['mapData'], list):
            for map_idx, map_data in enumerate(config['mapData']):
                if 'm_ct' in map_data and isinstance(map_data['m_ct'], list):
                    original_targets = map_data['m_ct'].copy()
                    new_targets = []
                    
                    for target in original_targets:
                        # 使用相同的倍数变化
                        new_target = max(3, int(target * multiplier))
                        new_targets.append(new_target)
                    
                    modified_config['mapData'][map_idx]['m_ct'] = new_targets
                    
                    if new_targets != original_targets:
                        print(f"🎯 关卡{level}: 目标 {original_targets} → {new_targets}")
        
        # 3. 保持分数阈值不变 (scores) - 维持原有难度平衡
        # 不修改分数，因为步数和目标的同方向变化已经保持了难度平衡
        
        # 4. 保持方块比例微调 (blockRatio) - 小幅随机调整
        if 'blockRatio' in config and isinstance(config['blockRatio'], list):
            # 设置独立随机种子用于比例调整
            random.seed(level * 37 + 54321)
            original_ratios = config['blockRatio'].copy()
            new_ratios = []
            
            for ratio in original_ratios:
                # 小幅度随机调整比例 (±5%)
                ratio_multiplier = 1 + random.uniform(-0.05, 0.05)
                new_ratio = max(30, min(100, int(ratio * ratio_multiplier)))
                new_ratios.append(new_ratio)
            
            modified_config['blockRatio'] = new_ratios
            
            if new_ratios != original_ratios:
                print(f"🎲 关卡{level}: 比例 {original_ratios} → {new_ratios}")
        
        return modified_config
    
    def modify_level_range(self, start_level: int, end_level: int):
        """修改指定范围的关卡"""
        print(f"\n🚀 开始修改关卡 {start_level}-{end_level}")
        self.ensure_backup_dir()
        
        success_count = 0
        increase_count = 0
        decrease_count = 0
        
        for level in range(start_level, end_level + 1):
            multiplier = self.get_change_multiplier(level)
            if multiplier > 1.0:
                increase_count += 1
            else:
                decrease_count += 1
                
            if self.modify_level_config(level):
                success_count += 1
                
            # 每处理100个关卡显示进度
            if level % 100 == 0:
                print(f"📊 进度: {level}/{end_level} 关卡已处理")
        
        print(f"✅ 完成！成功修改 {success_count}/{end_level - start_level + 1} 个关卡")
        print(f"📊 变化分布: 🔵增加 {increase_count}个, 🟡减少 {decrease_count}个")
        return success_count
    
    def analyze_change_distribution(self, total_levels: int = 1700):
        """分析变化分布"""
        print("\n📊 分析变化分布:")
        
        stage_stats = {
            "新手关卡(1-50)": {"increase": 0, "decrease": 0},
            "中级关卡(51-200)": {"increase": 0, "decrease": 0}, 
            "高级关卡(201-1700)": {"increase": 0, "decrease": 0}
        }
        
        for level in range(1, total_levels + 1):
            multiplier = self.get_change_multiplier(level)
            change_type = "increase" if multiplier > 1.0 else "decrease"
            
            if level <= 50:
                stage_stats["新手关卡(1-50)"][change_type] += 1
            elif level <= 200:
                stage_stats["中级关卡(51-200)"][change_type] += 1
            else:
                stage_stats["高级关卡(201-1700)"][change_type] += 1
        
        for stage, stats in stage_stats.items():
            total = stats["increase"] + stats["decrease"]
            increase_pct = stats["increase"] / total * 100
            decrease_pct = stats["decrease"] / total * 100
            print(f"{stage}: 🔵{stats['increase']}个({increase_pct:.1f}%) 🟡{stats['decrease']}个({decrease_pct:.1f}%)")

def main():
    """主函数"""
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config"
    
    if not os.path.exists(config_dir):
        print(f"❌ 配置目录不存在: {config_dir}")
        return
    
    modifier = LevelConfigModifierSimple(config_dir)
    
    print("🎯 关卡配置简化修改工具")
    print("=" * 60)
    
    # 先分析理论分布
    modifier.analyze_change_distribution()
    
    print("\n📋 修改策略:")
    print("• 所有关卡保持相同难度平衡")
    print("• 步数和目标数同方向变化：减步数=减目标数，加步数=加目标数") 
    print("• 分数阈值保持不变")
    print("• 方块比例微调(±5%)")
    
    # 执行修改
    total_modified = 0
    
    # 阶段1: 前50关
    total_modified += modifier.modify_level_range(1, 50)
    
    # 阶段2: 51-200关
    total_modified += modifier.modify_level_range(51, 200)
    
    # 阶段3: 201-1700关 (分批处理)
    for batch_start in range(201, 1701, 300):
        batch_end = min(batch_start + 299, 1700)
        total_modified += modifier.modify_level_range(batch_start, batch_end)
    
    print(f"\n🎉 所有修改完成！")
    print(f"📊 总计修改: {total_modified} 个关卡配置")
    
    print(f"\n💾 原始配置已备份到: {modifier.backup_dir}")
    print("🔒 如需回滚，可从备份目录还原")
    print("🎮 新配置保持难度平衡，步数和目标数协调变化！")

if __name__ == "__main__":
    main()