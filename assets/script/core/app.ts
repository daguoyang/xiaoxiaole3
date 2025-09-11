// 恢复原始App实现，只重命名项目标识
import { SingletonClass } from "./singletonClass";
import { I18nManager } from "./i18nManager";
import { EventManager } from "./eventManager";
import { ViewManager } from "./viewManager";
import { AudioManager, SoundType } from "./audioManager";
import { SubGameManager } from "./subGameManager";
import { PlatformManager } from "./platformManager";
import { UserInfo } from "./userInfo";
import { NoticeManager } from "./noticeManager";
import { StorageHelper } from "../helpers/storageHelper";
import TimeManager from "./timeManager";
import { SimpleHeartManager } from './simpleHeartManager';
import { MatchEngine } from "../game/engine/gameLogic";
import { WxMgr } from "../wx/wxManager";
import { ViewName } from "../definitions/viewNameConst";
import { Node } from "cc";

/**
 * 游戏应用管理器
 */
class GameApplication extends SingletonClass<GameApplication> {
    get user() { return UserInfo.getInstance<UserInfo>(UserInfo); }
    get platform() { return PlatformManager.getInstance<PlatformManager>(PlatformManager); }
    get subGame() { return SubGameManager.getInstance<SubGameManager>(SubGameManager); }
    get view() { return ViewManager.getInstance<ViewManager>(ViewManager); }
    get event() { return EventManager.getInstance<EventManager>(EventManager); }
    get audio() { return AudioManager.getInstance<AudioManager>(AudioManager); }
    get i18n() { return I18nManager.getInstance<I18nManager>(I18nManager); }
    get notice() { return NoticeManager.getInstance<NoticeManager>(NoticeManager); }
    get timer() { return TimeManager.getInstance<TimeManager>(TimeManager); }
    get heartManager() { return SimpleHeartManager.getInstance<SimpleHeartManager>(SimpleHeartManager); }
    get gameLogic() { return MatchEngine.getInstance<MatchEngine>(MatchEngine); }

    protected async onInit(canvas: Node) {
        this.user.init();
        this.audio.init(canvas);
        this.view.init(canvas);
        this.timer.init();
        this.heartManager.init();
        this.gameLogic.init();
        StorageHelper.initData();
        WxMgr.init();
    }

    backHome(isStart: boolean = false, pageIdx: number = 2) {
        this.view.openView(ViewName.Single.eHomeView, isStart, pageIdx);
        this.audio.play('game_theme_music', SoundType.Music, true);
    }

    setBackLobby() {
        this.platform.changeOrientation(false);
    }

    evtResizeCallback() {
        // 窗口大小变化监听
    }
}

export const App: GameApplication = GameApplication.getInstance<GameApplication>(GameApplication);
// 全局游戏引擎访问
window["GameEngine"] = App;



