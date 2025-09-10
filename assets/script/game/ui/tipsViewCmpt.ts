import { _decorator, Component, Node, tween, Vec3 } from 'cc';
import { BaseNodeCmpt } from '../../base/baseNodeCmpt';
import { BaseViewCmpt } from '../../base/baseViewCmpt';
import { CocosHelper } from '../../helpers/cocosHelper';
import { ToolsHelper } from '../../helpers/toolsHelper';
const { ccclass, property } = _decorator;

@ccclass('tipsViewCmpt')
export class NotificationWidget extends BaseViewCmpt {
    private originalLabelPos: Vec3 = null; // 保存原始文字位置

    onLoad() {
        super.onLoad();
        // 保存文字标签的原始位置
        const label = this.viewList.get('animNode/lb');
        if (label) {
            this.originalLabelPos = label.position.clone();
        }
    }

    setTips(str: string) {
        const label = this.viewList.get('animNode/lb');
        CocosHelper.updateLabelText(label, str, false);
        
        if (label) {
            // 先重置到原始位置
            if (this.originalLabelPos) {
                label.setPosition(this.originalLabelPos);
            }
            
            // 检查是否是体力相关的提示，如果是则向下偏移到牌子区域
            if (str.includes('+') || str.includes('体力') || str.includes('心') || str.includes('获得')) {
                const currentPos = label.position;
                // 向下偏移60像素，让文字显示在牌子区域而不是小猫身上
                label.setPosition(currentPos.x, currentPos.y - 60, currentPos.z);
                console.log(`💖 调整体力奖励文字位置: "${str}" 向下偏移60像素`);
            }
        }
    }

    async setCloseFunc(cb: Function) {
        await ToolsHelper.delayTime(2);
        tween(this.node).to(0.5, { position: new Vec3(0, 1000) }).call(() => {
            cb && cb();
        }).start()
    }

    upMove() {
        let pos = this.node.position;
        let v3p = new Vec3(pos.x, pos.y + 100, pos.z);
        this.node.setPosition(v3p);
    }

}


