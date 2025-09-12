// Jest 测试环境设置

// Mock Cocos Creator APIs
global.cc = {
    Component: class Component {},
    Node: class Node {
        static EventType = {
            TOUCH_START: 'touch-start',
            TOUCH_MOVE: 'touch-move',
            TOUCH_END: 'touch-end',
            TOUCH_CANCEL: 'touch-cancel'
        };
        
        constructor(name?: string) {
            this.name = name || 'Node';
            this._children = [];
            this._components = [];
            this.active = true;
        }
        
        addComponent(componentClass: any) {
            const component = new componentClass();
            component.node = this;
            this._components.push(component);
            return component;
        }
        
        getComponent(componentClass: any) {
            return this._components.find(comp => comp instanceof componentClass) || null;
        }
        
        getChildByName(name: string) {
            return this._children.find((child: any) => child.name === name) || null;
        }
        
        addChild(child: any) {
            this._children.push(child);
            child.parent = this;
        }
        
        destroy() {
            this._destroyed = true;
        }
        
        on(eventType: string, callback: Function, target?: any) {
            // Mock event listener
        }
        
        off(eventType: string, callback: Function, target?: any) {
            // Mock event listener removal
        }
        
        emit(eventType: string, ...args: any[]) {
            // Mock event emission
        }
        
        setPosition(x: number, y: number, z?: number) {
            this.position = { x, y, z: z || 0 };
        }
        
        getPosition() {
            return this.position || { x: 0, y: 0, z: 0 };
        }
        
        setScale(x: number, y: number, z?: number) {
            this.scale = { x, y, z: z || 1 };
        }
        
        getScale() {
            return this.scale || { x: 1, y: 1, z: 1 };
        }
    },
    
    Vec3: class Vec3 {
        constructor(public x = 0, public y = 0, public z = 0) {}
        
        static get ZERO() { return new (this as any)(0, 0, 0); }
        static get ONE() { return new (this as any)(1, 1, 1); }
        
        static distance(a: any, b: any): number {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dz = a.z - b.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
    },
    
    Vec2: class Vec2 {
        constructor(public x = 0, public y = 0) {}
        
        static get ZERO() { return new (this as any)(0, 0); }
        static get ONE() { return new (this as any)(1, 1); }
    },
    
    EventTarget: class EventTarget {
        private _listeners = new Map();
        
        on(event: string, callback: Function, target?: any) {
            if (!this._listeners.has(event)) {
                this._listeners.set(event, []);
            }
            this._listeners.get(event).push({ callback, target });
        }
        
        off(event: string, callback: Function, target?: any) {
            const listeners = this._listeners.get(event);
            if (listeners) {
                const index = listeners.findIndex((l: any) => l.callback === callback && l.target === target);
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            }
        }
        
        emit(event: string, ...args: any[]) {
            const listeners = this._listeners.get(event);
            if (listeners) {
                listeners.forEach((l: any) => {
                    l.callback.call(l.target, ...args);
                });
            }
        }
    },
    
    director: {
        getScene() {
            return new (global as any).cc.Node('Scene');
        },
        
        addPersistRootNode(node: any) {
            // Mock persist root node
        },
        
        loadScene(sceneName: string, callback?: Function) {
            if (callback) {
                setTimeout(callback, 0);
            }
        }
    },
    
    resources: {
        load(path: string, type?: any, callback?: Function) {
            // Mock resource loading
            const mockAsset = { name: path.split('/').pop() };
            if (callback) {
                setTimeout(() => callback(null, mockAsset), 0);
            }
            return Promise.resolve(mockAsset);
        },
        
        preload(path: string, callback?: Function) {
            if (callback) {
                setTimeout(callback, 0);
            }
            return Promise.resolve();
        }
    },
    
    sys: {
        getBrowserType() { return 'unknown'; },
        getOS() { return 'unknown'; },
        getPlatform() { return 'unknown'; },
        localStorage: global.localStorage
    },
    
    tween: (target: any) => ({
        to: (duration: number, props: any, easing?: any) => ({
            call: (callback: Function) => ({
                start: () => {
                    setTimeout(() => {
                        Object.assign(target, props);
                        callback();
                    }, duration * 1000);
                }
            }),
            start: () => {
                setTimeout(() => {
                    Object.assign(target, props);
                }, duration * 1000);
            }
        }),
        delay: (duration: number) => ({
            to: (duration2: number, props: any) => ({
                start: () => {
                    setTimeout(() => {
                        Object.assign(target, props);
                    }, (duration + duration2) * 1000);
                }
            })
        })
    })
};

// Mock localStorage if not available
if (typeof localStorage === 'undefined') {
    global.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    };
}

// Mock performance API
if (typeof performance === 'undefined') {
    global.performance = {
        now: () => Date.now(),
        mark: jest.fn(),
        measure: jest.fn()
    };
}

// Mock console methods for test environment
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Common test utilities
export function createTestBoard(data: number[][]): any {
    return data.map((row, y) => 
        row.map((cellValue, x) => ({
            id: `cell_${x}_${y}`,
            elementType: cellValue,
            position: { x, y },
            isStable: true
        }))
    );
}

export function createTestLevelConfig(overrides?: any): any {
    return {
        levelNumber: 1,
        name: "测试关卡",
        boardSize: 9,
        maxMoves: 30,
        targetScore: 50000,
        objectives: [{
            type: 'score',
            elementType: 0, // EMPTY
            count: 50000,
            description: '达到50000分'
        }],
        starThresholds: [50000, 75000, 100000],
        difficulty: 'easy',
        initialBoard: [],
        obstacles: [],
        terrain: [],
        specialRules: [],
        balanceConfig: {
            elementTypes: [1, 2, 3, 4, 5],
            spawnWeights: { '1': 20, '2': 20, '3': 20, '4': 20, '5': 20 },
            specialElementChance: 0.1
        },
        rewards: {
            coins: 50,
            powerUps: {}
        },
        unlockConditions: [],
        tags: [],
        metadata: {},
        ...overrides
    };
}

export function waitFor(condition: () => boolean, timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        function check() {
            if (condition()) {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for condition'));
            } else {
                setTimeout(check, 10);
            }
        }
        
        check();
    });
}

export function waitForAnimation(duration = 100): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, duration);
    });
}