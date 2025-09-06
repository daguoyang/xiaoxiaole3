import { _decorator, Component, Node } from 'cc';
import { PowerUpType } from '../../../const/gameEnums';
const { ccclass, property } = _decorator;

@ccclass('RocketComponent')
export class RocketComponent extends Component {
    private rocketType: PowerUpType = PowerUpType.None;

    initialize(type: PowerUpType): void {
        this.rocketType = type;
        this.setupRocketEffect();
    }

    // 兼容原有方法名
    initData(type: PowerUpType): void {
        this.initialize(type);
    }

    private setupRocketEffect(): void {
        // 设置火箭特效
        this.node.children.forEach(child => {
            child.active = false;
            if (child.name === this.getRocketEffectName()) {
                child.active = true;
            }
        });
    }

    private getRocketEffectName(): string {
        switch (this.rocketType) {
            case PowerUpType.Horizontal:
                return 'horizontal_rocket';
            case PowerUpType.Vertical:
                return 'vertical_rocket';
            case PowerUpType.Bomb:
                return 'bomb_rocket';
            default:
                return 'default_rocket';
        }
    }

    getRocketType(): PowerUpType {
        return this.rocketType;
    }
}