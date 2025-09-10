#!/usr/bin/env python3
"""
关卡配置修改脚本
目标：对1700个关卡配置进行差异化修改，降低与源码的相似度
"""

import json
import os
import random
import math
from typing import Dict, List, Any

class LevelConfigModifier:
    def __init__(self, config_dir: str):
        self.config_dir = config_dir
        self.backup_dir = os.path.join(config_dir, "../config_backup")
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
        
        # 1. 修改移动步数 (moveCount)
        if 'moveCount' in config:
            original_moves = config['moveCount']
            # 根据关卡级别调整变化幅度
            if level <= 50:
                # 前50关：±15%变化
                variation = 0.15
            elif level <= 200:
                # 中级关卡：±20%变化
                variation = 0.20
            else:
                # 高级关卡：±25%变化
                variation = 0.25
            
            multiplier = 1 + random.uniform(-variation, variation)
            new_moves = max(10, int(original_moves * multiplier))
            modified_config['moveCount'] = new_moves
            
            if new_moves != original_moves:
                print(f"🎮 关卡{level}: 步数 {original_moves} → {new_moves}")
        
        # 2. 修改分数阈值 (scores)
        if 'scores' in config and isinstance(config['scores'], list):
            original_scores = config['scores'].copy()
            new_scores = []
            
            for i, score in enumerate(original_scores):
                # 每个星级分数独立调整
                if level <= 50:
                    variation = 0.2  # ±20%
                elif level <= 200:
                    variation = 0.3  # ±30%
                else:
                    variation = 0.4  # ±40%
                
                multiplier = 1 + random.uniform(-variation, variation)
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
                        if level <= 50:
                            variation = 0.25  # ±25%
                        elif level <= 200:
                            variation = 0.35  # ±35%
                        else:
                            variation = 0.45  # ±45%
                        
                        multiplier = 1 + random.uniform(-variation, variation)
                        new_target = max(5, int(target * multiplier))
                        new_targets.append(new_target)
                    
                    modified_config['mapData'][map_idx]['m_ct'] = new_targets
                    
                    if new_targets != original_targets:
                        print(f"🎯 关卡{level}: 目标 {original_targets} → {new_targets}")
        
        # 4. 微调方块比例 (blockRatio)
        if 'blockRatio' in config and isinstance(config['blockRatio'], list):
            original_ratios = config['blockRatio'].copy()
            new_ratios = []
            
            for ratio in original_ratios:
                # 小幅度调整比例 (±10%)
                multiplier = 1 + random.uniform(-0.1, 0.1)
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
        for level in range(start_level, end_level + 1):
            if self.modify_level_config(level):
                success_count += 1
                
            # 每处理100个关卡显示进度
            if level % 100 == 0:
                print(f"📊 进度: {level}/{end_level} 关卡已处理")
        
        print(f"✅ 完成！成功修改 {success_count}/{end_level - start_level + 1} 个关卡")
        return success_count
    
    def verify_modifications(self, levels_to_check: List[int] = None):
        """验证修改结果"""
        if levels_to_check is None:
            levels_to_check = [1, 10, 50, 100, 200, 500, 1000, 1700]
        
        print("\n🔍 验证修改结果:")
        
        for level in levels_to_check:
            original_file = os.path.join(self.backup_dir, f"{level}.json")
            modified_file = os.path.join(self.config_dir, f"{level}.json")
            
            if not os.path.exists(original_file) or not os.path.exists(modified_file):
                continue
            
            try:
                with open(original_file, 'r') as f:
                    original = json.load(f)
                with open(modified_file, 'r') as f:
                    modified = json.load(f)
                
                differences = []
                if original.get('moveCount') != modified.get('moveCount'):
                    differences.append(f"步数: {original.get('moveCount')} → {modified.get('moveCount')}")
                
                if original.get('scores') != modified.get('scores'):
                    differences.append(f"分数变化")
                
                if len(differences) > 0:
                    print(f"✅ 关卡{level}: {', '.join(differences)}")
                else:
                    print(f"⚠️ 关卡{level}: 未检测到变化")
                    
            except Exception as e:
                print(f"❌ 验证关卡{level}失败: {e}")

def main():
    """主函数"""
    config_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config"
    
    if not os.path.exists(config_dir):
        print(f"❌ 配置目录不存在: {config_dir}")
        return
    
    modifier = LevelConfigModifier(config_dir)
    
    print("🎯 关卡配置差异化修改工具")
    print("=" * 50)
    
    # 分阶段修改
    print("\n📋 修改计划:")
    print("• 阶段1: 前50关 (新手关卡)")
    print("• 阶段2: 51-200关 (中级关卡)")  
    print("• 阶段3: 201-1700关 (高级关卡)")
    
    # 执行修改
    total_modified = 0
    
    # 阶段1: 前50关
    total_modified += modifier.modify_level_range(1, 50)
    
    # 阶段2: 51-200关
    total_modified += modifier.modify_level_range(51, 200)
    
    # 阶段3: 201-1700关 (分批处理避免内存问题)
    for batch_start in range(201, 1701, 300):
        batch_end = min(batch_start + 299, 1700)
        total_modified += modifier.modify_level_range(batch_start, batch_end)
    
    print(f"\n🎉 所有修改完成！")
    print(f"📊 总计修改: {total_modified} 个关卡配置")
    
    # 验证结果
    modifier.verify_modifications()
    
    print(f"\n💾 原始配置已备份到: {modifier.backup_dir}")
    print("🔒 如需回滚，可从备份目录还原")

if __name__ == "__main__":
    main()