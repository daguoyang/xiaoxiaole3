import { TileComponent } from '../ui/item/tileComponent';

/**
 * 元素组 - 简化版本
 */
export class ElementGroup {
    private tiles: TileComponent[] = [];

    constructor(tiles: TileComponent[] = []) {
        this.tiles = [...tiles];
    }

    getTiles(): TileComponent[] { 
        return [...this.tiles]; 
    }

    getCenterTile(): TileComponent {
        if (this.tiles.length === 0) {
            throw new Error('No tiles in element group');
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