/** 场景名称常量 - 替代原ViewName */
export namespace SceneName {
    /** 单一场景 (只能单独存在) */
    export enum Single {
        /** 测试场景 */
        TestScene = 'ui/testScene',
        /** 跑马灯场景 */
        MarqueeScene = 'ui/marquee/marqueeScene',
        /** 主界面场景 */
        HomeScene = 'ui/homeScene',
        /** 游戏场景 */
        GameScene = 'ui/gameScene',
        /** 结果场景 */
        ResultScene = 'ui/resultScene',
        /** 胜利场景 */
        WinScene = 'ui/winScene',
        /** 设置场景 */
        SettingScene = 'ui/settingScene',
        /** 暂停场景 */
        PauseScene = 'ui/pauseScene',
        /** 加载场景 */
        LoadingScene = 'ui/loadingScene',
        /** 金币奖励场景 */
        GoldRewardScene = 'ui/goldRewardScene',
        /** 分享场景 */
        ShareScene = 'ui/shareScene',
        /** 购买场景 */
        BuyScene = 'ui/buyScene',
        /** 失败场景 */
        LoseScene = 'ui/loseScene',
        /** 目标提示场景 */
        LevelTargetScene = 'ui/levelTargetScene',
        /** 游戏中设置场景 */
        SettingGameScene = 'ui/settingGameScene',
        /** 模式选择场景 */
        ChallengeScene = 'ui/challengeScene',
        /** 新手引导场景 */
        GuideScene = 'ui/guideScene',
        /** 通关场景 */
        AcrossScene = 'ui/acrossScene'
    }

    /** 多重场景 (可以多个同时存在) */
    export enum Multiple {
        /** 提示框 */
        AlertDialog = 'common/alertDialog',
        /** 飘字提示 */
        MessageTips = 'ui/messageTips'
    }

    /** 游戏元素预制体 */
    export enum Pieces {
        rocket = "rocket",
        particle = "particle", 
        tile = "tile",
        score = "score",
        border = "border",
        gameMap = "gameMap"
    }
}