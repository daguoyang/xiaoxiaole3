重写版（rewrite-clean）说明

目标
- 全新代码骨架，移除历史指纹（广告ID、AppID、第三方Key、示例代码注释）。
- 平台适配独立、广告ID从配置注入，不在源码硬编码。
- 为后续迁移棋盘逻辑、UI、关卡提供干净基座。

目录
- assets/new-scripts/config: 配置与类型（不要硬编码ID）。
- assets/new-scripts/platform/wechat: 微信适配与广告服务（AdService、WeChatPlatform）。
- assets/new-scripts/core|board|ui: 游戏内核、网格/匹配/重力占位、UI中介占位。
- tools/scanSensitive.js: 指纹扫描脚本（adunit-/wxAppID/“麻将”关键词）。

使用
1) 在 `assets/new-scripts/config/game.ts` 填入你主体下的新广告位ID（当前已设置 rewardedId=adunit-7fc34b1dba8ed852；Banner/插屏可后续补充）。
   WeChat AppID（wx65f6c89b65863369）请在 Cocos 构建面板或微信开发者工具项目配置中填写（不要在代码里硬编码）。
2) 在游戏入口处创建并初始化：
   const app = new GameApp();
   app.init();
3) 如需激励广告：
   app.showAdForReward(() => {/* 发奖励 */}, () => {/* 失败回退 */});

自检
- node tools/scanSensitive.js        # 扫描敏感指纹

注意
- 不要把他方 AppID/adUnitId 放入代码或文档。
- 素材与音频请替换为你方自有/可商用授权版本。
