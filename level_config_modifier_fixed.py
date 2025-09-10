#!/usr/bin/env python3
"""
关卡配置修改脚本 - 修正版
重要：考虑到游戏中有 moveCount - 10 的逻辑，所以所有步数都要确保 >= 20
"""

import json
import os
import random
import math
from typing import Dict, List, Any

class LevelConfigModifierFixed:
    def __init__(self, config_dir: str):
        self.config_dir = config_dir
        self.backup_dir = os.path.join(config_dir, "../config_backup_fixed")
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
            modified_config = self.apply_fixed_modification(config, level)
            
            # 写回修改后的配置
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(modified_config, f, ensure_ascii=False, separators=(',', ':'))
            
            self.modified_count += 1
            return True
            
        except Exception as e:
            print(f"❌ 修改关卡{level}失败: {e}")
            return False
    
    def apply_fixed_modification(self, config: Dict[str, Any], level: int) -> Dict[str, Any]:
        """应用修正的修改策略：确保步数始终>=20"""
        modified_config = config.copy()
        
        # 获取变化倍数
        multiplier = self.get_change_multiplier(level)
        
        # 判断是增加还是减少
        if multiplier > 1.0:
            direction_text = f"🔵 增加 ({multiplier:.2f}x)"
        else:
            direction_text = f"🟡 减少 ({multiplier:.2f}x)"
        
        print(f"📋 关卡{level}: {direction_text}")
        
        # 1. 修改移动步数 (moveCount) - 关键修复：确保最小值为20
        if 'moveCount' in config:
            original_moves = config['moveCount']
            new_moves = int(original_moves * multiplier)
            # 关键修复：确保步数至少为20，这样游戏中显示至少10步
            new_moves = max(20, new_moves)
            modified_config['moveCount'] = new_moves
            
            if new_moves != original_moves:
                game_display = new_moves - 10 if new_moves > 10 else new_moves
                print(f"🎮 关卡{level}: 配置{original_moves}→{new_moves}步 (游戏显示{game_display}步)")
        
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
    
    def validate_all_configs(self, total_levels: int = 1700):
        """验证所有配置文件的步数是否合理"""
        print("\n🔍 验证关卡配置...")
        problem_levels = []
        
        for level in range(1, total_levels + 1):
            config_file = os.path.join(self.config_dir, f"{level}.json")
            if os.path.exists(config_file):
                try:
                    with open(config_file, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                    
                    move_count = config.get('moveCount', 0)
                    game_display = move_count - 10 if move_count > 10 else move_count
                    
                    if game_display < 5:  # 游戏中显示步数过少
                        problem_levels.append((level, move_count, game_display))
                        
                except Exception as e:
                    print(f"❌ 读取关卡{level}配置失败: {e}")
        
        if problem_levels:
            print(f"⚠️ 发现{len(problem_levels)}个问题关卡:")
            for level, config_steps, game_steps in problem_levels[:10]:  # 只显示前10个
                print(f"  关卡{level}: 配置{config_steps}步 → 游戏显示{game_steps}步")
            if len(problem_levels) > 10:
                print(f"  ... 还有{len(problem_levels) - 10}个问题关卡")
        else:
            print("✅ 所有关卡配置验证通过！")
        
        return problem_levels
    
    def modify_level_range(self, start_level: int, end_level: int):
        """修改指定范围的关卡"""
        print(f"\n🚀 开始修改关卡 {start_level}-{end_level}")
        self.ensure_backup_dir()
        
        success_count = 0
        
        for level in range(start_level, end_level + 1):
            if self.modify_level_config(level):
                success_count += 1
                
            # 每处理100个关卡显示进度
            if level % 100 == 0:
                print(f"📊 进度: {level}/{end_level} 关卡已处理")
        
        print(f"✅ 完成！成功修改 {success_count}/{end_level - start_level + 1} 个关卡")
        return success_count

def main():
    """主函数"""
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config"
    
    if not os.path.exists(config_dir):
        print(f"❌ 配置目录不存在: {config_dir}")
        return
    
    modifier = LevelConfigModifierFixed(config_dir)
    
    print("🎯 关卡配置修正版修改工具")
    print("=" * 60)
    print("🔧 重要修复: 确保所有关卡步数 >= 20 (游戏显示 >= 10步)")
    
    # 先验证当前配置
    problem_levels = modifier.validate_all_configs()
    
    if problem_levels:
        print(f"\n⚠️ 发现{len(problem_levels)}个问题关卡，需要修复")
        
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
        
        # 再次验证
        print("\n🔍 最终验证...")
        final_problems = modifier.validate_all_configs()
        
        if not final_problems:
            print("✅ 所有问题已修复！")
        else:
            print(f"⚠️ 仍有{len(final_problems)}个问题关卡需要手动检查")
    else:
        print("✅ 当前配置无问题，跳过修改")
    
    print(f"\n💾 原始配置已备份到: {modifier.backup_dir}")
    print("🎮 新配置确保游戏中所有关卡至少10步！")

if __name__ == "__main__":
    main()