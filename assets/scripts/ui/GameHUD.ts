import { Component, Node, Label, ProgressBar, Button, Sprite, tween, Vec3 } from 'cc';
import { BaseUIComponent, UIEventType } from './BaseUIComponent';
import { GameConfig } from '../core/GameConfig';

export interface HUDUpdateData {
    score?: number;
    moves?: number;
    targetScore?: number;
    levelNumber?: number;
    timeRemaining?: number;
    stars?: number;
    powerUps?: { [key: string]: number };
}

export class GameHUD extends BaseUIComponent {
    // UI 引用
    private _scoreLabel: Label | null = null;
    private _movesLabel: Label | null = null;
    private _targetScoreLabel: Label | null = null;
    private _levelLabel: Label | null = null;
    private _timeLabel: Label | null = null;
    private _progressBar: ProgressBar | null = null;
    private _starNodes: Node[] = [];
    private _powerUpButtons: Map<string, Button> = new Map();
    
    // 按钮引用
    private _pauseButton: Button | null = null;
    private _settingsButton: Button | null = null;
    private _hintButton: Button | null = null;
    
    // 当前数据
    private _currentData: HUDUpdateData = {};
    private _animationQueue: Array<() => Promise<void>> = [];
    private _isAnimating: boolean = false;

    protected onUILoad(): void {
        this.initializeUIReferences();
        this.setupButtonHandlers();
        this.initializeDisplay();
    }

    protected onUIEnable(): void {
        this.refreshDisplay();
    }

    protected onUIDisable(): void {
        this.clearAnimationQueue();
    }

    protected onUIDestroy(): void {
        this.cleanup();
    }

    protected onGameStateChanged(oldState: any, newState: any): void {
        const updateData: HUDUpdateData = {};
        
        if (newState.playerStats) {
            updateData.score = newState.playerStats.score;
            updateData.moves = newState.playerStats.movesRemaining;
            updateData.stars = newState.playerStats.stars;
            updateData.powerUps = newState.playerStats.powerUps;
        }
        
        if (newState.levelConfig) {
            updateData.targetScore = newState.levelConfig.targetScore;
            updateData.levelNumber = newState.levelConfig.levelNumber;
            updateData.timeRemaining = newState.levelConfig.timeLimit;
        }
        
        this.updateHUD(updateData);
    }

    protected onLevelStarted(levelData: any): void {
        const initialData: HUDUpdateData = {
            score: 0,
            moves: levelData.maxMoves,
            targetScore: levelData.targetScore,
            levelNumber: levelData.levelNumber,
            timeRemaining: levelData.timeLimit,
            stars: 0,
            powerUps: levelData.initialPowerUps || {}
        };
        
        this.updateHUD(initialData, true);
        this.playLevelStartAnimation();
    }

    protected onLevelCompleted(result: any): void {
        this.playLevelCompleteAnimation(result);
    }

    protected onLevelFailed(reason: any): void {
        this.playLevelFailedAnimation(reason);
    }

    private initializeUIReferences(): void {
        // 分数相关
        this._scoreLabel = this.validateNode('score_label')?.getComponent(Label) || null;
        this._targetScoreLabel = this.validateNode('target_score_label')?.getComponent(Label) || null;
        this._progressBar = this.validateNode('progress_bar')?.getComponent(ProgressBar) || null;
        
        // 步数和时间
        this._movesLabel = this.validateNode('moves_label')?.getComponent(Label) || null;
        this._timeLabel = this.validateNode('time_label')?.getComponent(Label) || null;
        
        // 关卡信息
        this._levelLabel = this.validateNode('level_label')?.getComponent(Label) || null;
        
        // 星星显示
        const starsContainer = this.validateNode('stars_container');
        if (starsContainer) {
            for (let i = 0; i < 3; i++) {
                const starNode = starsContainer.getChildByName(`star_${i}`);
                if (starNode) {
                    this._starNodes.push(starNode);
                }
            }
        }
        
        // 道具按钮
        const powerUpsContainer = this.validateNode('powerups_container');
        if (powerUpsContainer) {
            const powerUpTypes = ['hammer', 'bomb', 'rainbow', 'shuffle'];
            powerUpTypes.forEach(type => {
                const buttonNode = powerUpsContainer.getChildByName(`${type}_button`);
                if (buttonNode) {
                    const button = buttonNode.getComponent(Button);
                    if (button) {
                        this._powerUpButtons.set(type, button);
                    }
                }
            });
        }
        
        // 功能按钮
        this._pauseButton = this.validateNode('pause_button')?.getComponent(Button) || null;
        this._settingsButton = this.validateNode('settings_button')?.getComponent(Button) || null;
        this._hintButton = this.validateNode('hint_button')?.getComponent(Button) || null;
    }

    private setupButtonHandlers(): void {
        // 功能按钮
        if (this._pauseButton) {
            this._pauseButton.node.on(Button.EventType.CLICK, this.onPauseClicked, this);
        }
        
        if (this._settingsButton) {
            this._settingsButton.node.on(Button.EventType.CLICK, this.onSettingsClicked, this);
        }
        
        if (this._hintButton) {
            this._hintButton.node.on(Button.EventType.CLICK, this.onHintClicked, this);
        }
        
        // 道具按钮
        this._powerUpButtons.forEach((button, type) => {
            button.node.on(Button.EventType.CLICK, () => this.onPowerUpClicked(type), this);
        });
    }

    private initializeDisplay(): void {
        // 初始化显示状态
        this.safeNodeOperation(this._scoreLabel?.node, (node) => {
            this._scoreLabel!.string = '0';
        });
        
        this.safeNodeOperation(this._movesLabel?.node, (node) => {
            this._movesLabel!.string = '0';
        });
        
        this.safeNodeOperation(this._progressBar?.node, (node) => {
            this._progressBar!.progress = 0;
        });
        
        // 初始化星星状态
        this._starNodes.forEach(star => {
            star.active = false;
        });
        
        // 初始化道具按钮状态
        this.updatePowerUpButtons({});
    }

    public updateHUD(data: HUDUpdateData, immediate: boolean = false): void {
        if (!data || Object.keys(data).length === 0) return;
        
        this._currentData = { ...this._currentData, ...data };
        
        if (immediate) {
            this.applyUpdatesImmediately(data);
        } else {
            this.queueAnimatedUpdates(data);
        }
    }

    private applyUpdatesImmediately(data: HUDUpdateData): void {
        if (data.score !== undefined) {
            this.updateScore(data.score, false);
        }
        
        if (data.moves !== undefined) {
            this.updateMoves(data.moves, false);
        }
        
        if (data.targetScore !== undefined) {
            this.updateTargetScore(data.targetScore);
        }
        
        if (data.levelNumber !== undefined) {
            this.updateLevelNumber(data.levelNumber);
        }
        
        if (data.timeRemaining !== undefined) {
            this.updateTime(data.timeRemaining);
        }
        
        if (data.stars !== undefined) {
            this.updateStars(data.stars, false);
        }
        
        if (data.powerUps !== undefined) {
            this.updatePowerUpButtons(data.powerUps);
        }
        
        this.updateProgress();
    }

    private queueAnimatedUpdates(data: HUDUpdateData): void {
        const animations: Array<() => Promise<void>> = [];
        
        if (data.score !== undefined && data.score !== this._currentData.score) {
            animations.push(() => this.updateScore(data.score!, true));
        }
        
        if (data.moves !== undefined && data.moves !== this._currentData.moves) {
            animations.push(() => this.updateMoves(data.moves!, true));
        }
        
        if (data.stars !== undefined && data.stars !== this._currentData.stars) {
            animations.push(() => this.updateStars(data.stars!, true));
        }
        
        if (animations.length > 0) {
            this._animationQueue.push(...animations);
            this.processAnimationQueue();
        }
        
        // 非动画更新
        if (data.targetScore !== undefined) {
            this.updateTargetScore(data.targetScore);
        }
        
        if (data.levelNumber !== undefined) {
            this.updateLevelNumber(data.levelNumber);
        }
        
        if (data.timeRemaining !== undefined) {
            this.updateTime(data.timeRemaining);
        }
        
        if (data.powerUps !== undefined) {
            this.updatePowerUpButtons(data.powerUps);
        }
    }

    private async processAnimationQueue(): Promise<void> {
        if (this._isAnimating || this._animationQueue.length === 0) return;
        
        this._isAnimating = true;
        
        while (this._animationQueue.length > 0) {
            const animation = this._animationQueue.shift();
            if (animation) {
                await animation();
            }
        }
        
        this._isAnimating = false;
        this.updateProgress();
    }

    private async updateScore(score: number, animated: boolean): Promise<void> {
        if (!this._scoreLabel) return;
        
        if (animated) {
            await this.animateNumberChange(this._scoreLabel, score, 1.0);
        } else {
            this._scoreLabel.string = this.formatNumber(score);
        }
    }

    private async updateMoves(moves: number, animated: boolean): Promise<void> {
        if (!this._movesLabel) return;
        
        if (animated) {
            await this.animateNumberChange(this._movesLabel, moves, 0.5);
            
            // 步数不足警告
            if (moves <= GameConfig.UI.LOW_MOVES_WARNING) {
                this.playLowMovesWarning();
            }
        } else {
            this._movesLabel.string = moves.toString();
        }
    }

    private updateTargetScore(targetScore: number): void {
        if (this._targetScoreLabel) {
            this._targetScoreLabel.string = this.formatNumber(targetScore);
        }
    }

    private updateLevelNumber(levelNumber: number): void {
        if (this._levelLabel) {
            this._levelLabel.string = `第 ${levelNumber} 关`;
        }
    }

    private updateTime(timeRemaining: number): void {
        if (!this._timeLabel) return;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        this._timeLabel.string = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 时间不足警告
        if (timeRemaining <= GameConfig.UI.LOW_TIME_WARNING) {
            this.playLowTimeWarning();
        }
    }

    private async updateStars(stars: number, animated: boolean): Promise<void> {
        const promises: Promise<void>[] = [];
        
        for (let i = 0; i < this._starNodes.length; i++) {
            const star = this._starNodes[i];
            const shouldShow = i < stars;
            
            if (shouldShow && !star.active) {
                if (animated) {
                    promises.push(this.playStarAnimation(star, i * 0.2));
                } else {
                    star.active = true;
                }
            } else if (!shouldShow && star.active) {
                star.active = false;
            }
        }
        
        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }

    private updatePowerUpButtons(powerUps: { [key: string]: number }): void {
        this._powerUpButtons.forEach((button, type) => {
            const count = powerUps[type] || 0;
            const countLabel = button.node.getChildByName('count_label')?.getComponent(Label);
            
            if (countLabel) {
                countLabel.string = count.toString();
            }
            
            // 更新按钮可用状态
            button.interactable = count > 0;
            
            // 更新视觉状态
            const sprite = button.getComponent(Sprite);
            if (sprite) {
                sprite.grayscale = count === 0;
            }
        });
    }

    private updateProgress(): void {
        if (!this._progressBar || this._currentData.score === undefined || this._currentData.targetScore === undefined) {
            return;
        }
        
        const progress = Math.min(1.0, this._currentData.score / this._currentData.targetScore);
        
        tween(this._progressBar)
            .to(0.5, { progress })
            .start();
    }

    private async animateNumberChange(label: Label, targetValue: number, duration: number): Promise<void> {
        return new Promise((resolve) => {
            const startValue = parseInt(label.string) || 0;
            const valueChange = targetValue - startValue;
            
            tween({ value: startValue })
                .to(duration, { value: targetValue }, {
                    onUpdate: (target: any) => {
                        label.string = this.formatNumber(Math.round(target.value));
                    }
                })
                .call(() => {
                    // 数字变化特效
                    this.playNumberChangeEffect(label.node);
                    resolve();
                })
                .start();
        });
    }

    private async playStarAnimation(star: Node, delay: number): Promise<void> {
        return new Promise((resolve) => {
            star.active = true;
            star.setScale(Vec3.ZERO);
            
            tween(star)
                .delay(delay)
                .to(0.3, { scale: new Vec3(1.2, 1.2, 1) })
                .to(0.2, { scale: Vec3.ONE })
                .call(() => resolve())
                .start();
        });
    }

    private playNumberChangeEffect(node: Node): void {
        // 数字跳跃效果
        tween(node)
            .to(0.1, { scale: new Vec3(1.1, 1.1, 1) })
            .to(0.1, { scale: Vec3.ONE })
            .start();
    }

    private playLowMovesWarning(): void {
        if (this._movesLabel) {
            tween(this._movesLabel.node)
                .to(0.2, { scale: new Vec3(1.2, 1.2, 1) })
                .to(0.2, { scale: Vec3.ONE })
                .union()
                .repeat(3)
                .start();
        }
    }

    private playLowTimeWarning(): void {
        if (this._timeLabel) {
            const originalColor = this._timeLabel.color;
            
            tween(this._timeLabel)
                .to(0.5, { color: GameConfig.UI.WARNING_COLOR })
                .to(0.5, { color: originalColor })
                .union()
                .repeat(2)
                .start();
        }
    }

    private async playLevelStartAnimation(): Promise<void> {
        // 关卡开始动画
        const hudElements = [
            this._scoreLabel?.node,
            this._movesLabel?.node,
            this._levelLabel?.node,
            this._progressBar?.node
        ].filter(Boolean);
        
        const promises = hudElements.map((element, index) => {
            if (!element) return Promise.resolve();
            
            element.setScale(Vec3.ZERO);
            
            return new Promise<void>((resolve) => {
                tween(element)
                    .delay(index * 0.1)
                    .to(0.4, { scale: Vec3.ONE }, { easing: 'backOut' })
                    .call(() => resolve())
                    .start();
            });
        });
        
        await Promise.all(promises);
    }

    private async playLevelCompleteAnimation(result: any): Promise<void> {
        // 完成动画逻辑
        const finalStars = result.stars || 0;
        await this.updateStars(finalStars, true);
        
        // HUD庆祝效果
        const hudElements = [this._scoreLabel?.node, this._levelLabel?.node].filter(Boolean);
        
        hudElements.forEach(element => {
            if (element) {
                tween(element)
                    .to(0.2, { scale: new Vec3(1.2, 1.2, 1) })
                    .to(0.3, { scale: Vec3.ONE })
                    .start();
            }
        });
    }

    private playLevelFailedAnimation(reason: any): void {
        // 失败动画逻辑
        if (this._movesLabel && reason === 'no_moves') {
            tween(this._movesLabel.node)
                .to(0.1, { scale: new Vec3(1.3, 1.3, 1) })
                .to(0.2, { scale: Vec3.ONE })
                .union()
                .repeat(2)
                .start();
        }
    }

    private onPauseClicked(): void {
        this.emit(UIEventType.PAUSE_REQUESTED, {});
    }

    private onSettingsClicked(): void {
        this.emit(UIEventType.SETTINGS_OPENED, {});
    }

    private onHintClicked(): void {
        // 提示逻辑
        this.emit(UIEventType.SPECIAL_EFFECT_TRIGGER, {
            effectType: 'hint',
            timestamp: Date.now()
        });
    }

    private onPowerUpClicked(type: string): void {
        const count = this._currentData.powerUps?.[type] || 0;
        if (count > 0) {
            this.emit(UIEventType.POWER_UP_ACTIVATED, {
                powerUpType: type,
                remainingCount: count - 1
            });
        }
    }

    private formatNumber(num: number): string {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    private clearAnimationQueue(): void {
        this._animationQueue.length = 0;
        this._isAnimating = false;
    }

    private refreshDisplay(): void {
        this.applyUpdatesImmediately(this._currentData);
    }

    private cleanup(): void {
        this.clearAnimationQueue();
        
        // 清理按钮监听
        if (this._pauseButton) {
            this._pauseButton.node.off(Button.EventType.CLICK, this.onPauseClicked, this);
        }
        
        if (this._settingsButton) {
            this._settingsButton.node.off(Button.EventType.CLICK, this.onSettingsClicked, this);
        }
        
        if (this._hintButton) {
            this._hintButton.node.off(Button.EventType.CLICK, this.onHintClicked, this);
        }
        
        this._powerUpButtons.forEach((button, type) => {
            button.node.off(Button.EventType.CLICK);
        });
    }

    public getCurrentData(): HUDUpdateData {
        return { ...this._currentData };
    }

    public isAnimating(): boolean {
        return this._isAnimating;
    }
}