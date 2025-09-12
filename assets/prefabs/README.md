# Prefabs Directory

这个目录包含游戏中的所有预制体文件。

## 预制体分类

```
prefabs/
├── ui/              # UI相关预制体
│   ├── ElementView.prefab      # 游戏元素
│   ├── GameHUD.prefab          # 游戏界面
│   ├── PopupDialog.prefab      # 弹窗对话框
│   └── LoadingScreen.prefab    # 加载界面
├── game/            # 游戏逻辑预制体
│   ├── GameBoard.prefab        # 游戏棋盘
│   ├── ParticleEffect.prefab   # 粒子特效
│   └── AudioManager.prefab     # 音频管理器
└── common/          # 通用预制体
    ├── Button.prefab           # 通用按钮
    ├── Label.prefab            # 通用标签
    └── Background.prefab       # 背景组件
```

## 命名规范

- 使用 PascalCase 命名法
- 文件名应该清晰描述预制体用途
- 相同类型的预制体放在对应分类目录下

## 组件绑定

每个预制体都应该：
1. 绑定对应的 TypeScript 组件
2. 设置正确的节点层级结构
3. 配置必要的碰撞检测和事件监听