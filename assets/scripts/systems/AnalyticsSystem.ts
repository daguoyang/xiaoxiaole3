export class AnalyticsSystem {
    private static _instance: AnalyticsSystem | null = null;
    private _events: Array<{ event: string, data: any, timestamp: number }> = [];
    private _sessionId: string;
    private _playerId: string | null = null;
    private _enabled: boolean = true;

    private constructor() {
        this._sessionId = this.generateSessionId();
    }

    public static getInstance(): AnalyticsSystem {
        if (!AnalyticsSystem._instance) {
            AnalyticsSystem._instance = new AnalyticsSystem();
        }
        return AnalyticsSystem._instance;
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    public setPlayerId(playerId: string): void {
        this._playerId = playerId;
    }

    public trackEvent(eventName: string, data: any = {}): void {
        if (!this._enabled) return;

        const event = {
            event: eventName,
            data: {
                ...data,
                sessionId: this._sessionId,
                playerId: this._playerId,
                timestamp: Date.now(),
                platform: 'web'
            },
            timestamp: Date.now()
        };

        this._events.push(event);
        console.log(`📊 Analytics: ${eventName}`, event.data);
    }

    public setEnabled(enabled: boolean): void {
        this._enabled = enabled;
    }

    public dispose(): void {
        AnalyticsSystem._instance = null;
    }
}