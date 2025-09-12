# Resources Directory

这个目录包含游戏运行时需要动态加载的资源。

## 目录结构

```
resources/
├── levels/          # 关卡配置文件
│   ├── level_0001.json
│   ├── level_0002.json
│   └── ...
├── textures/        # 动态加载贴图
├── audio/          # 音频资源
└── data/           # 游戏数据配置
```

## 使用说明

- **levels/**: JSON格式的关卡配置文件，使用4位数字编号
- **textures/**: 需要动态加载的贴图资源
- **audio/**: 背景音乐和音效文件
- **data/**: 游戏配置数据，如平衡参数等

所有放在 resources 目录下的资源都可以通过 `resources.load()` API 动态加载。