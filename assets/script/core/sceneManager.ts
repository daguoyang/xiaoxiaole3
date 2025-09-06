import { Node, Prefab, instantiate } from 'cc';
import { BaseSystem } from './baseSystem';
import { ResLoadHelper } from '../utils/resLoadHelper';
import { BaseSceneController } from '../components/baseSceneController';

/**
 * 场景管理器 - 全新的场景管理系统
 */
export class SceneManager extends BaseSystem {
    private canvas: Node = null;
    private activeScenes: Map<string, SceneInfo> = new Map();
    private sceneStack: string[] = [];
    private loadedPrefabs: Map<string, Prefab> = new Map();
    private transitionInProgress: boolean = false;

    protected async onInitialize(): Promise<void> {
        // 简化初始化，避免engine依赖
        console.log('SceneManager system initialized');
    }

    protected async onDestroy(): Promise<void> {
        await this.closeAllScenes();
        this.loadedPrefabs.clear();
    }

    /**
     * 打开场景
     */
    async openScene(sceneName: string, ...args: any[]): Promise<BaseSceneController | null> {
        if (this.transitionInProgress) {
            console.warn('Scene transition already in progress');
            return null;
        }

        try {
            this.transitionInProgress = true;

            // 检查是否已经打开
            if (this.activeScenes.has(sceneName)) {
                console.warn(`Scene ${sceneName} is already open`);
                return this.activeScenes.get(sceneName)?.controller || null;
            }

            // 加载预制体
            let prefab = this.loadedPrefabs.get(sceneName);
            if (!prefab) {
                prefab = await ResLoadHelper.loadCommonAssetSync(sceneName, Prefab);
                this.loadedPrefabs.set(sceneName, prefab);
            }

            // 实例化场景
            const sceneNode = instantiate(prefab);
            const controller = sceneNode.getComponent(BaseSceneController);
            
            if (!controller) {
                console.error(`Scene ${sceneName} does not have BaseSceneController component`);
                sceneNode.destroy();
                return null;
            }

            // 添加到场景栈
            this.sceneStack.push(sceneName);
            
            // 设置场景信息
            const sceneInfo: SceneInfo = {
                node: sceneNode,
                controller,
                name: sceneName,
                isModal: this.isModalScene(sceneName),
                zIndex: this.sceneStack.length
            };

            this.activeScenes.set(sceneName, sceneInfo);

            // 添加到画布
            this.canvas.addChild(sceneNode);
            sceneNode.setSiblingIndex(sceneInfo.zIndex);

            // 初始化场景
            await controller.initialize(...args);

            // 场景进入动画
            await this.playSceneEnterAnimation(sceneInfo);

            console.log(`Scene ${sceneName} opened successfully`);
            return controller;

        } catch (error) {
            console.error(`Failed to open scene ${sceneName}:`, error);
            return null;
        } finally {
            this.transitionInProgress = false;
        }
    }

    /**
     * 关闭场景
     */
    async closeScene(sceneName: string): Promise<boolean> {
        const sceneInfo = this.activeScenes.get(sceneName);
        if (!sceneInfo) {
            console.warn(`Scene ${sceneName} is not open`);
            return false;
        }

        try {
            // 场景退出动画
            await this.playSceneExitAnimation(sceneInfo);

            // 销毁场景
            await sceneInfo.controller.destroy();
            sceneInfo.node.destroy();

            // 从栈中移除
            const index = this.sceneStack.indexOf(sceneName);
            if (index !== -1) {
                this.sceneStack.splice(index, 1);
            }

            // 从活跃场景中移除
            this.activeScenes.delete(sceneName);

            console.log(`Scene ${sceneName} closed successfully`);
            return true;

        } catch (error) {
            console.error(`Failed to close scene ${sceneName}:`, error);
            return false;
        }
    }

    /**
     * 关闭所有场景
     */
    async closeAllScenes(): Promise<void> {
        const sceneNames = Array.from(this.activeScenes.keys());
        
        for (const sceneName of sceneNames) {
            await this.closeScene(sceneName);
        }

        this.sceneStack = [];
    }

    /**
     * 切换场景 (关闭当前，打开新场景)
     */
    async switchScene(sceneName: string, ...args: any[]): Promise<BaseSceneController | null> {
        // 关闭当前顶层场景
        if (this.sceneStack.length > 0) {
            const currentScene = this.sceneStack[this.sceneStack.length - 1];
            await this.closeScene(currentScene);
        }

        // 打开新场景
        return await this.openScene(sceneName, ...args);
    }

    /**
     * 返回上一个场景
     */
    async goBack(): Promise<boolean> {
        if (this.sceneStack.length <= 1) {
            console.warn('No previous scene to go back to');
            return false;
        }

        const currentScene = this.sceneStack.pop();
        if (currentScene) {
            return await this.closeScene(currentScene);
        }

        return false;
    }

    /**
     * 获取场景控制器
     */
    getSceneController(sceneName: string): BaseSceneController | null {
        return this.activeScenes.get(sceneName)?.controller || null;
    }

    /**
     * 获取当前顶层场景
     */
    getCurrentScene(): BaseSceneController | null {
        if (this.sceneStack.length === 0) return null;
        
        const currentSceneName = this.sceneStack[this.sceneStack.length - 1];
        return this.getSceneController(currentSceneName);
    }

    /**
     * 检查场景是否打开
     */
    isSceneOpen(sceneName: string): boolean {
        return this.activeScenes.has(sceneName);
    }

    /**
     * 获取所有打开的场景
     */
    getOpenScenes(): string[] {
        return Array.from(this.activeScenes.keys());
    }

    /**
     * 预加载场景
     */
    async preloadScene(sceneName: string): Promise<boolean> {
        if (this.loadedPrefabs.has(sceneName)) {
            return true;
        }

        try {
            const prefab = await ResLoadHelper.loadCommonAssetSync(sceneName, Prefab);
            this.loadedPrefabs.set(sceneName, prefab);
            console.log(`Scene ${sceneName} preloaded successfully`);
            return true;
        } catch (error) {
            console.error(`Failed to preload scene ${sceneName}:`, error);
            return false;
        }
    }

    /**
     * 显示消息提示
     */
    showMessage(message: string, duration: number = 2000): void {
        // 简化的消息显示
        console.log('Message:', message);
    }

    /**
     * 判断是否为模态场景
     */
    private isModalScene(sceneName: string): boolean {
        // 可以根据场景名称或配置判断是否为模态场景
        const modalScenes = ['settingScene', 'pauseScene', 'buyScene', 'alertScene'];
        return modalScenes.some(modal => sceneName.includes(modal));
    }

    /**
     * 播放场景进入动画
     */
    private async playSceneEnterAnimation(sceneInfo: SceneInfo): Promise<void> {
        // 可以在这里添加场景进入动画逻辑
        if (sceneInfo.controller.playEnterAnimation) {
            await sceneInfo.controller.playEnterAnimation();
        }
    }

    /**
     * 播放场景退出动画
     */
    private async playSceneExitAnimation(sceneInfo: SceneInfo): Promise<void> {
        // 可以在这里添加场景退出动画逻辑
        if (sceneInfo.controller.playExitAnimation) {
            await sceneInfo.controller.playExitAnimation();
        }
    }
}

/**
 * 场景信息
 */
interface SceneInfo {
    node: Node;
    controller: BaseSceneController;
    name: string;
    isModal: boolean;
    zIndex: number;
}