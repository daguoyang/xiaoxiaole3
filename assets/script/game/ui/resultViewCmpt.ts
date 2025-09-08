import { _decorator, Node, tween, v3 } from 'cc';
import { BaseViewCmpt } from '../../components/baseViewCmpt';
import { EventName } from '../../const/eventName';
import { LevelConfig } from '../../const/levelConfig';
import { ViewName } from '../../const/viewNameConst';
import { App } from '../../core/app';
import { GlobalFuncHelper } from '../../utils/globalFuncHelper';
import { Advertise } from '../../wx/advertise';
import { gridCmpt } from './item/gridCmpt';
const { ccclass, property } = _decorator;

@ccclass('resultViewCmpt')
export class ResultViewCmpt extends BaseViewCmpt {
    private isWin: boolean = false;
    private level: number = 0;
    private starCount: number = 0;
    private star: Node = null;

    onLoad() {
        super.onLoad();
        this.star = this.viewList.get('animNode/win/star');
    }

    async loadExtraData(lv: number, isWin: boolean, coutArr: any[], starCount: number) {
        console.log(`结果弹窗加载数据 - 关卡:${lv}, 胜利:${isWin}, 星数:${starCount}, 目标状态:`, coutArr);
        
        if (isWin) {
            App.audio.play('level_complete_music');
        }
        else {
            App.audio.play('game_over_audio');
        }
        this.level = lv;
        this.starCount = starCount;
        this.isWin = isWin;
        this.viewList.get('animNode/win').active = isWin;
        this.viewList.get('animNode/lose').active = !isWin;
        
        // 检查各种可能的按钮路径
        let continueBtnWin = this.viewList.get('animNode/win/continueBtn');
        let continueBtnLose = this.viewList.get('animNode/lose/continueBtn');
        let nextBtnWin = this.viewList.get('animNode/win/nextBtn');
        let nextBtnLose = this.viewList.get('animNode/lose/nextBtn');
        let guanbiBtnWin = this.viewList.get('animNode/win/guanbiBtn');
        let guanbiBtnLose = this.viewList.get('animNode/lose/guanbiBtn');
        
        console.log(`按钮检查 - continueBtn win:${!!continueBtnWin} lose:${!!continueBtnLose}`);
        console.log(`按钮检查 - nextBtn win:${!!nextBtnWin} lose:${!!nextBtnLose}`);
        console.log(`按钮检查 - guanbiBtn win:${!!guanbiBtnWin} lose:${!!guanbiBtnLose}`);
        
        if (isWin) {
            LevelConfig.setLevelStar(lv, starCount);
            this.handleWin(coutArr);
            // 胜利奖励1点体力
            App.heartManager.addHeart(1);
            // 通知UI更新体力显示
            App.event.emit(EventName.Game.HeartUpdate);
        }
        else {
            this.handleLose();
        }
    }

    handleLose() {

    }

    handleWin(coutArr: any[]) {
        let target = this.viewList.get('animNode/win/target');
        target.children.forEach((item, idx) => {
            if (!coutArr) return;
            item.active = idx < coutArr.length;
            if (idx < coutArr.length) {
                item.getComponent(gridCmpt).setType(coutArr[idx][0]);
                let count = coutArr[idx][1]
                if (count == 0) {
                    item.getComponent(gridCmpt).showGou(true);
                }
                else {
                    item.getComponent(gridCmpt).setCount(count);
                }
            }
        });
        this.playStarAnim();
    }

    playStarAnim() {
        this.star.active = this.isWin;
        let count = this.starCount;
        if (this.isWin) {
            this.star.children.forEach((item, idx) => {
                item.getChildByName('s').active = idx + 1 <= count;
                item.setScale(0, 0, 0);
                tween(item).to(0.3 * (idx + 1), { scale: v3(1, 1, 1) }, { easing: 'backOut' }).start();
            });
        }
    }
    /** 下一关 */
    async onClick_nextBtn() {
        App.audio.play('ui_touch_feedback');
        GlobalFuncHelper.setGold(App.gameLogic.rewardGold);
        if (this.level == LevelConfig.getCurLevel()) {
            LevelConfig.nextLevel();
        }
        
        // 标记结果已处理，防止重复弹窗
        let gameView = App.view.getViewByName(ViewName.Single.eGameView);
        if (gameView) {
            let sweetMatchGameView = gameView.getComponent('SweetMatchGameView');
            if (sweetMatchGameView) {
                sweetMatchGameView.resultShown = true;
            }
        }
        
        // 关闭视图并切换到主页
        App.view.closeView(ViewName.Single.eResultView);
        App.view.closeView(ViewName.Single.eGameView);
        App.view.openView(ViewName.Single.eHomeView, true);
    }
    /** 获取奖励 - 观看广告 */
    onClick_shareBtn() {
        App.audio.play('ui_touch_feedback');
        
        // 直接播放广告，不触发微信分享
        Advertise.showVideoAds();
    }
    /** 继续游戏按钮 */
    async onClick_continueBtn() {
        App.audio.play('ui_touch_feedback');
        
        // 取消自动关闭定时器
        this.unscheduleAllCallbacks();
        
        console.log(`点击继续游戏按钮 - isWin: ${this.isWin}, level: ${this.level}`);
        
        if (this.isWin) {
            // 胜利状态：完成关卡，返回主页面准备下一关
            GlobalFuncHelper.setGold(App.gameLogic.rewardGold);
            if (this.level == LevelConfig.getCurLevel()) {
                LevelConfig.nextLevel();
            }
            
            // 标记结果已处理，防止重复弹窗
            let gameView = App.view.getViewByName(ViewName.Single.eGameView);
            if (gameView) {
                let sweetMatchGameView = gameView.getComponent('SweetMatchGameView');
                if (sweetMatchGameView) {
                    sweetMatchGameView.resultShown = true;
                }
            }
            
            // 关闭视图并返回主页
            App.view.closeView(ViewName.Single.eResultView);
            App.view.closeView(ViewName.Single.eGameView);
            App.view.openView(ViewName.Single.eHomeView, true);
        } else {
            // 失败状态：购买道具继续当前关卡
            let count = +GlobalFuncHelper.getGold();
            if (count < 200) {
                App.view.showMsgTips("金币不足")
                Advertise.showVideoAds();
                return;
            }
            
            GlobalFuncHelper.setGold(-200);
            App.event.emit(EventName.Game.UpdataGold);
            App.event.emit(EventName.Game.ContinueGame);
        }
    }

    /** 关闭按钮 - 返回主页面 */
    async onClick_guanbiBtn() {
        
        // 取消自动关闭定时器
        this.unscheduleAllCallbacks();
        
        if (this.isWin) {
            // 胜利状态下点击关闭按钮，执行与继续游戏相同的逻辑
            console.log(`胜利状态关闭，执行继续游戏逻辑`);
            GlobalFuncHelper.setGold(App.gameLogic.rewardGold);
            if (this.level == LevelConfig.getCurLevel()) {
                LevelConfig.nextLevel();
            }
        }
        
        console.log(`开始关闭视图并返回主页...`);
        
        // 标记结果已处理，防止重复弹窗
        let gameView = App.view.getViewByName(ViewName.Single.eGameView);
        if (gameView) {
            let sweetMatchGameView = gameView.getComponent('SweetMatchGameView');
            if (sweetMatchGameView) {
                sweetMatchGameView.resultShown = true;
                console.log(`关闭按钮设置resultShown=true`);
            }
        }
        
        // 直接关闭所有视图并返回主页
        App.view.closeView(ViewName.Single.eResultView);
        App.view.closeView(ViewName.Single.eGameView);
        App.view.openView(ViewName.Single.eHomeView, true);
        console.log(`关闭按钮处理完成`);
    }

    /** 自动关闭胜利弹窗 */
    autoWinClose() {
        if (this.isWin) {
            console.log(`自动关闭胜利弹窗并跳转主页`);
            
            // 发放奖励
            GlobalFuncHelper.setGold(App.gameLogic.rewardGold);
            if (this.level == LevelConfig.getCurLevel()) {
                LevelConfig.nextLevel();
            }
            
            // 标记结果已处理
            let gameView = App.view.getViewByName(ViewName.Single.eGameView);
            if (gameView) {
                let sweetMatchGameView = gameView.getComponent('SweetMatchGameView');
                if (sweetMatchGameView) {
                    sweetMatchGameView.resultShown = true;
                }
            }
            
            // 关闭弹窗并跳转
            App.view.closeView(ViewName.Single.eResultView);
            App.view.closeView(ViewName.Single.eGameView);
            App.view.openView(ViewName.Single.eHomeView, true);
            console.log(`自动跳转完成`);
        }
    }
}