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
import { StorageHelper } from "../utils/storageHelper";
import TimeManager from "./timeManager";
import { SimpleHeartManager } from './simpleHeartManager';
import { GameLogic } from "../game/logic/gameLogic";
import { WxMgr } from "../wx/wxManager";
import { ViewName } from "../const/viewNameConst";
import { Node } from "cc";

/**
 * 星光消除引擎 - 原创游戏管理器
 */
class StarMatchGameApp extends SingletonClass<StarMatchGameApp> {
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
    get gameLogic() { return GameLogic.getInstance<GameLogic>(GameLogic); }

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
        this.audio.play('background', SoundType.Music, true);
    }

    setBackLobby() {
        this.platform.changeOrientation(false);
    }

    evtResizeCallback() {
        // 窗口大小变化监听
    }
}

export const App: StarMatchGameApp = StarMatchGameApp.getInstance<StarMatchGameApp>(StarMatchGameApp);
// 更新全局访问标识
window["StarCombinationEngine"] = App;



