import { _decorator, Node, Sprite, UITransform, v3 } from 'cc';
import ScrollItemCmpt from '../../../base/scrollItemCmpt';
import { LevelConfig } from '../../../definitions/levelConfig';
import { ViewName } from '../../../definitions/viewNameConst';
import { App } from '../../../core/app';
import { CocosHelper } from '../../../helpers/cocosHelper';
const { ccclass, property } = _decorator;

@ccclass('mapCmpt')
export class mapCmpt extends ScrollItemCmpt {
    private index: number = 0;
    private local: Node = null;
    onLoad() {
        for (let i = 1; i < 9; i++) {
            this[`onSelectLevel${i}`] = this.activateLevel.bind(this);
            // 兼容按钮绑定系统
            this[`onClick_${i}`] = this.activateLevel.bind(this);
        }
        super.onLoad();
        this.local = this.viewList.get('local');
    }

    initData(i: number) {
        let curMap: Node = null;
        this.node.children.forEach(item => {
            let idx = i % 8;
            if (idx == 0) idx = 8;
            item.active = item.name == `map${idx}`;
            if (item.active) {
                curMap = item;
            }
        });
        let lv = App.gameLogic.curLevel;
        this.index = i;
        for (let m = 1; m < 9; m++) {
            let item = curMap.getChildByName(`${m}`);
            let idx = (i - 1) * 8 + m;
            CocosHelper.updateLabelText(item.getChildByName("lv"), (i - 1) * 8 + m);
            item.getComponent(Sprite).grayscale = idx > lv;
            this.handleStar(item, idx);
        }
    }

    handleStar(starNode: Node, idx: number) {
        let lv = App.gameLogic.curLevel;
        let starNum = +LevelConfig.getLevelStar(idx) || 0;
        let bool = idx <= lv && starNum > 0;
        for (let n = 1; n < 4; n++) {
            starNode.getChildByName(`star${n}`).active = bool;
        }
        if (bool) {
            for (let n = 1; n < 4; n++) {
                starNode.getChildByName(`star${n}`).getChildByName('s').active = n <= starNum;
            }
        }
        if (idx == lv) {
            let pos = this.node.getComponent(UITransform).convertToNodeSpaceAR(starNode.worldPosition);
            this.local.active = true;
            this.local.setPosition(v3(pos.x, pos.y + 60, 1));
            this.updateLocalAvatar();
        }
    }

    activateLevel(item: Node) {
        App.audio.play('ui_touch_feedback');
        let lv = App.gameLogic.curLevel;
        let idx = (this.index - 1) * 8 + +item.name;
        if (idx > lv) {
            App.view.showMsgTips("请先完成前面的关卡");
            return;
        }
        App.view.openView(ViewName.Single.eChallengeView, idx);
    }

    /** 更新地图标记头像 */
    updateLocalAvatar() {
        if (this.local && App.user && App.user.rankData) {
            CocosHelper.updateUserHeadSpriteAsync(this.local, App.user.rankData.icon);
        }
    }
}