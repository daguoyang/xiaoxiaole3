/**
 * 基础系统接口 - 简化版本
 */
export abstract class BaseSystem {
    protected engine: any = null;
    protected initialized: boolean = false;

    async initialize(engine?: any): Promise<void> {
        this.engine = engine;
        await this.onInitialize();
        this.initialized = true;
    }

    protected abstract onInitialize(): Promise<void>;

    async destroy(): Promise<void> {
        if (this.initialized) {
            await this.onDestroy();
            this.initialized = false;
            this.engine = null;
        }
    }

    protected abstract onDestroy(): Promise<void>;

    isInitialized(): boolean {
        return this.initialized;
    }
}