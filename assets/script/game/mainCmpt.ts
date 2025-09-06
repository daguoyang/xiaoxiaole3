import { EventKeyboard, Input, Node, input, _decorator } from 'cc';
import { BaseNodeCmpt } from '../components/baseNodeCmpt';
import { Direction } from '../const/enumConst';
import { EventName } from '../const/eventName';
import { LevelConfig } from '../const/levelConfig';
import { ViewName } from '../const/viewNameConst';
import { App } from '../core/app';
const { ccclass, property } = _decorator;

@ccclass('mainCmpt')
export class mainCmpt extends BaseNodeCmpt {
    @property(Node)
    canvase: Node = null;
    
    onLoad() {
        super.onLoad();
        App.init(this.canvase);
        this.initView();
        this.connectServer();
    }

    addEvent() {
        input.on(Input.EventType.KEY_DOWN, this.evtKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.evtKeyUp, this);
    }

    initView() {
        App.gameLogic.curLevel = LevelConfig.getCurLevel();
        App.view.openView(ViewName.Single.eLoadingView);
    }

    evtKeyDown(key: EventKeyboard) {
        key.keyCode == 68 && App.event.emit(EventName.Game.Move, Direction.right);
        key.keyCode == 65 && App.event.emit(EventName.Game.Move, Direction.left);
        key.keyCode == 87 && App.event.emit(EventName.Game.Move, Direction.up);
        key.keyCode == 83 && App.event.emit(EventName.Game.Move, Direction.down);
    }

    evtKeyUp(key: EventKeyboard) {
        App.event.emit(EventName.Game.EndMove);
    }

    connectServer() {
        // 网络连接逻辑（可选）
    }
}
