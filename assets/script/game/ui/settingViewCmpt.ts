import { _decorator, Component, Node, isValid } from 'cc';
import { BaseViewCmpt } from '../../base/baseViewCmpt';
import { NavigationIndex, PageIndex } from '../../definitions/enumConst';
import { EventName } from '../../definitions/eventName';
import { LevelConfig } from '../../definitions/levelConfig';
import { ViewName } from '../../definitions/viewNameConst';
import { App } from '../../core/app';
import { CocosHelper } from '../../helpers/cocosHelper';
import { GlobalFuncHelper } from '../../helpers/globalFuncHelper';
import { StorageHelper, StorageHelperKey } from '../../helpers/storageHelper';
import { WxManager, WxMgr } from '../../wx/wxManager';
import { Advertise } from '../../wx/advertise';
const { ccclass, property } = _decorator;

@ccclass('settingViewCmpt')
export class GameConfigController extends BaseViewCmpt {
    private lbName: Node = null;
    private lbHeart: Node = null;
    private head: Node = null;
    private content: Node = null;
    onLoad() {
        for (let i = 1; i < 10; i++) {
            this[`onSelectHead${i}`] = this.onClickHead.bind(this);
            // 兼容按钮绑定系统
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
        App.audio.play('interface_popup_sound');
    }

    updateHead() {
        if (this.head) {
            CocosHelper.updateUserHeadSpriteAsync(this.head, App.user.rankData.icon);
        }
    }

    onToggleSound() {
        App.audio.play('ui_touch_feedback');
        StorageHelper.setBooleanData(StorageHelperKey.Music_Eff_Status, !StorageHelper.getBooleanData(StorageHelperKey.Music_Eff_Status))
        this.updateOperateStatus();
    }

    onToggleMusic() {
        App.audio.play('ui_touch_feedback');
        StorageHelper.setBooleanData(StorageHelperKey.Music_Status, !StorageHelper.getBooleanData(StorageHelperKey.Music_Status))
        this.updateOperateStatus();
    }

    onClickHead(btn: Node) {
        App.audio.play('ui_touch_feedback');
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
        if (!this.viewList || !isValid(this.node)) {
            console.warn('设置组件已销毁，跳过 updateHeartInfo');
            return;
        }
        
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

    onRestartGame() {
        App.audio.play('ui_touch_feedback');
        
        // 检查体力是否足够
        if (!App.heartManager.hasEnoughHeart(1)) {
            // 体力不足，显示广告获取体力
            this.showRestartHeartInsufficientDialog();
            return;
        }
        
        // 体力足够，消耗体力并重新开始
        this.restartGame();
    }

    /** 重新开始体力不足直接看广告 */
    showRestartHeartInsufficientDialog() {
        console.log("重新开始体力不足，直接跳转观看广告");
        
        // 直接观看广告
        Advertise.showVideoAdsForHeart(
            () => {
                // 广告播放成功，获得体力，直接重新开始
                console.log("广告播放完成，获得体力，重新开始游戏");
                App.view.showMsgTips("获得1点体力！");
                // 延迟一下再重新开始游戏
                setTimeout(() => {
                    this.restartGame();
                }, 1000);
            },
            () => {
                // 广告播放失败或用户取消
                console.log("广告播放失败或用户取消");
                App.view.showMsgTips("未获得体力，无法重新开始");
            }
        );
    }

    /** 重新开始游戏的逻辑 */
    private restartGame() {
        // 再次检查体力并消耗
        if (!App.heartManager.consumeHeart(1)) {
            App.view.showMsgTips("体力不足！");
            return;
        }
        
        // 通知UI更新体力显示
        App.event.emit(EventName.Game.HeartUpdate);
        
        this.handleClosePanel();
        App.event.emit(EventName.Game.Restart);
    }

    onReturnHome() {
        App.audio.play('ui_touch_feedback');
        this.handleClosePanel();
        App.backHome();
    }
    
    // 兼容旧的按钮绑定系统
    onClick_btnSound() { this.onToggleSound(); }
    onClick_btnMusic() { this.onToggleMusic(); }
    onClick_replayBtn() { this.onRestartGame(); }
    onClick_homeBtn() { this.onReturnHome(); }
    onClick_closeBtn() { 
        // 通过视图管理器正确关闭，确保从allView Map中删除
        // 检查是游戏内设置还是普通设置页面
        let viewName = ViewName.Single.eSettingView;
        if (App.view.getViewByName(ViewName.Single.esettingGameView)) {
            viewName = ViewName.Single.esettingGameView;
        }
        App.view.closeView(viewName); 
    }
}
