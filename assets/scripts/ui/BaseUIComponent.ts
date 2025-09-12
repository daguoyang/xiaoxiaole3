import { Component, EventTarget, Node, _decorator } from 'cc';
import { GameStateManager } from '../core/GameStateManager';
import { AnimationScheduler } from '../core/AnimationScheduler';
import { AssetManager } from '../core/AssetManager';

const { ccclass } = _decorator;

export enum UIEventType {
    ELEMENT_SELECTED = 'element_selected',
    ELEMENT_SWAP_REQUEST = 'element_swap_request',
    SPECIAL_EFFECT_TRIGGER = 'special_effect_trigger',
    POWER_UP_ACTIVATED = 'power_up_activated',
    PAUSE_REQUESTED = 'pause_requested',
    SETTINGS_OPENED = 'settings_opened'
}

export interface UIEventData {
    type: UIEventType;
    data?: any;
    timestamp: number;
    source?: string;
}

@ccclass('BaseUIComponent')
export abstract class BaseUIComponent extends Component {
    protected gameState: GameStateManager;
    protected animationScheduler: AnimationScheduler;
    protected assetManager: AssetManager;
    protected eventBus: EventTarget;
    protected isInitialized: boolean = false;
    
    private subscriptions: Map<string, Function> = new Map();

    protected onLoad(): void {
        this.initializeDependencies();
        this.setupEventListeners();
        this.onUILoad();
    }

    protected onEnable(): void {
        if (this.isInitialized) {
            this.onUIEnable();
        }
    }

    protected onDisable(): void {
        this.onUIDisable();
    }

    protected onDestroy(): void {
        this.cleanup();
        this.onUIDestroy();
    }

    private initializeDependencies(): void {
        this.gameState = GameStateManager.getInstance();
        this.animationScheduler = AnimationScheduler.getInstance();
        this.assetManager = AssetManager.getInstance();
        this.eventBus = new EventTarget();
        this.isInitialized = true;
    }

    private setupEventListeners(): void {
        this.gameState.getEventTarget().on('state_changed', this.onGameStateChanged, this);
        this.gameState.getEventTarget().on('level_started', this.onLevelStarted, this);
        this.gameState.getEventTarget().on('level_completed', this.onLevelCompleted, this);
        this.gameState.getEventTarget().on('level_failed', this.onLevelFailed, this);
    }

    private cleanup(): void {
        this.subscriptions.forEach((callback, event) => {
            this.eventBus.off(event, callback);
        });
        this.subscriptions.clear();
        
        this.gameState.getEventTarget().off('state_changed', this.onGameStateChanged, this);
        this.gameState.getEventTarget().off('level_started', this.onLevelStarted, this);
        this.gameState.getEventTarget().off('level_completed', this.onLevelCompleted, this);
        this.gameState.getEventTarget().off('level_failed', this.onLevelFailed, this);
    }

    protected subscribe(event: string, callback: Function): void {
        this.eventBus.on(event, callback, this);
        this.subscriptions.set(event, callback);
    }

    protected unsubscribe(event: string): void {
        const callback = this.subscriptions.get(event);
        if (callback) {
            this.eventBus.off(event, callback);
            this.subscriptions.delete(event);
        }
    }

    protected emit(eventType: UIEventType, data?: any): void {
        const eventData: UIEventData = {
            type: eventType,
            data,
            timestamp: Date.now(),
            source: this.node.name
        };
        
        this.eventBus.emit(eventType, eventData);
        this.gameState.getEventTarget().emit('ui_event', eventData);
    }

    protected async loadAsset<T>(path: string, type: any): Promise<T | null> {
        try {
            return await this.assetManager.loadAsset<T>(path, type);
        } catch (error) {
            console.error(`Failed to load asset: ${path}`, error);
            return null;
        }
    }

    protected async preloadAssets(paths: string[]): Promise<void> {
        try {
            await this.assetManager.preloadAssets(paths);
        } catch (error) {
            console.error('Failed to preload assets', error);
        }
    }

    protected scheduleAnimation(
        animationType: string,
        target: Node,
        data: any,
        priority: number = 50
    ): Promise<void> {
        return this.animationScheduler.scheduleAnimation(animationType, target, data, priority);
    }

    protected onGameStateChanged(oldState: any, newState: any): void {
        // Override in subclasses
    }

    protected onLevelStarted(levelData: any): void {
        // Override in subclasses
    }

    protected onLevelCompleted(result: any): void {
        // Override in subclasses
    }

    protected onLevelFailed(reason: any): void {
        // Override in subclasses
    }

    protected abstract onUILoad(): void;
    protected abstract onUIEnable(): void;
    protected abstract onUIDisable(): void;
    protected abstract onUIDestroy(): void;

    protected validateNode(nodeName: string): Node | null {
        const node = this.node.getChildByName(nodeName);
        if (!node) {
            console.warn(`UI component missing required child node: ${nodeName}`);
        }
        return node;
    }

    protected safeNodeOperation<T>(
        node: Node | null,
        operation: (node: Node) => T,
        fallback?: T
    ): T | undefined {
        if (node) {
            try {
                return operation(node);
            } catch (error) {
                console.error('Node operation failed', error);
            }
        }
        return fallback;
    }

    protected updateVisibility(visible: boolean, animated: boolean = false): void {
        if (animated) {
            const targetOpacity = visible ? 255 : 0;
            this.scheduleAnimation('fade', this.node, { 
                targetOpacity, 
                duration: 0.3 
            });
        } else {
            this.node.active = visible;
        }
    }

    protected getScreenSafeArea(): { x: number, y: number, width: number, height: number } {
        // 获取安全区域，适配不同设备
        const canvas = this.node.scene?.getChildByName('Canvas');
        if (canvas) {
            const canvasComponent = canvas.getComponent('cc.Canvas');
            if (canvasComponent) {
                return {
                    x: 0,
                    y: 0,
                    width: canvasComponent.designResolution.width,
                    height: canvasComponent.designResolution.height
                };
            }
        }
        
        return { x: 0, y: 0, width: 1080, height: 1920 }; // 默认设计分辨率
    }
}