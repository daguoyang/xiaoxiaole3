import { Node, ParticleSystem, Vec3 } from 'cc';
import { AnimationScheduler } from '../core/AnimationScheduler';
import { AudioSystem, SoundEffect } from './AudioSystem';
import { ElementType, Position } from '../models/GameTypes';

export interface EffectData {
    type: string;
    position: Position;
    elementType?: ElementType;
    power?: number;
    duration?: number;
    data?: any;
}

export class EffectProcessor {
    private static _instance: EffectProcessor | null = null;
    private _animationScheduler: AnimationScheduler;
    private _audioSystem: AudioSystem;
    private _particlePools: Map<string, ParticleSystem[]> = new Map();
    private _effectQueue: EffectData[] = [];
    private _processing: boolean = false;

    private constructor() {
        this._animationScheduler = AnimationScheduler.getInstance();
        this._audioSystem = AudioSystem.getInstance();
    }

    public static getInstance(): EffectProcessor {
        if (!EffectProcessor._instance) {
            EffectProcessor._instance = new EffectProcessor();
        }
        return EffectProcessor._instance;
    }

    public async processEffect(effectData: EffectData): Promise<void> {
        this._effectQueue.push(effectData);
        
        if (!this._processing) {
            this._processing = true;
            await this.processEffectQueue();
            this._processing = false;
        }
    }

    public async processMatches(matches: any[]): Promise<void> {
        for (const match of matches) {
            await this.processEffect({
                type: 'match_elimination',
                position: match.position || { x: 0, y: 0 },
                elementType: match.elementType,
                data: { matchLength: match.cells?.length || 3 }
            });
        }
    }

    private async processEffectQueue(): Promise<void> {
        while (this._effectQueue.length > 0) {
            const effect = this._effectQueue.shift()!;
            await this.executeEffect(effect);
        }
    }

    private async executeEffect(effect: EffectData): Promise<void> {
        switch (effect.type) {
            case 'match_elimination':
                await this.playMatchElimination(effect);
                break;
            case 'special_activation':
                await this.playSpecialActivation(effect);
                break;
            case 'combo_effect':
                await this.playComboEffect(effect);
                break;
            case 'level_complete':
                await this.playLevelComplete();
                break;
            default:
                console.warn(`Unknown effect type: ${effect.type}`);
        }
    }

    private async playMatchElimination(effect: EffectData): Promise<void> {
        // 播放音效
        if (effect.data?.matchLength) {
            this._audioSystem.playMatchSound(effect.data.matchLength);
        }

        // 播放动画和粒子效果
        console.log(`🎬 Playing match elimination effect at (${effect.position.x}, ${effect.position.y})`);
    }

    private async playSpecialActivation(effect: EffectData): Promise<void> {
        this._audioSystem.playSFX(SoundEffect.SPECIAL_MATCH);
        console.log(`🎆 Playing special activation effect`);
    }

    private async playComboEffect(effect: EffectData): Promise<void> {
        const comboLevel = effect.data?.comboLevel || 1;
        console.log(`⚡ Playing combo effect (level ${comboLevel})`);
    }

    private async playLevelComplete(): Promise<void> {
        this._audioSystem.playSFX(SoundEffect.LEVEL_COMPLETE);
        console.log(`🎉 Playing level complete effect`);
    }

    public dispose(): void {
        this._effectQueue = [];
        this._particlePools.clear();
        EffectProcessor._instance = null;
    }
}