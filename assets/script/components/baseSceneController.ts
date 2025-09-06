import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 基础场景控制器 - 简化版本，避免复杂依赖
 */
@ccclass('BaseSceneController')
export class BaseSceneController extends Component {
    protected viewList: Map<string, Node> = new Map();
    protected isSceneInitialized: boolean = false;

    async initialize(...args: any[]): Promise<void> {
        this.isSceneInitialized = true;
        // 简化的初始化
    }

    destroy(): void {
        super.destroy();
    }

    // 可选的动画方法
    async playEnterAnimation?(): Promise<void> {
        // 子类可以实现
    }

    async playExitAnimation?(): Promise<void> {
        // 子类可以实现
    }
}