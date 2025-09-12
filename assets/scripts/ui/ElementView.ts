import { Component, Node, Sprite, Vec3, tween, _decorator } from 'cc';
import { BaseUIComponent, UIEventType } from './BaseUIComponent';
import { ElementType, Position } from '../models/GameTypes';
import { GameConfig } from '../core/GameConfig';

const { ccclass, property } = _decorator;

export enum ElementState {
    IDLE = 'idle',
    SELECTED = 'selected',
    HIGHLIGHTED = 'highlighted',
    ELIMINATING = 'eliminating',
    FALLING = 'falling',
    SWAPPING = 'swapping',
    SPAWNING = 'spawning'
}

export interface ElementAnimationConfig {
    duration: number;
    easing?: string;
    delay?: number;
    scale?: Vec3;
    position?: Vec3;
    opacity?: number;
    rotation?: Vec3;
}

@ccclass('ElementView')
export class ElementView extends BaseUIComponent {
    @property({ type: Number, tooltip: 'Element Type' })
    public elementType: ElementType = ElementType.RED;
    
    @property({ type: String, tooltip: 'Element ID' })
    public elementId: string = '';
    
    @property({ type: Boolean, tooltip: 'Is Interactable' })
    public isInteractable: boolean = true;
    
    @property({ type: Boolean, tooltip: 'Enable Particles' })
    public enableParticles: boolean = true;
    
    private _gridPosition: Position = { x: 0, y: 0 };
    private _currentState: ElementState = ElementState.IDLE;
    private _isSelected: boolean = false;
    private _sprite: Sprite | null = null;
    private _glowEffect: Node | null = null;
    private _particleNode: Node | null = null;
    private _lastTouchTime: number = 0;
    
    private readonly DOUBLE_TAP_THRESHOLD = 300; // ms
    private readonly TOUCH_MOVE_THRESHOLD = 20; // pixels
    private _touchStartPos: Vec3 = new Vec3();
    private _isTouchMoving: boolean = false;

    protected onUILoad(): void {
        this.initializeComponents();
        this.setupInteractions();
        this.loadElementAssets();
    }

    protected onUIEnable(): void {
        this.refreshDisplay();
    }

    protected onUIDisable(): void {
        this.cancelAllAnimations();
    }

    protected onUIDestroy(): void {
        this.releaseAssets();
    }

    private initializeComponents(): void {
        this._sprite = this.node.getComponent(Sprite);
        if (!this._sprite) {
            this._sprite = this.node.addComponent(Sprite);
        }
        
        this._glowEffect = this.validateNode('glow_effect');
        this._particleNode = this.validateNode('particle_effect');
        
        // 设置初始状态
        this.node.setScale(Vec3.ONE);
        this.node.setPosition(Vec3.ZERO);
        this.node.angle = 0;
    }

    private setupInteractions(): void {
        if (!this.isInteractable) return;
        
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    private async loadElementAssets(): Promise<void> {
        const assetPath = `textures/elements/${ElementType[this.elementType].toLowerCase()}`;
        const spriteFrame = await this.loadAsset(assetPath, 'cc.SpriteFrame');
        
        if (spriteFrame && this._sprite) {
            this._sprite.spriteFrame = spriteFrame;
        }
        
        // 预加载特效资源
        if (this.enableParticles) {
            await this.preloadAssets([
                `effects/particles/eliminate_${ElementType[this.elementType].toLowerCase()}`,
                `effects/particles/selection_glow`
            ]);
        }
    }

    private onTouchStart(event: any): void {
        if (!this.isInteractable || this._currentState !== ElementState.IDLE) return;
        
        this._touchStartPos = event.getLocation();
        this._isTouchMoving = false;
        
        this.playTouchFeedback();
    }

    private onTouchMove(event: any): void {
        if (!this.isInteractable) return;
        
        const currentPos = event.getLocation();
        const distance = Vec3.distance(currentPos, this._touchStartPos);
        
        if (distance > this.TOUCH_MOVE_THRESHOLD) {
            this._isTouchMoving = true;
            this.handleSwipeDirection(currentPos);
        }
    }

    private onTouchEnd(event: any): void {
        if (!this.isInteractable) return;
        
        const currentTime = Date.now();
        const isDoubleTap = currentTime - this._lastTouchTime < this.DOUBLE_TAP_THRESHOLD;
        
        if (!this._isTouchMoving) {
            if (isDoubleTap) {
                this.handleDoubleTap();
            } else {
                this.handleSingleTap();
            }
        }
        
        this._lastTouchTime = currentTime;
        this.resetTouchState();
    }

    private onTouchCancel(): void {
        this.resetTouchState();
    }

    private handleSwipeDirection(currentPos: Vec3): void {
        const deltaX = currentPos.x - this._touchStartPos.x;
        const deltaY = currentPos.y - this._touchStartPos.y;
        
        let direction: 'up' | 'down' | 'left' | 'right';
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'up' : 'down';
        }
        
        this.requestSwap(direction);
    }

    private handleSingleTap(): void {
        this.toggleSelection();
    }

    private handleDoubleTap(): void {
        if (this.elementType >= ElementType.BOMB) {
            this.emit(UIEventType.SPECIAL_EFFECT_TRIGGER, {
                elementId: this.elementId,
                position: this._gridPosition,
                effectType: this.elementType
            });
        }
    }

    private requestSwap(direction: 'up' | 'down' | 'left' | 'right'): void {
        const targetPosition = { ...this._gridPosition };
        
        switch (direction) {
            case 'up': targetPosition.y -= 1; break;
            case 'down': targetPosition.y += 1; break;
            case 'left': targetPosition.x -= 1; break;
            case 'right': targetPosition.x += 1; break;
        }
        
        this.emit(UIEventType.ELEMENT_SWAP_REQUEST, {
            sourceId: this.elementId,
            sourcePosition: this._gridPosition,
            targetPosition: targetPosition,
            direction: direction
        });
    }

    private toggleSelection(): void {
        this.setSelected(!this._isSelected);
        
        this.emit(UIEventType.ELEMENT_SELECTED, {
            elementId: this.elementId,
            position: this._gridPosition,
            elementType: this.elementType,
            isSelected: this._isSelected
        });
    }

    private resetTouchState(): void {
        this._isTouchMoving = false;
        this._touchStartPos.set(Vec3.ZERO);
    }

    public setSelected(selected: boolean): void {
        if (this._isSelected === selected) return;
        
        this._isSelected = selected;
        this.setState(selected ? ElementState.SELECTED : ElementState.IDLE);
        this.updateSelectionVisuals();
    }

    public setState(state: ElementState): void {
        const oldState = this._currentState;
        this._currentState = state;
        
        this.onStateChanged(oldState, state);
    }

    public getState(): ElementState {
        return this._currentState;
    }

    public setGridPosition(position: Position): void {
        this._gridPosition = { ...position };
    }

    public getGridPosition(): Position {
        return { ...this._gridPosition };
    }

    public setElementType(type: ElementType): void {
        if (this.elementType !== type) {
            this.elementType = type;
            this.loadElementAssets();
        }
    }

    public async playEliminateAnimation(): Promise<void> {
        this.setState(ElementState.ELIMINATING);
        
        const config: ElementAnimationConfig = {
            duration: GameConfig.ANIMATION.ELEMENT_ELIMINATE_DURATION / 1000,
            scale: new Vec3(1.2, 1.2, 1),
            opacity: 0
        };
        
        await this.playAnimation('eliminate', config);
        
        if (this.enableParticles) {
            this.playParticleEffect('eliminate');
        }
    }

    public async playFallAnimation(targetWorldPos: Vec3, fallDistance: number): Promise<void> {
        this.setState(ElementState.FALLING);
        
        const duration = Math.min(0.8, Math.max(0.3, fallDistance * 0.1));
        const config: ElementAnimationConfig = {
            duration,
            position: targetWorldPos,
            easing: 'bounceOut'
        };
        
        await this.playAnimation('fall', config);
        this.setState(ElementState.IDLE);
    }

    public async playSwapAnimation(targetWorldPos: Vec3, isSuccess: boolean): Promise<void> {
        this.setState(ElementState.SWAPPING);
        
        const config: ElementAnimationConfig = {
            duration: GameConfig.ANIMATION.ELEMENT_SWAP_DURATION / 1000,
            position: targetWorldPos,
            easing: isSuccess ? 'quadOut' : 'quadInOut'
        };
        
        await this.playAnimation('swap', config);
        
        if (!isSuccess) {
            // 交换失败，播放回弹动画
            await this.playAnimation('bounce_back', {
                duration: 0.2,
                position: this.node.getPosition()
            });
        }
        
        this.setState(ElementState.IDLE);
    }

    public async playSpawnAnimation(): Promise<void> {
        this.setState(ElementState.SPAWNING);
        
        this.node.setScale(new Vec3(0, 0, 1));
        const uiOpacity = this.node.getComponent('cc.UIOpacity');
        if (uiOpacity) {
            uiOpacity.opacity = 0;
        }
        
        const config: ElementAnimationConfig = {
            duration: 0.5,
            scale: Vec3.ONE,
            opacity: 255,
            easing: 'backOut'
        };
        
        await this.playAnimation('spawn', config);
        this.setState(ElementState.IDLE);
    }

    private async playAnimation(animationType: string, config: ElementAnimationConfig): Promise<void> {
        return new Promise((resolve) => {
            const tweenTarget = tween(this.node);
            
            if (config.delay) {
                tweenTarget.delay(config.delay);
            }
            
            tweenTarget.to(config.duration, {
                scale: config.scale,
                position: config.position,
                eulerAngles: config.rotation
            });
            
            if (config.opacity !== undefined) {
                // 透明度通过UIOpacity组件设置
                tweenTarget.call(() => {
                    const uiOpacity = this.node.getComponent('cc.UIOpacity');
                    if (uiOpacity) {
                        uiOpacity.opacity = config.opacity!;
                    }
                });
            }
            
            if (config.easing) {
                tweenTarget.easing(config.easing as any);
            }
            
            tweenTarget.call(() => resolve()).start();
        });
    }

    private onStateChanged(oldState: ElementState, newState: ElementState): void {
        this.updateStateVisuals(newState);
        
        // 状态改变时的特效
        switch (newState) {
            case ElementState.SELECTED:
                this.playSelectionEffect();
                break;
            case ElementState.HIGHLIGHTED:
                this.playHighlightEffect();
                break;
        }
    }

    private updateSelectionVisuals(): void {
        if (this._glowEffect) {
            this._glowEffect.active = this._isSelected;
            
            if (this._isSelected) {
                tween(this._glowEffect)
                    .to(0.5, { scale: new Vec3(1.1, 1.1, 1) })
                    .to(0.5, { scale: Vec3.ONE })
                    .union()
                    .repeatForever()
                    .start();
            } else {
                // 停止所有动画
                this._glowEffect.setScale(Vec3.ONE);
            }
        }
    }

    private updateStateVisuals(state: ElementState): void {
        switch (state) {
            case ElementState.IDLE:
                this.node.setScale(Vec3.ONE);
                break;
            case ElementState.HIGHLIGHTED:
                tween(this.node)
                    .to(0.1, { scale: new Vec3(1.05, 1.05, 1) })
                    .start();
                break;
        }
    }

    private playTouchFeedback(): void {
        tween(this.node)
            .to(0.1, { scale: new Vec3(0.95, 0.95, 1) })
            .to(0.1, { scale: Vec3.ONE })
            .start();
    }

    private playSelectionEffect(): void {
        // 播放选中特效
    }

    private playHighlightEffect(): void {
        // 播放高亮特效
    }

    private playParticleEffect(effectType: string): void {
        if (!this._particleNode || !this.enableParticles) return;
        
        // 播放粒子特效
    }

    private cancelAllAnimations(): void {
        // 取消所有动画，新版Cocos Creator使用不同的API
        // this.node.stopAllActions();
        if (this._glowEffect) {
            // 重置到默认状态
            this._glowEffect.setScale(Vec3.ONE);
        }
    }

    private refreshDisplay(): void {
        this.loadElementAssets();
        this.updateSelectionVisuals();
        this.updateStateVisuals(this._currentState);
    }

    private releaseAssets(): void {
        this.cancelAllAnimations();
    }

    public getEventTarget(): any {
        // 返回节点的事件目标，用于其他组件监听事件
        return this.node;
    }
}