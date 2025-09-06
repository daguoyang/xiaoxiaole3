/**
 * 简化的App兼容层 - 快速修复构建错误
 */
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
    
    audio = {
        init: () => {},
        play: (clipName: string, type?: any, loop?: boolean) => {
            console.log('Audio play:', clipName);
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