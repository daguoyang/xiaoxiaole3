import { PowerUpType } from '../../definitions/gameEnums';
import { TileComponent } from '../ui/item/tileComponent';
import { GridMap } from './gridMap';

/**
 * 道具工厂 - 创建各种道具效果
 */
export class PowerUpFactory {
    private initialized: boolean = false;

    initialize(): void {
        this.initialized = true;
    }

    createPowerUp(type: PowerUpType): PowerUpEffect | null {
        switch (type) {
            case PowerUpType.Bomb:
                return new BombEffect();
            case PowerUpType.Horizontal:
                return new HorizontalEffect();
            case PowerUpType.Vertical:
                return new VerticalEffect();
            case PowerUpType.Rainbow:
                return new RainbowEffect();
            default:
                return null;
        }
    }

    createPowerUpTile(type: PowerUpType): TileComponent {
        // 创建道具棋子的逻辑
        return null as any; // 临时返回
    }
}

/**
 * 道具效果基类
 */
abstract class PowerUpEffect {
    abstract execute(gridMap: GridMap, x: number, y: number): TileComponent[];
}

/**
 * 炸弹效果
 */
class BombEffect extends PowerUpEffect {
    execute(gridMap: GridMap, x: number, y: number): TileComponent[] {
        return gridMap.getTilesInArea(x, y, 1);
    }
}

/**
 * 横向消除效果
 */
class HorizontalEffect extends PowerUpEffect {
    execute(gridMap: GridMap, x: number, y: number): TileComponent[] {
        return gridMap.getRow(y).filter(tile => tile !== null) as TileComponent[];
    }
}

/**
 * 纵向消除效果
 */
class VerticalEffect extends PowerUpEffect {
    execute(gridMap: GridMap, x: number, y: number): TileComponent[] {
        return gridMap.getColumn(x).filter(tile => tile !== null) as TileComponent[];
    }
}

/**
 * 彩虹消除效果
 */
class RainbowEffect extends PowerUpEffect {
    execute(gridMap: GridMap, x: number, y: number): TileComponent[] {
        const targetTile = gridMap.getTile(x, y);
        if (!targetTile) return [];
        
        return gridMap.findTilesByType(targetTile.getTileType());
    }
}