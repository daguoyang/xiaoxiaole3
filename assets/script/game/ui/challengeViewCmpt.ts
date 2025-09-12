import { _decorator, Node, isValid } from 'cc';
import { BaseViewCmpt } from '../../base/baseViewCmpt';
import { PowerUpType, Bomb, LevelData } from '../../definitions/enumConst';
import { EventName } from '../../definitions/eventName';
import { LevelConfig } from '../../definitions/levelConfig';
import { ViewName } from '../../definitions/viewNameConst';
import { App } from '../../core/app';
import { CocosHelper } from '../../helpers/cocosHelper';
import { GlobalFuncHelper } from '../../helpers/globalFuncHelper';
import { Advertise } from '../../wx/advertise';
import { gridCmpt } from './item/gridCmpt';
const { ccclass, property } = _decorator;

@ccclass('challengeViewCmpt')
export class LevelSelectController extends BaseViewCmpt {
    private lv: number = 0;
    private lbTool1: Node = null;
    private lbTool2: Node = null;
    private lbTool3: Node = null;

    private tCount1: number = 0;
    private tCount2: number = 0;
    private tCount3: number = 0;
    onLoad() {
        for (let i = 1; i < 4; i++) {
            this[`onToolAction${i}`] = this.onClickToolBtn.bind(this);
            // 兼容按钮绑定系统
            this[`onClick_toolBtn${i}`] = this.onClickToolBtn.bind(this);
        }
        super.onLoad();
        this.lbTool1 = this.viewList.get('animNode/content/bg/toolBtn1/prompt/lbTool1');
        this.lbTool2 = this.viewList.get('animNode/content/bg/toolBtn2/prompt/lbTool2');
        this.lbTool3 = this.viewList.get('animNode/content/bg/toolBtn3/prompt/lbTool3');
        // 正式模式 - 不设置无限道具
        const isTestMode = false; // 正式版本设为 false
        
        this.tCount1 = GlobalFuncHelper.getBomb(Bomb.hor) //+ GlobalFuncHelper.getBomb(Bomb.ver);
        this.tCount2 = GlobalFuncHelper.getBomb(Bomb.bomb);
        this.tCount3 = GlobalFuncHelper.getBomb(Bomb.allSame);
    }

    async loadExtraData(lv: number) {
        this.lv = lv;
        CocosHelper.updateLabelText(this.viewList.get('animNode/content/lb/title'), `第${lv}关`);
        let data: LevelData = await LevelConfig.getLevelData(lv);
        let target = this.viewList.get('animNode/content/target');
        let idArr = data.mapData[0].m_id;
        let mkArr = data.mapData[0].m_mk;  // 🎯 使用正确的目标数量字段

        target.children.forEach((item, idx) => {
            item.active = idx < idArr.length;
            if (idx < idArr.length) {
                item.getComponent(gridCmpt).setType(idArr[idx]);
                // 🎯 使用与游戏内一致的原始显示逻辑公式
                let ctArr = data.mapData[0].m_ct;
                let count = ctArr[idx] + 10;
                if (ctArr[idx] < 10) {
                    count = ctArr[idx] + 30;
                }
                item.getComponent(gridCmpt).setCount(count);
            }
        });

        // 正式模式 - 显示具体道具数量
        const isTestMode = false; // 正式版本设为 false
        
        if (false) { // 永久关闭测试模式显示
            CocosHelper.updateLabelText(this.lbTool1, "∞");
            CocosHelper.updateLabelText(this.lbTool2, "∞");
            CocosHelper.updateLabelText(this.lbTool3, "∞");
        } else {
            // 正常模式
            CocosHelper.updateLabelText(this.lbTool1, this.tCount1);
            CocosHelper.updateLabelText(this.lbTool2, this.tCount2);
            CocosHelper.updateLabelText(this.lbTool3, this.tCount3);
        }
        
        this.setAddStatus();
    }

    triggerStartGame() {
        App.audio.play('ui_touch_feedback');
        
        // 检查体力是否足够
        if (!App.heartManager.hasEnoughHeart(1)) {
            // 体力不足，显示广告获取体力
            this.showHeartInsufficientDialog();
            return;
        }
        
        // 体力足够，直接开始游戏
        this.startGame();
    }

    onClickToolBtn(btn: Node) {
        App.audio.play('ui_touch_feedback');
        let idx = +btn.name.substring(btn.name.length - 1, btn.name.length);
        if (this[`tCount${idx}`] <= 0) {
            // 道具不足时显示广告获取道具
            this.showToolInsufficientDialog(idx);
            return;
        }
        let ac = btn.getChildByName("s").active;
        btn.getChildByName("s").active = !ac;
        btn.getChildByName("s1").active = !ac;
    }

    setAddStatus() {
        // 正式模式 - 显示道具数量和添加按钮
        const isTestMode = false; // 正式版本设为 false
        
        for (let i = 1; i < 4; i++) {
            let add = this.viewList.get(`animNode/content/bg/toolBtn${i}`).getChildByName('add');
            if (isTestMode) {
                add.active = false; // 测试模式下不显示添加按钮
            } else {
                add.active = this[`tCount${i}`] <= 0; // 正常模式
            }
        }
    }

    /** 体力不足直接看广告 */
    showHeartInsufficientDialog() {
        console.log("体力不足，直接跳转观看广告");
        // 直接观看广告
        Advertise.showVideoAdsForHeart(
            () => {
                // 广告播放成功，获得体力，直接开始游戏
                console.log("广告播放完成，获得体力，开始游戏");
                App.view.showMsgTips("获得1点体力！");
                // 延迟一下再开始游戏，让用户看到获得体力的提示
                setTimeout(() => {
                    this.startGame();
                }, 1000);
            },
            () => {
                // 广告播放失败或用户取消
                console.log("广告播放失败或用户取消");
                App.view.showMsgTips("未获得体力，无法开始游戏");
            }
        );
    }

    /** 道具不足直接看广告 */
    showToolInsufficientDialog(toolIndex: number) {
        const toolNames = ["", "横向导弹", "炸弹", "五消道具"];
        const toolTypes = [null, Bomb.hor, Bomb.bomb, Bomb.allSame];
        
        console.log(`道具${toolIndex}不足，直接跳转观看广告`);
        
        // 直接观看广告
        Advertise.showVideoAdsForTool(
            toolTypes[toolIndex],
            () => {
                // 广告播放成功，获得道具
                console.log(`广告播放完成，获得${toolNames[toolIndex]}`);
                App.view.showMsgTips(`获得${toolNames[toolIndex]}！`);
                
                // 更新道具数量显示
                this[`tCount${toolIndex}`] = GlobalFuncHelper.getBomb(toolTypes[toolIndex]);
                CocosHelper.updateLabelText(this[`lbTool${toolIndex}`], this[`tCount${toolIndex}`]);
                this.setAddStatus();
                
                // 自动选中该道具
                let btn = this.viewList.get(`animNode/content/bg/toolBtn${toolIndex}`);
                btn.getChildByName("s").active = true;
                btn.getChildByName("s1").active = true;
            },
            () => {
                // 广告播放失败或用户取消
                console.log("广告播放失败或用户取消");
                App.view.showMsgTips("未获得道具");
            }
        );
    }

    /** 开始游戏的逻辑 */
    private startGame() {
        // 再次检查体力并消耗
        if (!App.heartManager.consumeHeart(1)) {
            App.view.showMsgTips("体力不足！");
            return;
        }
        
        // 通知UI更新体力显示
        App.event.emit(EventName.Game.UpdataGold);
        
        App.gameLogic.toolsArr = [];
        for (let i = 1; i < 4; i++) {
            let s = this.viewList.get(`animNode/content/bg/toolBtn${i}`).getChildByName('s');
            if (s.active) {
                App.gameLogic.toolsArr.push(i + 8);
                switch (i + 8) {
                    case Bomb.allSame:
                        GlobalFuncHelper.setBomb(Bomb.allSame, -1);
                        break;;
                    case Bomb.hor:
                        GlobalFuncHelper.setBomb(Bomb.hor, -1);
                        break;;
                    case Bomb.ver:
                        GlobalFuncHelper.setBomb(Bomb.ver, -1);
                        break;;
                    case Bomb.bomb:
                        GlobalFuncHelper.setBomb(Bomb.bomb, -1);
                        break;;
                }
            }
        }
        this.handleClosePanel();
        App.view.openView(ViewName.Single.eGameView, this.lv);
    }
    
    // 兼容旧的按钮绑定系统  
    onClick_playBtn() { this.triggerStartGame(); }
    onClick_closeBtn() { 
        // 通过视图管理器正确关闭，确保从allView Map中删除
        App.view.closeView(ViewName.Single.eChallengeView); 
    }
}
