import { _decorator, Node } from 'cc';
import { BaseViewCmpt } from '../../components/baseViewCmpt';
import { EventName } from '../../const/eventName';
import { App } from '../../core/app';
import { CocosHelper } from '../../utils/cocosHelper';
import { GlobalFuncHelper } from '../../utils/globalFuncHelper';
import { Advertise } from '../../wx/advertise';
const { ccclass, property } = _decorator;

/**
 * 商店页面组件 - 已简化为广告奖励系统
 */
@ccclass('buyViewCmpt')
export class buyViewCmpt extends BaseViewCmpt {
    private content: Node = null;
    private lbGold: Node = null;

    onLoad() {
        super.onLoad();
        this.content = this.viewList.get('animNode/content/bg/scrollview/view/content');
        this.lbGold = this.viewList.get('animNode/content/top/lbGold');
    }

    loadExtraData() {
        App.audio.play('interface_popup_sound');
        this.updateGoldDisplay();
    }

    updateGoldDisplay() {
        let gold = GlobalFuncHelper.getGold();
        CocosHelper.updateLabelText(this.lbGold, gold);
    }

    /**
     * 处理所有按钮点击 - 统一显示广告并给奖励
     */
    handleBtnEvent(btn: Node) {
        App.audio.play('ui_touch_feedback');
        
        // 显示广告
        console.log("显示广告，广告ID：adunit-7fc34b1dba8ed852");
        Advertise.showVideoAds();
        
        // 根据按钮类型给予不同奖励
        switch (btn.name) {
            case 'itemBtn7': // 体力相关
                App.heartManager.addHeart(1);
                App.event.emit(EventName.Game.HeartUpdate);
                App.view.showMsgTips("观看广告获得体力！");
                break;
            case 'itemBtn1': // 大礼包
                GlobalFuncHelper.setGold(100);
                App.heartManager.addHeart(1);
                App.event.emit(EventName.Game.UpdataGold);
                App.event.emit(EventName.Game.HeartUpdate);
                App.view.showMsgTips("观看广告获得大礼包！");
                break;
            default:
                // 其他按钮给金币奖励
                GlobalFuncHelper.setGold(50);
                App.event.emit(EventName.Game.UpdataGold);
                App.view.showMsgTips("观看广告获得金币！");
                break;
        }
        
        this.updateGoldDisplay();
    }

    /**
     * 兼容旧的按钮点击方法
     */
    onClick_itemBtn(btn: Node) {
        this.handleBtnEvent(btn);
    }
}