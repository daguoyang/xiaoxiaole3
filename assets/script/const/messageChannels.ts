/** 消息频道 - 替代原EventName */
export namespace MessageChannels {
    /** 游戏相关消息 */
    export enum Game {
        TOUCH_START = 'game.touch.start',
        TOUCH_MOVE = 'game.touch.move', 
        TOUCH_END = 'game.touch.end',
        PLAYER_MOVE = 'game.player.move',
        END_MOVE = 'game.player.endMove',
        CONTINUE_GAME = 'game.continue',
        RESTART = 'game.restart',
        LEVEL_COMPLETE = 'game.level.complete',
        GAME_OVER = 'game.over',
        SCORE_UPDATE = 'game.score.update',
        POWERUP_USED = 'game.powerup.used'
    }

    /** UI相关消息 */
    export enum UI {
        SCENE_OPENED = 'ui.scene.opened',
        SCENE_CLOSED = 'ui.scene.closed',
        BUTTON_CLICKED = 'ui.button.clicked',
        SHOW_MESSAGE = 'ui.message.show',
        HIDE_MESSAGE = 'ui.message.hide',
        UPDATE_DISPLAY = 'ui.display.update'
    }

    /** 音频相关消息 */
    export enum Audio {
        PLAY_MUSIC = 'audio.music.play',
        PLAY_EFFECT = 'audio.effect.play',
        STOP_MUSIC = 'audio.music.stop',
        VOLUME_CHANGE = 'audio.volume.change'
    }

    /** 系统相关消息 */
    export enum System {
        APP_PAUSE = 'system.app.pause',
        APP_RESUME = 'system.app.resume',
        MEMORY_WARNING = 'system.memory.warning',
        NETWORK_CHANGE = 'system.network.change'
    }
}