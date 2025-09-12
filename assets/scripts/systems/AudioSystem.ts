import { AudioSource, AudioClip, Node, director } from 'cc';
import { AssetManager } from '../core/AssetManager';
import { GameConfig } from '../core/GameConfig';

export enum AudioType {
    MUSIC = 'music',
    SFX = 'sfx',
    UI = 'ui',
    AMBIENT = 'ambient'
}

export enum MusicTrack {
    MENU = 'menu',
    GAME = 'game',
    VICTORY = 'victory',
    DEFEAT = 'defeat'
}

export enum SoundEffect {
    // 元素交互
    ELEMENT_SELECT = 'element_select',
    ELEMENT_SWAP = 'element_swap',
    ELEMENT_SWAP_FAIL = 'element_swap_fail',
    
    // 消除音效
    MATCH_3 = 'match_3',
    MATCH_4 = 'match_4',
    MATCH_5 = 'match_5',
    MATCH_L = 'match_l',
    MATCH_T = 'match_t',
    
    // 特效音效
    BOMB_EXPLODE = 'bomb_explode',
    LINE_CLEAR_H = 'line_clear_horizontal',
    LINE_CLEAR_V = 'line_clear_vertical',
    RAINBOW_ACTIVATE = 'rainbow_activate',
    
    // 连击音效
    COMBO_2 = 'combo_2',
    COMBO_3 = 'combo_3',
    COMBO_4 = 'combo_4',
    COMBO_5_PLUS = 'combo_5_plus',
    
    // 道具音效
    HAMMER_USE = 'hammer_use',
    SHUFFLE_BOARD = 'shuffle_board',
    HINT_SHOW = 'hint_show',
    
    // UI音效
    BUTTON_CLICK = 'button_click',
    POPUP_SHOW = 'popup_show',
    POPUP_HIDE = 'popup_hide',
    STAR_EARN = 'star_earn',
    
    // 游戏状态音效
    LEVEL_START = 'level_start',
    LEVEL_COMPLETE = 'level_complete',
    LEVEL_FAIL = 'level_fail',
    NEW_HIGH_SCORE = 'new_high_score',
    
    // 警告音效
    LOW_MOVES = 'low_moves_warning',
    LOW_TIME = 'low_time_warning'
}

export interface AudioConfig {
    musicVolume: number;
    sfxVolume: number;
    musicEnabled: boolean;
    sfxEnabled: boolean;
    fadeInDuration: number;
    fadeOutDuration: number;
}

export interface PlayOptions {
    volume?: number;
    loop?: boolean;
    delay?: number;
    fadeIn?: boolean;
    onComplete?: () => void;
}

class AudioPool {
    private pools: Map<string, AudioSource[]> = new Map();
    private maxPoolSize: number = 5;

    public getAudioSource(key: string, node: Node): AudioSource {
        let pool = this.pools.get(key);
        if (!pool) {
            pool = [];
            this.pools.set(key, pool);
        }

        // 查找可用的音频源
        for (let source of pool) {
            if (!source.playing) {
                return source;
            }
        }

        // 如果池未满，创建新的音频源
        if (pool.length < this.maxPoolSize) {
            const source = node.addComponent(AudioSource);
            pool.push(source);
            return source;
        }

        // 池已满，返回最老的音频源（强制停止）
        const oldestSource = pool[0];
        oldestSource.stop();
        return oldestSource;
    }

    public releaseAll(): void {
        this.pools.forEach((pool) => {
            pool.forEach(source => {
                if (source && source.node) {
                    source.stop();
                }
            });
        });
        this.pools.clear();
    }
}

export class AudioSystem {
    private static _instance: AudioSystem | null = null;
    
    private _assetManager: AssetManager;
    private _audioNode: Node;
    private _musicSource: AudioSource;
    private _audioPool: AudioPool;
    private _config: AudioConfig;
    private _audioClips: Map<string, AudioClip> = new Map();
    private _currentMusicTrack: MusicTrack | null = null;
    private _activeSounds: Map<string, AudioSource> = new Map();
    private _fadeTimers: Map<string, any> = new Map();
    
    // 音频分类配置
    private readonly AUDIO_PATHS = {
        music: {
            [MusicTrack.MENU]: 'audio/music/menu_theme',
            [MusicTrack.GAME]: 'audio/music/game_theme',
            [MusicTrack.VICTORY]: 'audio/music/victory_fanfare',
            [MusicTrack.DEFEAT]: 'audio/music/defeat_theme'
        },
        sfx: {
            // 元素交互
            [SoundEffect.ELEMENT_SELECT]: 'audio/sfx/element_select',
            [SoundEffect.ELEMENT_SWAP]: 'audio/sfx/element_swap',
            [SoundEffect.ELEMENT_SWAP_FAIL]: 'audio/sfx/swap_fail',
            
            // 消除音效
            [SoundEffect.MATCH_3]: 'audio/sfx/match_3',
            [SoundEffect.MATCH_4]: 'audio/sfx/match_4',
            [SoundEffect.MATCH_5]: 'audio/sfx/match_5',
            [SoundEffect.MATCH_L]: 'audio/sfx/match_l_shape',
            [SoundEffect.MATCH_T]: 'audio/sfx/match_t_shape',
            
            // 特效音效
            [SoundEffect.BOMB_EXPLODE]: 'audio/sfx/bomb_explosion',
            [SoundEffect.LINE_CLEAR_H]: 'audio/sfx/line_horizontal',
            [SoundEffect.LINE_CLEAR_V]: 'audio/sfx/line_vertical',
            [SoundEffect.RAINBOW_ACTIVATE]: 'audio/sfx/rainbow_burst',
            
            // 连击音效
            [SoundEffect.COMBO_2]: 'audio/sfx/combo_small',
            [SoundEffect.COMBO_3]: 'audio/sfx/combo_medium',
            [SoundEffect.COMBO_4]: 'audio/sfx/combo_large',
            [SoundEffect.COMBO_5_PLUS]: 'audio/sfx/combo_massive',
            
            // 道具音效
            [SoundEffect.HAMMER_USE]: 'audio/sfx/hammer_smash',
            [SoundEffect.SHUFFLE_BOARD]: 'audio/sfx/board_shuffle',
            [SoundEffect.HINT_SHOW]: 'audio/sfx/hint_sparkle',
            
            // 游戏状态
            [SoundEffect.LEVEL_START]: 'audio/sfx/level_begin',
            [SoundEffect.LEVEL_COMPLETE]: 'audio/sfx/level_success',
            [SoundEffect.LEVEL_FAIL]: 'audio/sfx/level_failure',
            [SoundEffect.NEW_HIGH_SCORE]: 'audio/sfx/high_score',
            
            // 警告音效
            [SoundEffect.LOW_MOVES]: 'audio/sfx/warning_moves',
            [SoundEffect.LOW_TIME]: 'audio/sfx/warning_time'
        },
        ui: {
            [SoundEffect.BUTTON_CLICK]: 'audio/ui/button_click',
            [SoundEffect.POPUP_SHOW]: 'audio/ui/popup_open',
            [SoundEffect.POPUP_HIDE]: 'audio/ui/popup_close',
            [SoundEffect.STAR_EARN]: 'audio/ui/star_collect'
        }
    };

    public static getInstance(): AudioSystem {
        if (!AudioSystem._instance) {
            AudioSystem._instance = new AudioSystem();
        }
        return AudioSystem._instance;
    }

    private constructor() {
        this._assetManager = AssetManager.getInstance();
        this._audioPool = new AudioPool();
        this._config = this.loadAudioConfig();
        this.initializeAudioNode();
    }

    private loadAudioConfig(): AudioConfig {
        // 从本地存储加载音频配置，或使用默认值
        const savedConfig = localStorage.getItem('audio_config');
        if (savedConfig) {
            try {
                return { ...GameConfig.AUDIO, ...JSON.parse(savedConfig) };
            } catch (error) {
                console.warn('Failed to parse saved audio config, using defaults');
            }
        }
        
        return { ...GameConfig.AUDIO };
    }

    private saveAudioConfig(): void {
        try {
            localStorage.setItem('audio_config', JSON.stringify(this._config));
        } catch (error) {
            console.warn('Failed to save audio config:', error);
        }
    }

    private initializeAudioNode(): void {
        // 创建音频节点
        this._audioNode = new Node('AudioSystem');
        director.getScene()?.addChild(this._audioNode);
        director.addPersistRootNode(this._audioNode);
        
        // 创建背景音乐音频源
        this._musicSource = this._audioNode.addComponent(AudioSource);
        this._musicSource.loop = true;
        this._musicSource.volume = this._config.musicVolume;
    }

    public async preloadAudioAssets(priorityList?: string[]): Promise<void> {
        console.log('AudioSystem: Starting audio assets preload');
        
        const allPaths: string[] = [];
        
        // 收集所有音频路径
        Object.values(this.AUDIO_PATHS).forEach(category => {
            Object.values(category).forEach(path => allPaths.push(path));
        });
        
        // 优先加载列表
        const loadOrder = priorityList || [
            // 优先加载常用音效
            this.AUDIO_PATHS.ui[SoundEffect.BUTTON_CLICK],
            this.AUDIO_PATHS.sfx[SoundEffect.ELEMENT_SELECT],
            this.AUDIO_PATHS.sfx[SoundEffect.ELEMENT_SWAP],
            this.AUDIO_PATHS.sfx[SoundEffect.MATCH_3],
            this.AUDIO_PATHS.music[MusicTrack.GAME],
            ...allPaths
        ];
        
        // 分批加载以避免阻塞
        const batchSize = 5;
        for (let i = 0; i < loadOrder.length; i += batchSize) {
            const batch = loadOrder.slice(i, i + batchSize);
            await Promise.allSettled(
                batch.map(path => this.loadAudioClip(path))
            );
            
            // 每批之间短暂延迟，避免阻塞主线程
            if (i + batchSize < loadOrder.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        console.log(`AudioSystem: Preloaded ${this._audioClips.size} audio clips`);
    }

    private async loadAudioClip(path: string): Promise<AudioClip | null> {
        if (this._audioClips.has(path)) {
            return this._audioClips.get(path)!;
        }
        
        try {
            const clip = await this._assetManager.loadAsset<AudioClip>(path, 'cc.AudioClip');
            if (clip) {
                this._audioClips.set(path, clip);
                return clip;
            }
        } catch (error) {
            console.warn(`Failed to load audio clip: ${path}`, error);
        }
        
        return null;
    }

    public async playMusic(track: MusicTrack, options?: PlayOptions): Promise<void> {
        if (!this._config.musicEnabled) return;
        
        const path = this.AUDIO_PATHS.music[track];
        if (!path) {
            console.warn(`Music track not found: ${track}`);
            return;
        }
        
        // 如果已经在播放相同的音轨，不做处理
        if (this._currentMusicTrack === track && this._musicSource.playing) {
            return;
        }
        
        const clip = await this.loadAudioClip(path);
        if (!clip) return;
        
        // 淡出当前音乐
        if (this._musicSource.playing) {
            await this.fadeOutMusic();
        }
        
        // 设置新音轨
        this._musicSource.clip = clip;
        this._musicSource.volume = (options?.volume ?? 1.0) * this._config.musicVolume;
        this._musicSource.loop = options?.loop ?? true;
        this._currentMusicTrack = track;
        
        // 播放音乐
        if (options?.delay) {
            setTimeout(() => {
                this.startMusicPlayback(options?.fadeIn ?? true);
            }, options.delay * 1000);
        } else {
            this.startMusicPlayback(options?.fadeIn ?? true);
        }
    }

    private startMusicPlayback(fadeIn: boolean): void {
        if (fadeIn) {
            this._musicSource.volume = 0;
            this._musicSource.play();
            this.fadeInMusic();
        } else {
            this._musicSource.play();
        }
    }

    public async playSFX(effect: SoundEffect, options?: PlayOptions): Promise<void> {
        if (!this._config.sfxEnabled) return;
        
        const path = this.getSFXPath(effect);
        if (!path) {
            console.warn(`Sound effect not found: ${effect}`);
            return;
        }
        
        const clip = await this.loadAudioClip(path);
        if (!clip) return;
        
        // 获取音频源
        const audioSource = this._audioPool.getAudioSource(effect, this._audioNode);
        
        // 设置音频属性
        audioSource.clip = clip;
        audioSource.volume = (options?.volume ?? 1.0) * this._config.sfxVolume;
        audioSource.loop = options?.loop ?? false;
        
        // 播放音频
        if (options?.delay) {
            setTimeout(() => {
                this.startSFXPlayback(audioSource, effect, options);
            }, options.delay * 1000);
        } else {
            this.startSFXPlayback(audioSource, effect, options);
        }
    }

    private startSFXPlayback(audioSource: AudioSource, effect: SoundEffect, options?: PlayOptions): void {
        audioSource.play();
        
        // 记录活跃音效
        this._activeSounds.set(effect, audioSource);
        
        // 设置完成回调
        if (options?.onComplete) {
            const duration = audioSource.clip!.duration;
            setTimeout(() => {
                options.onComplete!();
                this._activeSounds.delete(effect);
            }, duration * 1000);
        }
    }

    private getSFXPath(effect: SoundEffect): string | null {
        // 按类别查找音效路径
        for (const category of [this.AUDIO_PATHS.sfx, this.AUDIO_PATHS.ui]) {
            if (category[effect]) {
                return category[effect];
            }
        }
        return null;
    }

    public stopMusic(fadeOut: boolean = true): void {
        if (!this._musicSource.playing) return;
        
        if (fadeOut) {
            this.fadeOutMusic().then(() => {
                this._currentMusicTrack = null;
            });
        } else {
            this._musicSource.stop();
            this._currentMusicTrack = null;
        }
    }

    public stopSFX(effect: SoundEffect): void {
        const audioSource = this._activeSounds.get(effect);
        if (audioSource && audioSource.playing) {
            audioSource.stop();
            this._activeSounds.delete(effect);
        }
    }

    public stopAllSFX(): void {
        this._activeSounds.forEach((audioSource) => {
            if (audioSource.playing) {
                audioSource.stop();
            }
        });
        this._activeSounds.clear();
    }

    private async fadeInMusic(duration?: number): Promise<void> {
        const fadeDuration = duration ?? this._config.fadeInDuration;
        const targetVolume = this._config.musicVolume;
        const steps = 20;
        const stepDuration = fadeDuration / steps;
        const volumeStep = targetVolume / steps;
        
        return new Promise((resolve) => {
            let currentStep = 0;
            const fadeTimer = setInterval(() => {
                currentStep++;
                this._musicSource.volume = Math.min(volumeStep * currentStep, targetVolume);
                
                if (currentStep >= steps) {
                    clearInterval(fadeTimer);
                    resolve();
                }
            }, stepDuration * 1000);
            
            this._fadeTimers.set('music_fade_in', fadeTimer);
        });
    }

    private async fadeOutMusic(duration?: number): Promise<void> {
        const fadeDuration = duration ?? this._config.fadeOutDuration;
        const startVolume = this._musicSource.volume;
        const steps = 20;
        const stepDuration = fadeDuration / steps;
        const volumeStep = startVolume / steps;
        
        return new Promise((resolve) => {
            let currentStep = 0;
            const fadeTimer = setInterval(() => {
                currentStep++;
                this._musicSource.volume = Math.max(startVolume - (volumeStep * currentStep), 0);
                
                if (currentStep >= steps || this._musicSource.volume === 0) {
                    clearInterval(fadeTimer);
                    this._musicSource.stop();
                    resolve();
                }
            }, stepDuration * 1000);
            
            this._fadeTimers.set('music_fade_out', fadeTimer);
        });
    }

    // 组合音效播放
    public async playMatchSequence(matchCount: number, comboLevel: number = 0): Promise<void> {
        // 播放基础匹配音效
        let matchEffect: SoundEffect;
        switch (matchCount) {
            case 3: matchEffect = SoundEffect.MATCH_3; break;
            case 4: matchEffect = SoundEffect.MATCH_4; break;
            case 5:
            default: matchEffect = SoundEffect.MATCH_5; break;
        }
        
        await this.playSFX(matchEffect);
        
        // 播放连击音效
        if (comboLevel > 1) {
            const delay = 0.2;
            let comboEffect: SoundEffect;
            
            if (comboLevel === 2) comboEffect = SoundEffect.COMBO_2;
            else if (comboLevel === 3) comboEffect = SoundEffect.COMBO_3;
            else if (comboLevel === 4) comboEffect = SoundEffect.COMBO_4;
            else comboEffect = SoundEffect.COMBO_5_PLUS;
            
            this.playSFX(comboEffect, { delay });
        }
    }

    public async playSpecialEffectSequence(effectType: string): Promise<void> {
        switch (effectType) {
            case 'bomb':
                await this.playSFX(SoundEffect.BOMB_EXPLODE);
                break;
            case 'horizontal_line':
                await this.playSFX(SoundEffect.LINE_CLEAR_H);
                break;
            case 'vertical_line':
                await this.playSFX(SoundEffect.LINE_CLEAR_V);
                break;
            case 'rainbow':
                await this.playSFX(SoundEffect.RAINBOW_ACTIVATE);
                break;
        }
    }

    // 音频配置管理
    public setMusicVolume(volume: number): void {
        this._config.musicVolume = Math.max(0, Math.min(1, volume));
        this._musicSource.volume = this._config.musicVolume;
        this.saveAudioConfig();
    }

    public setSFXVolume(volume: number): void {
        this._config.sfxVolume = Math.max(0, Math.min(1, volume));
        this.saveAudioConfig();
    }

    public setMusicEnabled(enabled: boolean): void {
        this._config.musicEnabled = enabled;
        if (!enabled && this._musicSource.playing) {
            this.stopMusic();
        }
        this.saveAudioConfig();
    }

    public setSFXEnabled(enabled: boolean): void {
        this._config.sfxEnabled = enabled;
        if (!enabled) {
            this.stopAllSFX();
        }
        this.saveAudioConfig();
    }

    // 获取当前状态
    public getCurrentMusicTrack(): MusicTrack | null {
        return this._currentMusicTrack;
    }

    public isMusicPlaying(): boolean {
        return this._musicSource.playing;
    }

    public getAudioConfig(): AudioConfig {
        return { ...this._config };
    }

    public getLoadedClipsCount(): number {
        return this._audioClips.size;
    }

    // 清理资源
    public dispose(): void {
        // 停止所有音频
        this.stopMusic(false);
        this.stopAllSFX();
        
        // 清理定时器
        this._fadeTimers.forEach((timer) => {
            clearInterval(timer);
        });
        this._fadeTimers.clear();
        
        // 清理音频池
        this._audioPool.releaseAll();
        
        // 清理音频剪辑缓存
        this._audioClips.clear();
        this._activeSounds.clear();
        
        // 销毁音频节点
        if (this._audioNode && this._audioNode.isValid) {
            this._audioNode.destroy();
        }
        
        console.log('AudioSystem disposed');
    }
}