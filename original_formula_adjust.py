#!/usr/bin/env python3
"""
基于原始公式的批量调整脚本

原始显示公式：
- 步数显示 = moveCount - 10 (如果 > 0) 否则 moveCount  
- 目标显示 = m_ct + 10 (如果 m_ct >= 10) 或 m_ct + 30 (如果 m_ct < 10)

调整目标：
- 显示步数 = 源码显示 + 1
- 显示目标 = 源码显示 + 1-3 (随机)
"""

import json
import os
import random

def calculate_display_values(config_steps, config_targets):
    """根据原始公式计算显示值"""
    # 步数显示逻辑：moveCount - 10 > 0 ? moveCount - 10 : moveCount
    display_steps = config_steps - 10 if config_steps - 10 > 0 else config_steps
    
    # 目标显示逻辑
    display_targets = []
    for target in config_targets:
        if target >= 10:
            display_targets.append(target + 10)
        else:
            display_targets.append(target + 30)
    
    return display_steps, display_targets

def reverse_calculate_config(target_display_steps, target_display_targets):
    """根据目标显示值反推配置值"""
    # 步数配置：显示值 + 10
    config_steps = target_display_steps + 10
    
    # 目标配置：根据显示值反推
    config_targets = []
    for display_target in target_display_targets:
        # 尝试两种情况
        # 情况1: 配置目标 >= 10, 显示 = 配置 + 10
        config1 = display_target - 10
        # 情况2: 配置目标 < 10, 显示 = 配置 + 30  
        config2 = display_target - 30
        
        # 优先选择合理的配置值
        if config1 >= 10:
            config_targets.append(config1)
        elif config2 >= 0 and config2 < 10:
            config_targets.append(config2)
        else:
            # 如果都不合理，选择非负数的较小值
            if config2 >= 0:
                config_targets.append(config2)
            else:
                config_targets.append(config1)
    
    return config_steps, config_targets

def adjust_level_config(level_num):
    """调整单个关卡配置"""
    source_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8 5/assets/resources/config"
    target_dir = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8/assets/resources/config"
    
    source_file = f"{source_dir}/{level_num}.json"
    target_file = f"{target_dir}/{level_num}.json"
    
    # 检查源文件是否存在
    if not os.path.exists(source_file):
        return False, f"源文件不存在: {source_file}"
        
    # 读取源码配置
    try:
        with open(source_file, 'r', encoding='utf-8') as f:
            source_config = json.load(f)
    except Exception as e:
        return False, f"读取源码配置失败: {e}"
    
    # 读取当前配置
    try:
        with open(target_file, 'r', encoding='utf-8') as f:
            target_config = json.load(f)
    except Exception as e:
        return False, f"读取当前配置失败: {e}"
    
    # 获取源码配置值
    source_config_steps = source_config['moveCount']
    source_config_targets = source_config['mapData'][0]['m_ct']
    
    # 计算源码显示值
    source_display_steps, source_display_targets = calculate_display_values(
        source_config_steps, source_config_targets
    )
    
    # 调整目标：显示值比源码多1-3
    target_display_steps = source_display_steps + 1
    
    target_display_targets = []
    for target in source_display_targets:
        # 每个目标随机增加1-3个，权重分布：1(20%), 2(60%), 3(20%)
        random_add = random.choice([1, 1, 2, 2, 2, 3])
        target_display_targets.append(target + random_add)
    
    # 反推新的配置值
    new_config_steps, new_config_targets = reverse_calculate_config(
        target_display_steps, target_display_targets
    )
    
    # 更新配置
    target_config['moveCount'] = new_config_steps
    target_config['mapData'][0]['m_ct'] = new_config_targets
    
    # 保存调整后的配置
    try:
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(target_config, f, separators=(',', ':'), ensure_ascii=False)
        
        # 验证调整结果
        verify_display_steps, verify_display_targets = calculate_display_values(
            new_config_steps, new_config_targets
        )
        
        # 返回调整信息
        info = {
            'level': level_num,
            'source_config': (source_config_steps, source_config_targets),
            'source_display': (source_display_steps, source_display_targets),
            'target_display': (target_display_steps, target_display_targets),
            'new_config': (new_config_steps, new_config_targets),
            'verify_display': (verify_display_steps, verify_display_targets)
        }
        
        return True, info
    except Exception as e:
        return False, f"保存配置失败: {e}"

def main():
    """批量处理所有关卡"""
    print("=== 基于原始公式的批量调整 ===")
    print("原始显示公式：")
    print("  步数显示 = moveCount - 10 (if > 0) else moveCount")
    print("  目标显示 = m_ct + 10 (if ≥ 10) else m_ct + 30")
    print()
    
    # 设置随机种子确保可重现性
    random.seed(12345)
    
    success_count = 0
    fail_count = 0
    
    print("开始批量调整1700个关卡配置...")
    
    for level in range(1, 1701):  # 1到1700
        success, result = adjust_level_config(level)
        
        if success:
            success_count += 1
            
            # 打印前5关的详细信息
            if level <= 5:
                info = result
                print(f"关卡 {level}:")
                print(f"  源码配置: 步数{info['source_config'][0]}, 目标{info['source_config'][1]}")
                print(f"  源码显示: 步数{info['source_display'][0]}, 目标{info['source_display'][1]}")
                print(f"  目标显示: 步数{info['target_display'][0]}, 目标{info['target_display'][1]}")
                print(f"  新配置: 步数{info['new_config'][0]}, 目标{info['new_config'][1]}")
                print(f"  验证显示: 步数{info['verify_display'][0]}, 目标{info['verify_display'][1]}")
                
                # 验证差异
                step_diff = info['verify_display'][0] - info['source_display'][0]
                target_diffs = [info['verify_display'][1][j] - info['source_display'][1][j] for j in range(len(info['source_display'][1]))]
                print(f"  差异验证: 步数+{step_diff}, 目标+{target_diffs}")
                print()
        else:
            fail_count += 1
            print(f"关卡 {level} 失败: {result}")
            
        # 每100个关卡显示一次进度
        if level % 100 == 0:
            print(f"已处理 {level} 个关卡，成功: {success_count}, 失败: {fail_count}")
    
    print(f"\n批量调整完成！")
    print(f"总计: 1700 个关卡")
    print(f"成功: {success_count} 个")
    print(f"失败: {fail_count} 个")
    print(f"成功率: {success_count/1700*100:.1f}%")

if __name__ == "__main__":
    main()