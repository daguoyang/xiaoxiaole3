import { _decorator, Component, Node } from 'cc';
import { BaseViewCmpt } from '../base/baseViewCmpt';
const { ccclass, property } = _decorator;

@ccclass('startCmpt')
export class startCmpt extends BaseViewCmpt {
    start() {
        // Fallback: ensure new platform modules initialized
        (async () => {
            try {
                const bridge = await import('../../scripts/bridge/NewAppBridge');
                await bridge.initNewApp();
            } catch (e) {
                // ignore if not present in this scene flow
            }
        })();
    }

    update(deltaTime: number) {

    }
}


