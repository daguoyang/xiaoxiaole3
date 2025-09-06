import { _decorator, Component, Node } from 'cc';
import { BaseViewCmpt } from '../../components/baseViewCmpt';
import { PageIndex } from '../../const/enumConst';
import { EventName } from '../../const/eventName';
import { LevelConfig } from '../../const/levelConfig';
import { App } from '../../core/app';
import { CocosHelper } from '../../utils/cocosHelper';
import { GlobalFuncHelper } from '../../utils/globalFuncHelper';
import { StorageHelper, StorageHelperKey } from '../../utils/storageHelper';
import { WxManager, WxMgr } from '../../wx/wxManager';
import { Advertise } from '../../wx/advertise';
const { ccclass, property } = _decorator;

@ccclass('settingViewCmpt')
export class settingViewCmpt extends BaseViewCmpt {
    private lbName: Node = null;
    private lbHeart: Node = null;
    private head: Node = null;
    private content: Node = null;
    onLoad() {
        for (let i = 1; i < 10; i++) {
            this[`onClick_head${i}`] = this.onClickHead.bind(this);
        }
        super.onLoad();
        this.lbName = this.viewList.get('lbName');
        this.lbHeart = this.viewList.get('animNode/content/p/lbHeart');
        this.content = this.viewList.get('scrollview/view/content');
        this.head = this.viewList.get('bg/head');
        this.updateOperateStatus();
        
        // 监听体力更新事件
        App.event.on(EventName.Game.HeartUpdate, this.updateHeartInfo, this);
    }

    updateOperateStatus() {
        if (this.viewList.get('bg/btnSound/off')) {
            this.viewList.get('bg/btnSound/off').active = !StorageHelper.getBooleanData(StorageHelperKey.Music_Eff_Status);
            this.viewList.get('bg/btnMusic/off').active = !StorageHelper.getBooleanData(StorageHelperKey.Music_Status);
        } else {
            this.viewList.get('animNode/content/btnSound/off').active = !StorageHelper.getBooleanData(StorageHelperKey.Music_Eff_Status);
            this.viewList.get('animNode/content/btnMusic/off').active = !StorageHelper.getBooleanData(StorageHelperKey.Music_Status);
        }
        this.updateHeartInfo();
        if (!this.lbName) return;
        CocosHelper.updateLabelText(this.lbName, App.user.rankData.name);
        this.updateHead();
        this.updateHeadInfo(`head${App.user.rankData.icon}`)
    }

    loadExtraData() {
        App.audio.play('UI_PopUp');
    }

    updateHead() {
        if (this.head) {
            CocosHelper.updateUserHeadSpriteAsync(this.head, App.user.rankData.icon);
        }
    }

    onClick_btnSound() {
        App.audio.play('button_click');
        StorageHelper.setBooleanData(StorageHelperKey.Music_Eff_Status, !StorageHelper.getBooleanData(StorageHelperKey.Music_Eff_Status))
        this.updateOperateStatus();
    }

    onClick_btnMusic() {
        App.audio.play('button_click');
        StorageHelper.setBooleanData(StorageHelperKey.Music_Status, !StorageHelper.getBooleanData(StorageHelperKey.Music_Status))
        this.updateOperateStatus();
    }

    onClickHead(btn: Node) {
        App.audio.play('button_click');
        this.updateHeadInfo(btn.name);
        let icon = +btn.name.substring(btn.name.length - 1, btn.name.length);
        App.user.rankData.icon = icon;
        GlobalFuncHelper.setIcon(icon);
        this.updateHead();
        // 通知其他界面更新头像
        App.event.emit(EventName.Game.UpdateAvatar, icon);
    }
    
    /** 更新体力显示 - 设置页面只显示数量 */
    updateHeartInfo() {
        if (this.lbHeart) {
            const currentHeart = App.heartManager.getCurrentHeart();
            CocosHelper.updateLabelText(this.lbHeart, `x${currentHeart}`);
        }
    }
    
    onDestroy() {
        super.onDestroy();
        App.event.off(EventName.Game.HeartUpdate, this);
    }

    updateHeadInfo(name: string) {
        if (!this.head) return;
        this.content.children.forEach(item => {
            item.getChildByName('s').active = item.name == name;
        });
    }

    onClick_replayBtn() {
        this.onClick_closeBtn();
        App.audio.play('button_click');
        
        // 使用新的体力管理器检查和消耗体力
        if (!App.heartManager.consumeHeart(1)) {
            // 体力不足，显示提示并跳转到商店
            App.view.showMsgTips("体力不足！");
            // 体力不足时显示广告而不是跳转商店
            console.log("显示广告，广告ID：adunit-7fc34b1dba8ed852");
            Advertise.showVideoAds();
            return;
        }
        
        // 通知UI更新体力显示
        App.event.emit(EventName.Game.HeartUpdate);
        
        App.event.emit(EventName.Game.Restart);
    }

    onClick_homeBtn() {
        App.audio.play('button_click');
        this.onClick_closeBtn();
        App.backHome();
    }
}