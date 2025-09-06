import { TileComponent } from '../ui/item/tileComponent';

/**
 * 匹配组 - 简化版本
 */
export class MatchGroup {
    private tiles: TileComponent[] = [];

    constructor(tiles: TileComponent[] = []) {
        this.tiles = [...tiles];
    }

    getTiles(): TileComponent[] { 
        return [...this.tiles]; 
    }

    getCenterTile(): TileComponent {
        if (this.tiles.length === 0) {
            throw new Error('No tiles in match group');
        }
        return this.tiles[Math.floor(this.tiles.length / 2)];
    }
    
    size(): number { 
        return this.tiles.length; 
    }
    
    isEmpty(): boolean { 
        return this.tiles.length === 0; 
    }
    
    isValidMatch(): boolean { 
        return this.tiles.length >= 3; 
    }
    
    addTile(tile: TileComponent): void { 
        this.tiles.push(tile); 
    }
}