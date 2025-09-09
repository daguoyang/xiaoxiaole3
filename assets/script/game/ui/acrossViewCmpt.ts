import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;
import { BaseViewCmpt } from '../../base/baseViewCmpt';
import { ViewName } from '../../definitions/viewNameConst';
import { App } from '../../core/app';
@ccclass('acrossViewCmpt')
export class TransitionDialog extends BaseViewCmpt {
    onLoad() {
        super.onLoad();
    }

    loadExtraData() {
        App.view.closeView(ViewName.Single.eLoadingView);

    }
    initiateTransition() {
        App.view.openView(ViewName.Single.eHomeView);
    }
    
    // 兼容旧的按钮绑定系统
    onClick_startBtn() {
        this.initiateTransition();
    }
    onClick_closeBtn() { 
        // 通过视图管理器正确关闭，确保从allView Map中删除
        App.view.closeView(ViewName.Single.eAcrossView); 
    }
}


