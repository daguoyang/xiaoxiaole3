#!/usr/bin/env python3
"""
关卡配置修改脚本 V2 - 改进版
目标：部分关卡增加难度(+)，部分关卡降低难度(-)，更好地控制难度平衡
"""

import json
import os
import random
import math
from typing import Dict, List, Any

class LevelConfigModifierV2:
    def __init__(self, config_dir: str):
        self.config_dir = config_dir
        self.backup_dir = os.path.join(config_dir, "../config_backup_v2")
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
    
    def determine_difficulty_direction(self, level: int) -> str:
        """确定关卡难度调整方向"""
        # 设置随机种子确保可重现性
        random.seed(level * 37 + 54321)
        
        # 根据关卡分布确定难度方向
        if level <= 50:
            # 前50关：60% 变容易，40% 变难（新手友好）
            return "easier" if random.random() < 0.6 else "harder"
        elif level <= 200:
            # 中级关卡：50% 变容易，50% 变难（平衡）
            return "easier" if random.random() < 0.5 else "harder"
        else:
            # 高级关卡：40% 变容易，60% 变难（挑战性）
            return "easier" if random.random() < 0.4 else "harder"
    
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
            modified_config = self.apply_modification_strategy(config, level)
            
            # 写回修改后的配置
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(modified_config, f, ensure_ascii=False, separators=(',', ':'))
            
            self.modified_count += 1
            return True
            
        except Exception as e:
            print(f"❌ 修改关卡{level}失败: {e}")
            return False
    
    def apply_modification_strategy(self, config: Dict[str, Any], level: int) -> Dict[str, Any]:
        """应用修改策略"""
        # 设置随机种子确保可重现性
        random.seed(level * 42 + 12345)
        
        modified_config = config.copy()
        difficulty_direction = self.determine_difficulty_direction(level)
        
        # 根据关卡级别确定变化幅度
        if level <= 50:
            move_variation = 0.15    # ±15%
            score_variation = 0.20   # ±20%
            target_variation = 0.25  # ±25%
        elif level <= 200:
            move_variation = 0.20    # ±20%
            score_variation = 0.30   # ±30%
            target_variation = 0.35  # ±35%
        else:
            move_variation = 0.25    # ±25%
            score_variation = 0.40   # ±40%
            target_variation = 0.45  # ±45%
        
        # 确定变化方向的符号
        if difficulty_direction == "easier":
            move_sign = 1      # 增加步数 = 变容易
            score_sign = -1    # 降低分数要求 = 变容易
            target_sign = -1   # 减少目标数量 = 变容易
            direction_text = "🟢 变容易"
        else:
            move_sign = -1     # 减少步数 = 变难
            score_sign = 1     # 提高分数要求 = 变难
            target_sign = 1    # 增加目标数量 = 变难
            direction_text = "🔴 变难"
        
        print(f"📋 关卡{level}: {direction_text}")
        
        # 1. 修改移动步数 (moveCount)
        if 'moveCount' in config:
            original_moves = config['moveCount']
            # 应用定向变化
            multiplier = 1 + (move_sign * random.uniform(0.1, move_variation))
            new_moves = max(10, int(original_moves * multiplier))
            modified_config['moveCount'] = new_moves
            
            if new_moves != original_moves:
                print(f"🎮 关卡{level}: 步数 {original_moves} → {new_moves}")
        
        # 2. 修改分数阈值 (scores)
        if 'scores' in config and isinstance(config['scores'], list):
            original_scores = config['scores'].copy()
            new_scores = []
            
            for i, score in enumerate(original_scores):
                # 应用定向变化
                multiplier = 1 + (score_sign * random.uniform(0.1, score_variation))
                new_score = max(100, int(score * multiplier))
                # 确保分数递增
                if i > 0 and new_score <= new_scores[i-1]:
                    new_score = new_scores[i-1] + random.randint(100, 500)
                new_scores.append(new_score)
            
            modified_config['scores'] = new_scores
            
            if new_scores != original_scores:
                print(f"⭐ 关卡{level}: 分数 {original_scores} → {new_scores}")
        
        # 3. 修改目标数量 (mapData中的m_ct)
        if 'mapData' in config and isinstance(config['mapData'], list):
            for map_idx, map_data in enumerate(config['mapData']):
                if 'm_ct' in map_data and isinstance(map_data['m_ct'], list):
                    original_targets = map_data['m_ct'].copy()
                    new_targets = []
                    
                    for target in original_targets:
                        # 应用定向变化
                        multiplier = 1 + (target_sign * random.uniform(0.1, target_variation))
                        new_target = max(5, int(target * multiplier))
                        new_targets.append(new_target)
                    
                    modified_config['mapData'][map_idx]['m_ct'] = new_targets
                    
                    if new_targets != original_targets:
                        print(f"🎯 关卡{level}: 目标 {original_targets} → {new_targets}")
        
        # 4. 保持方块比例微调 (blockRatio) - 小幅随机调整
        if 'blockRatio' in config and isinstance(config['blockRatio'], list):
            original_ratios = config['blockRatio'].copy()
            new_ratios = []
            
            for ratio in original_ratios:
                # 小幅度随机调整比例 (±8%)
                multiplier = 1 + random.uniform(-0.08, 0.08)
                new_ratio = max(30, min(100, int(ratio * multiplier)))
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
        easier_count = 0
        harder_count = 0
        
        for level in range(start_level, end_level + 1):
            direction = self.determine_difficulty_direction(level)
            if direction == "easier":
                easier_count += 1
            else:
                harder_count += 1
                
            if self.modify_level_config(level):
                success_count += 1
                
            # 每处理100个关卡显示进度
            if level % 100 == 0:
                print(f"📊 进度: {level}/{end_level} 关卡已处理")
        
        print(f"✅ 完成！成功修改 {success_count}/{end_level - start_level + 1} 个关卡")
        print(f"📊 难度分布: 🟢变容易 {easier_count}个, 🔴变难 {harder_count}个")
        return success_count
    
    def analyze_difficulty_distribution(self, total_levels: int = 1700):
        """分析难度分布"""
        print("\n📊 分析难度分布:")
        
        stage_stats = {
            "新手关卡(1-50)": {"easier": 0, "harder": 0},
            "中级关卡(51-200)": {"easier": 0, "harder": 0}, 
            "高级关卡(201-1700)": {"easier": 0, "harder": 0}
        }
        
        for level in range(1, total_levels + 1):
            direction = self.determine_difficulty_direction(level)
            
            if level <= 50:
                stage_stats["新手关卡(1-50)"][direction] += 1
            elif level <= 200:
                stage_stats["中级关卡(51-200)"][direction] += 1
            else:
                stage_stats["高级关卡(201-1700)"][direction] += 1
        
        for stage, stats in stage_stats.items():
            total = stats["easier"] + stats["harder"]
            easier_pct = stats["easier"] / total * 100
            harder_pct = stats["harder"] / total * 100
            print(f"{stage}: 🟢{stats['easier']}个({easier_pct:.1f}%) 🔴{stats['harder']}个({harder_pct:.1f}%)")

def main():
    """主函数"""
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config"
    
    if not os.path.exists(config_dir):
        print(f"❌ 配置目录不存在: {config_dir}")
        return
    
    modifier = LevelConfigModifierV2(config_dir)
    
    print("🎯 关卡配置平衡化修改工具 V2")
    print("=" * 60)
    
    # 先分析理论分布
    modifier.analyze_difficulty_distribution()
    
    print("\n📋 修改策略:")
    print("• 新手关卡(1-50): 60%变容易, 40%变难")
    print("• 中级关卡(51-200): 50%变容易, 50%变难")  
    print("• 高级关卡(201+): 40%变容易, 60%变难")
    print("• 变容易: +步数, -分数要求, -目标数量")
    print("• 变难: -步数, +分数要求, +目标数量")
    
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
    print("🎮 新的难度曲线更加平衡，既有挑战也有放松！")

if __name__ == "__main__":
    main()