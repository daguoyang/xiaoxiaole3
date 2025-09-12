/**
 * 简化的App兼容层 - 快速修复构建错误
 */
import { AudioClip, AudioSource, Node, director } from 'cc';

class AppCompatSimple {
    // 基础属性
    user = {
        init: () => {},
        rankData: { name: '', icon: '' }
    };
    
    platform = {
        changeOrientation: () => {}
    };
    
    subGame = {};
    
    view = {
        openView: (viewName: string, ...args: any[]) => {
            console.log('Opening view:', viewName);
        },
        closeView: (viewName: string) => {
            console.log('Closing view:', viewName);
        },
        getViewByName: () => null,
        showMsgTips: (message: string) => {
            console.log('Message:', message);
        },
        init: () => {}
    };
    
    event = {
        emit: (eventName: string, data?: any) => {
            console.log('Event emit:', eventName, data);
        },
        on: (eventName: string, handler: Function, context?: any) => {
            console.log('Event on:', eventName);
        }
    };
    
    private _audioNode: Node | null = null;
    private _audioSource: AudioSource | null = null;
    audio = {
        init: () => {},
        play: async (clipName: string, type?: any, loop?: boolean) => {
            try {
                if (!clipName) return;
                const path = clipName.includes('/') ? clipName : `sound/${clipName}`;
                // lazy init audio node
                if (!this._audioNode) {
                    this._audioNode = new Node('CompatAudioNode');
                    director.addPersistRootNode(this._audioNode);
                    this._audioSource = this._audioNode.addComponent(AudioSource);
                }
                // load via new AssetMgr first
                let clip: AudioClip | null = null;
                try {
                    const mod = await import('../../new-scripts/core/AssetManager');
                    // @ts-ignore
                    const { AssetMgr } = mod;
                    clip = await AssetMgr.load(path, AudioClip);
                } catch {
                    // fallback to direct resources.load if new module not available
                    const modcc = await import('cc');
                    const { resources, AudioClip: AC } = modcc as any;
                    clip = await new Promise<AudioClip>((resolve, reject) => {
                        resources.load(path, AC, (err: any, a: AudioClip) => (err || !a) ? reject(err) : resolve(a));
                    });
                }
                if (clip && this._audioSource) {
                    this._audioSource.loop = !!loop;
                    this._audioSource.clip = clip;
                    this._audioSource.play();
                }
            } catch (e) {
                console.log('Audio play (compat) failed:', clipName, e);
            }
        }
    };
    
    gameLogic = {
        curLevel: 1,
        blockCount: 5,
        hideList: [],
        toolsArr: [],
        checkInHideList: () => false,
        checkAllInHideList: () => false,
        resetHdeList: () => {},
        isNeighbor: () => false,
        isSameGrid: () => false,
        getBombType: () => 0,
        hideFullList: [],
        init: () => {}
    };
    
    timer = {
        init: () => {}
    };

    // 初始化方法
    async init(canvas: any) {
        console.log('App initialized with canvas');
    }

    // 返回主页方法
    backHome(isStart: boolean = false, pageIdx: number = 2) {
        console.log('Back to home:', isStart, pageIdx);
    }

    // 其他方法
    addEvent() {}
    setBackLobby() {}
    evtResizeCallback() {}
}

export const App = new AppCompatSimple();
