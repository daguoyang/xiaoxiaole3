#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
糖果消消乐项目代码相似性深度分析工具
分析两个项目之间的代码相似度，包括结构、算法、命名等方面
"""

import os
import hashlib
import difflib
import json
import re
from pathlib import Path
from collections import defaultdict

class CodeSimilarityAnalyzer:
    def __init__(self, project1_path, project2_path):
        self.project1_path = Path(project1_path)
        self.project2_path = Path(project2_path)
        self.results = {}
        
    def get_file_hash(self, file_path):
        """计算文件MD5哈希值"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except:
            return None
    
    def get_file_content(self, file_path):
        """读取文件内容"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except:
            return ""
    
    def normalize_code(self, content):
        """标准化代码内容，移除空白和注释便于比较"""
        # 移除单行注释
        content = re.sub(r'//.*', '', content)
        # 移除多行注释
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        # 移除多余空白
        content = re.sub(r'\s+', ' ', content)
        return content.strip()
    
    def extract_identifiers(self, content):
        """提取代码中的标识符（类名、函数名、变量名等）"""
        # 提取类名
        classes = re.findall(r'class\s+(\w+)', content)
        # 提取函数名
        functions = re.findall(r'(?:function\s+|^\s*)(\w+)\s*\(', content, re.MULTILINE)
        # 提取变量名
        variables = re.findall(r'(?:let|const|var)\s+(\w+)', content)
        return {
            'classes': classes,
            'functions': functions,
            'variables': variables
        }
    
    def calculate_similarity(self, content1, content2):
        """计算两个内容的相似度"""
        if not content1 or not content2:
            return 0.0
        
        # 基于序列比较的相似度
        seq_matcher = difflib.SequenceMatcher(None, content1, content2)
        sequence_similarity = seq_matcher.ratio()
        
        # 基于行比较的相似度
        lines1 = content1.split('\n')
        lines2 = content2.split('\n')
        line_matcher = difflib.SequenceMatcher(None, lines1, lines2)
        line_similarity = line_matcher.ratio()
        
        return (sequence_similarity + line_similarity) / 2
    
    def analyze_typescript_files(self):
        """分析TypeScript文件相似性"""
        print("开始分析TypeScript文件...")
        
        # 获取两个项目的TypeScript文件
        ts_files1 = list(self.project1_path.glob("**/*.ts"))
        ts_files2 = list(self.project2_path.glob("**/*.ts"))
        
        # 构建相对路径映射
        files1_map = {}
        files2_map = {}
        
        for file in ts_files1:
            rel_path = file.relative_to(self.project1_path)
            files1_map[str(rel_path)] = file
            
        for file in ts_files2:
            rel_path = file.relative_to(self.project2_path)
            files2_map[str(rel_path)] = file
        
        analysis_results = {
            'identical_files': [],
            'highly_similar': [],  # >90%
            'moderately_similar': [],  # 70-90%
            'low_similar': [],  # 50-70%
            'different_files': [],  # <50%
            'project1_only': [],
            'project2_only': []
        }
        
        total_files = 0
        identical_count = 0
        high_similar_count = 0
        
        # 比较相同路径的文件
        common_files = set(files1_map.keys()) & set(files2_map.keys())
        
        for rel_path in common_files:
            file1 = files1_map[rel_path]
            file2 = files2_map[rel_path]
            
            # 检查是否完全相同
            hash1 = self.get_file_hash(file1)
            hash2 = self.get_file_hash(file2)
            
            if hash1 == hash2:
                analysis_results['identical_files'].append({
                    'path': rel_path,
                    'similarity': 100.0
                })
                identical_count += 1
            else:
                # 计算内容相似度
                content1 = self.get_file_content(file1)
                content2 = self.get_file_content(file2)
                
                # 标准化代码
                normalized1 = self.normalize_code(content1)
                normalized2 = self.normalize_code(content2)
                
                similarity = self.calculate_similarity(normalized1, normalized2) * 100
                
                # 提取标识符进行比较
                identifiers1 = self.extract_identifiers(content1)
                identifiers2 = self.extract_identifiers(content2)
                
                file_analysis = {
                    'path': rel_path,
                    'similarity': similarity,
                    'size1': len(content1),
                    'size2': len(content2),
                    'identifiers1': identifiers1,
                    'identifiers2': identifiers2
                }
                
                if similarity >= 90:
                    analysis_results['highly_similar'].append(file_analysis)
                    high_similar_count += 1
                elif similarity >= 70:
                    analysis_results['moderately_similar'].append(file_analysis)
                elif similarity >= 50:
                    analysis_results['low_similar'].append(file_analysis)
                else:
                    analysis_results['different_files'].append(file_analysis)
            
            total_files += 1
        
        # 项目1独有文件
        project1_only = set(files1_map.keys()) - set(files2_map.keys())
        for rel_path in project1_only:
            analysis_results['project1_only'].append(rel_path)
        
        # 项目2独有文件
        project2_only = set(files2_map.keys()) - set(files1_map.keys())
        for rel_path in project2_only:
            analysis_results['project2_only'].append(rel_path)
        
        # 计算总体统计
        analysis_results['statistics'] = {
            'total_files': total_files,
            'identical_files': identical_count,
            'highly_similar_files': high_similar_count,
            'identical_percentage': (identical_count / total_files * 100) if total_files > 0 else 0,
            'high_similarity_percentage': (high_similar_count / total_files * 100) if total_files > 0 else 0,
            'project1_only_count': len(project1_only),
            'project2_only_count': len(project2_only)
        }
        
        return analysis_results
    
    def analyze_image_resources(self):
        """分析图片资源相似性"""
        print("开始分析图片资源...")
        
        image_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
        
        # 获取图片文件
        images1 = []
        images2 = []
        
        for ext in image_extensions:
            images1.extend(list(self.project1_path.glob(f"**/*{ext}")))
            images2.extend(list(self.project1_path.glob(f"**/*{ext.upper()}")))
            images2.extend(list(self.project2_path.glob(f"**/*{ext}")))
            images2.extend(list(self.project2_path.glob(f"**/*{ext.upper()}")))
        
        # 构建哈希映射
        hash_to_files1 = defaultdict(list)
        hash_to_files2 = defaultdict(list)
        
        for img in images1:
            hash_val = self.get_file_hash(img)
            if hash_val:
                hash_to_files1[hash_val].append(img.relative_to(self.project1_path))
        
        for img in images2:
            hash_val = self.get_file_hash(img)
            if hash_val:
                hash_to_files2[hash_val].append(img.relative_to(self.project2_path))
        
        # 找出相同的图片
        identical_images = []
        common_hashes = set(hash_to_files1.keys()) & set(hash_to_files2.keys())
        
        for hash_val in common_hashes:
            identical_images.append({
                'hash': hash_val,
                'project1_files': [str(f) for f in hash_to_files1[hash_val]],
                'project2_files': [str(f) for f in hash_to_files2[hash_val]]
            })
        
        return {
            'total_images_project1': len(images1),
            'total_images_project2': len(images2),
            'identical_images': identical_images,
            'identical_count': len(identical_images),
            'unique_hashes_project1': len(hash_to_files1),
            'unique_hashes_project2': len(hash_to_files2)
        }
    
    def generate_report(self):
        """生成完整的分析报告"""
        print("生成分析报告...")
        
        # 分析TypeScript代码
        code_analysis = self.analyze_typescript_files()
        
        # 分析图片资源
        image_analysis = self.analyze_image_resources()
        
        # 计算整体风险评估
        total_files = code_analysis['statistics']['total_files']
        identical_files = code_analysis['statistics']['identical_files']
        highly_similar_files = code_analysis['statistics']['highly_similar_files']
        
        # 代码原创性计算
        if total_files > 0:
            non_original_files = identical_files + highly_similar_files
            originality_percentage = ((total_files - non_original_files) / total_files) * 100
        else:
            originality_percentage = 100
        
        # 风险等级评估
        if identical_files / total_files > 0.5:
            risk_level = "极高"
        elif (identical_files + highly_similar_files) / total_files > 0.3:
            risk_level = "高"
        elif (identical_files + highly_similar_files) / total_files > 0.1:
            risk_level = "中等"
        else:
            risk_level = "低"
        
        report = {
            'timestamp': '2025-09-09',
            'project1_path': str(self.project1_path),
            'project2_path': str(self.project2_path),
            'code_analysis': code_analysis,
            'image_analysis': image_analysis,
            'risk_assessment': {
                'originality_percentage': originality_percentage,
                'risk_level': risk_level,
                'legal_risk_score': max(0, 100 - originality_percentage),
                'pass_probability': max(0, min(100, originality_percentage - 10))
            }
        }
        
        return report
    
    def save_report(self, report, output_path):
        """保存报告到JSON文件"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"报告已保存到: {output_path}")

def main():
    project1 = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8"
    project2 = "/Users/jiawanzi/Downloads/糖果消消乐-经典三消3.8 5"
    
    analyzer = CodeSimilarityAnalyzer(project1, project2)
    report = analyzer.generate_report()
    
    # 保存详细报告
    report_path = os.path.join(project1, "侵权风险分析报告.json")
    analyzer.save_report(report, report_path)
    
    # 打印摘要
    print("\n" + "="*80)
    print("糖果消消乐项目侵权风险分析报告摘要")
    print("="*80)
    
    stats = report['code_analysis']['statistics']
    print(f"代码文件总数: {stats['total_files']}")
    print(f"完全相同文件: {stats['identical_files']} ({stats['identical_percentage']:.1f}%)")
    print(f"高相似度文件: {stats['highly_similar_files']} ({stats['high_similarity_percentage']:.1f}%)")
    
    img_stats = report['image_analysis']
    print(f"\n图片资源总数 (项目1): {img_stats['total_images_project1']}")
    print(f"图片资源总数 (项目2): {img_stats['total_images_project2']}")
    print(f"相同图片数量: {img_stats['identical_count']}")
    
    risk = report['risk_assessment']
    print(f"\n代码原创性: {risk['originality_percentage']:.1f}%")
    print(f"法律风险等级: {risk['risk_level']}")
    print(f"预计通过概率: {risk['pass_probability']:.1f}%")

if __name__ == "__main__":
    main()