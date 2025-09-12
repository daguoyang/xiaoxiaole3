export const GameConfig = {
    // 基础游戏配置
    BOARD_SIZE: 9,
    MIN_MATCH_LENGTH: 3,
    MAX_MATCHES_PER_TURN: 10,
    VERSION: '1.0.0',
    DEBUG_MODE: false,
    
    // 棋盘配置
    BOARD: {
        SIZE: 9,
        CELL_SIZE: 80,
        PADDING: 2
    },
    
    // 游戏功能配置
    FEATURES: {
        HINTS: true,
        SHUFFLE: true,
        POWER_UPS: true,
        SPECIAL_EFFECTS: true,
        ENABLE_ANALYTICS: true,
        ENABLE_EFFECTS: true,
        ENABLE_AUTO_HINTS: true
    },
    
    // 动画配置
    ANIMATION: {
        ELEMENT_ELIMINATE_DURATION: 400,
        ELEMENT_SWAP_DURATION: 250,
        ELEMENT_FALL_DURATION: 300,
        CASCADE_DELAY: 200,
        SPAWN_DELAY: 100,
        MATCH_PROCESSING_DELAY: 300
    },
    
    // 动画时间配置 (毫秒) - 保持向后兼容
    ANIMATION_DURATION: {
        SWAP: 250,
        FALL: 300,
        ELIMINATE: 400,
        CASCADE: 200,
        POP_IN: 200,
        HINT: 1000
    },
    
    // 游戏延迟配置
    DELAYS: {
        CASCADE: 100,
        ELIMINATION: 150,
        REFILL: 200,
        HINT: 5000,
        NO_MOVES_SHUFFLE: 2000
    },
    
    // 分数配置
    SCORE: {
        BASE_MATCH: 100,
        COMBO_MULTIPLIER: 1.5,
        CHAIN_BONUS: 200,
        TIME_BONUS_FACTOR: 10
    },
    
    // UI配置
    UI: {
        DESIGN_WIDTH: 1080,
        DESIGN_HEIGHT: 1920,
        SAFE_AREA_RATIO: 0.9,
        BUTTON_SCALE_EFFECT: 0.95,
        LOW_MOVES_WARNING: 5,
        LOW_TIME_WARNING: 30,
        WARNING_COLOR: '#ff4444',
        HINT_COOLDOWN: 3000,
        AUTO_HINT_INTERVAL: 10000
    },
    
    // 音频配置
    AUDIO: {
        MASTER_VOLUME: 1.0,
        SFX_VOLUME: 0.8,
        MUSIC_VOLUME: 0.6,
        FADE_DURATION: 1000,
        MUSIC_ENABLED: true,
        SFX_ENABLED: true
    },
    
    // 存档系统配置
    SAVE_SYSTEM: {
        AUTO_SAVE_INTERVAL: 30,
        ENABLE_ENCRYPTION: true,
        ENABLE_CLOUD_SAVE: false
    },
    
    // 调试配置
    DEBUG: {
        ENABLE_LOGS: true,
        SHOW_FPS: false,
        SHOW_POSSIBLE_MOVES: false,
        SKIP_ANIMATIONS: false
    },
    
    // 性能配置
    PERFORMANCE: {
        MAX_PARTICLES: 100,
        TEXTURE_ATLAS_SIZE: 2048,
        ASSET_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
        MAX_CONCURRENT_ANIMATIONS: 20
    },
    
    // 平台配置
    PLATFORM: {
        WECHAT: {
            SHARE_TITLE: "嗨玩消消消",
            SHARE_IMAGE_URL: "https://example.com/share.jpg"
        },
        ANDROID: {
            PACKAGE_NAME: "com.game.hiplaymatch"
        },
        IOS: {
            BUNDLE_ID: "com.game.hiplaymatch"
        }
    }
} as const;

export type GameConfigType = typeof GameConfig;