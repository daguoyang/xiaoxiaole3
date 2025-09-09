import { Node, AudioClip, AudioSource } from 'cc';
import { BaseSystem } from './baseSystem';
import { ResLoadHelper } from '../helpers/resLoadHelper';

/**
 * 音频控制器 - 全新的音频管理系统
 */
export class AudioController extends BaseSystem {
    private audioSources: Map<SoundType, AudioSource> = new Map();
    private audioClips: Map<string, AudioClip> = new Map();
    private canvas: Node = null;
    private musicVolume: number = 1.0;
    private effectVolume: number = 1.0;
    private masterVolume: number = 1.0;

    protected async onInitialize(): Promise<void> {
        // 简化初始化
        this.setupAudioSources();
        console.log('AudioController system initialized');
    }

    protected async onDestroy(): Promise<void> {
        this.audioSources.clear();
        this.audioClips.clear();
    }

    /**
     * 设置音频源
     */
    private setupAudioSources(): void {
        // 简化音频源设置，避免canvas依赖
        const musicNode = new Node('MusicSource');
        const musicSource = musicNode.addComponent(AudioSource);
        musicSource.loop = true;
        musicSource.volume = this.musicVolume * this.masterVolume;
        // this.canvas?.addChild(musicNode); // 暂时注释掉canvas依赖
        this.audioSources.set(SoundType.Music, musicSource);

        // 创建音效音频源
        const effectNode = new Node('EffectSource');
        const effectSource = effectNode.addComponent(AudioSource);
        effectSource.loop = false;
        effectSource.volume = this.effectVolume * this.masterVolume;
        // this.canvas?.addChild(effectNode); // 暂时注释掉canvas依赖
        this.audioSources.set(SoundType.Effect, effectSource);
    }

    /**
     * 播放音频
     */
    async playSound(clipName: string, type: SoundType = SoundType.Effect, loop: boolean = false): Promise<void> {
        const audioSource = this.audioSources.get(type);
        if (!audioSource) {
            console.warn(`Audio source for type ${type} not found`);
            return;
        }

        let audioClip = this.audioClips.get(clipName);
        if (!audioClip) {
            try {
                audioClip = await ResLoadHelper.loadCommonAssetSync(`sound/${clipName}`, AudioClip);
                this.audioClips.set(clipName, audioClip);
            } catch (error) {
                console.error(`Failed to load audio clip: ${clipName}`, error);
                return;
            }
        }

        audioSource.clip = audioClip;
        audioSource.loop = loop;
        
        if (type === SoundType.Music) {
            audioSource.volume = this.musicVolume * this.masterVolume;
        } else {
            audioSource.volume = this.effectVolume * this.masterVolume;
        }

        audioSource.play();
    }

    /**
     * 播放音乐
     */
    async playMusic(clipName: string, loop: boolean = true): Promise<void> {
        await this.playSound(clipName, SoundType.Music, loop);
    }

    /**
     * 播放音效
     */
    async playEffect(clipName: string): Promise<void> {
        await this.playSound(clipName, SoundType.Effect, false);
    }

    /**
     * 停止音频
     */
    stopSound(type: SoundType): void {
        const audioSource = this.audioSources.get(type);
        if (audioSource && audioSource.playing) {
            audioSource.stop();
        }
    }

    /**
     * 停止所有音频
     */
    stopAllSounds(): void {
        this.audioSources.forEach(audioSource => {
            if (audioSource.playing) {
                audioSource.stop();
            }
        });
    }

    /**
     * 暂停音频
     */
    pauseSound(type: SoundType): void {
        const audioSource = this.audioSources.get(type);
        if (audioSource && audioSource.playing) {
            audioSource.pause();
        }
    }

    /**
     * 恢复音频
     */
    resumeSound(type: SoundType): void {
        const audioSource = this.audioSources.get(type);
        if (audioSource) {
            audioSource.play();
        }
    }

    /**
     * 设置主音量
     */
    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * 设置音乐音量
     */
    setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumeForType(SoundType.Music);
    }

    /**
     * 设置音效音量
     */
    setEffectVolume(volume: number): void {
        this.effectVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumeForType(SoundType.Effect);
    }

    /**
     * 更新指定类型的音量
     */
    private updateVolumeForType(type: SoundType): void {
        const audioSource = this.audioSources.get(type);
        if (!audioSource) return;

        if (type === SoundType.Music) {
            audioSource.volume = this.musicVolume * this.masterVolume;
        } else {
            audioSource.volume = this.effectVolume * this.masterVolume;
        }
    }

    /**
     * 更新所有音量
     */
    private updateAllVolumes(): void {
        this.updateVolumeForType(SoundType.Music);
        this.updateVolumeForType(SoundType.Effect);
    }

    /**
     * 获取音量
     */
    getMasterVolume(): number { return this.masterVolume; }
    getMusicVolume(): number { return this.musicVolume; }
    getEffectVolume(): number { return this.effectVolume; }

    /**
     * 静音控制
     */
    mute(): void {
        this.setMasterVolume(0);
    }

    unmute(): void {
        this.setMasterVolume(1);
    }
}

export enum SoundType {
    Music = 'Music',
    Effect = 'Effect'
}