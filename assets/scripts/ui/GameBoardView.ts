import { Component, Node, Vec3, Vec2, Prefab, instantiate, Layout, Widget, UITransform } from 'cc';
import { BaseUIComponent, UIEventType } from './BaseUIComponent';
import { ElementView, ElementState } from './ElementView';
import { ElementType, Position, GameBoard } from '../models/GameTypes';
import { GameConfig } from '../core/GameConfig';

export interface BoardAnimationSequence {
    animations: Array<{
        elementIds: string[];
        animationType: 'eliminate' | 'fall' | 'spawn' | 'swap';
        data: any;
        delay?: number;
    }>;
    onComplete?: () => void;
}

export class GameBoardView extends BaseUIComponent {
    private _boardContainer: Node | null = null;
    private _elementNodes: Map<string, ElementView> = new Map();
    private _gridPositions: Vec3[][] = [];
    private _elementPrefab: Prefab | null = null;
    private _currentBoard: GameBoard | null = null;
    private _selectedElements: Set<string> = new Set();
    private _isAnimating: boolean = false;
    private _boardSize: { width: number, height: number } = { width: 0, height: 0 };
    
    // 触摸交互相关
    private _isDragging: boolean = false;
    private _dragStartElement: ElementView | null = null;
    private _dragCurrentElement: ElementView | null = null;
    private _swapIndicator: Node | null = null;

    protected onUILoad(): void {
        this.initializeBoardContainer();
        this.loadAssets();
        this.setupBoardLayout();
        this.setupInteractionSystem();
    }

    protected onUIEnable(): void {
        this.refreshBoardDisplay();
    }

    protected onUIDisable(): void {
        this.pauseAllAnimations();
    }

    protected onUIDestroy(): void {
        this.cleanup();
    }

    protected onGameStateChanged(oldState: any, newState: any): void {
        if (newState.board && newState.board !== this._currentBoard) {
            this.updateBoard(newState.board);
        }
        
        if (newState.selectedElements !== this._selectedElements) {
            this.updateSelectedElements(newState.selectedElements || new Set());
        }
    }

    protected onLevelStarted(levelData: any): void {
        this.initializeBoard(levelData.board);
        this.playBoardIntroAnimation();
    }

    private async initializeBoardContainer(): void {
        this._boardContainer = this.validateNode('board_container');
        if (!this._boardContainer) {
            console.error('GameBoardView: board_container node not found');
            return;
        }

        // 设置容器布局
        const uiTransform = this._boardContainer.getComponent(UITransform);
        if (uiTransform) {
            const safeArea = this.getScreenSafeArea();
            const boardSize = Math.min(safeArea.width * 0.9, safeArea.height * 0.6);
            uiTransform.width = boardSize;
            uiTransform.height = boardSize;
        }

        // 创建交换指示器
        this._swapIndicator = this.createSwapIndicator();
    }

    private async loadAssets(): Promise<void> {
        this._elementPrefab = await this.loadAsset('prefabs/ElementView', 'cc.Prefab');
        
        if (!this._elementPrefab) {
            console.error('GameBoardView: Failed to load ElementView prefab');
            return;
        }

        // 预加载所有元素纹理
        const assetPaths = Object.values(ElementType)
            .filter(type => typeof type === 'number')
            .map(type => `textures/elements/${ElementType[type as number].toLowerCase()}`);
        
        await this.preloadAssets(assetPaths);
    }

    private setupBoardLayout(): void {
        if (!this._boardContainer) return;
        
        this._boardSize = {
            width: GameConfig.BOARD.SIZE,
            height: GameConfig.BOARD.SIZE
        };

        this.calculateGridPositions();
    }

    private calculateGridPositions(): void {
        if (!this._boardContainer) return;
        
        const uiTransform = this._boardContainer.getComponent(UITransform);
        if (!uiTransform) return;

        const containerWidth = uiTransform.width;
        const containerHeight = uiTransform.height;
        const cellSize = Math.min(containerWidth, containerHeight) / this._boardSize.width;
        const startX = -(containerWidth / 2) + (cellSize / 2);
        const startY = (containerHeight / 2) - (cellSize / 2);

        this._gridPositions = [];
        for (let row = 0; row < this._boardSize.height; row++) {
            this._gridPositions[row] = [];
            for (let col = 0; col < this._boardSize.width; col++) {
                this._gridPositions[row][col] = new Vec3(
                    startX + col * cellSize,
                    startY - row * cellSize,
                    0
                );
            }
        }
    }

    private setupInteractionSystem(): void {
        if (!this._boardContainer) return;
        
        // 设置拖拽检测
        this._boardContainer.on(Node.EventType.TOUCH_START, this.onBoardTouchStart, this);
        this._boardContainer.on(Node.EventType.TOUCH_MOVE, this.onBoardTouchMove, this);
        this._boardContainer.on(Node.EventType.TOUCH_END, this.onBoardTouchEnd, this);
        this._boardContainer.on(Node.EventType.TOUCH_CANCEL, this.onBoardTouchCancel, this);
    }

    public async initializeBoard(board: GameBoard): Promise<void> {
        this._currentBoard = board;
        this.clearAllElements();
        
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
                const cell = board[row][col];
                if (cell && cell.elementType !== ElementType.EMPTY) {
                    await this.createElement(cell.elementType, { x: col, y: row }, cell.id);
                }
            }
        }
    }

    public async updateBoard(board: GameBoard): Promise<void> {
        if (!board || this._isAnimating) return;
        
        this._currentBoard = board;
        
        // 分析变化
        const changes = this.analyzeBoardChanges(board);
        
        // 执行动画序列
        await this.executeAnimationSequence(changes);
    }

    private analyzeBoardChanges(newBoard: GameBoard): BoardAnimationSequence {
        const animations: any[] = [];
        const elementsToEliminate: string[] = [];
        const elementsToFall: Array<{ id: string, from: Position, to: Position }> = [];
        const elementsToSpawn: Array<{ elementType: ElementType, position: Position }> = [];

        // 检测需要消除的元素
        this._elementNodes.forEach((elementView, id) => {
            const pos = elementView.getGridPosition();
            const newCell = newBoard[pos.y]?.[pos.x];
            
            if (!newCell || newCell.id !== id || newCell.elementType === ElementType.EMPTY) {
                elementsToEliminate.push(id);
            }
        });

        // 检测下落和新生成的元素
        for (let row = 0; row < newBoard.length; row++) {
            for (let col = 0; col < newBoard[row].length; col++) {
                const newCell = newBoard[row][col];
                if (!newCell || newCell.elementType === ElementType.EMPTY) continue;
                
                const existingElement = this._elementNodes.get(newCell.id);
                
                if (existingElement) {
                    const currentPos = existingElement.getGridPosition();
                    if (currentPos.x !== col || currentPos.y !== row) {
                        elementsToFall.push({
                            id: newCell.id,
                            from: currentPos,
                            to: { x: col, y: row }
                        });
                    }
                } else {
                    elementsToSpawn.push({
                        elementType: newCell.elementType,
                        position: { x: col, y: row }
                    });
                }
            }
        }

        // 构建动画序列
        if (elementsToEliminate.length > 0) {
            animations.push({
                elementIds: elementsToEliminate,
                animationType: 'eliminate',
                data: {}
            });
        }

        if (elementsToFall.length > 0) {
            animations.push({
                elementIds: elementsToFall.map(item => item.id),
                animationType: 'fall',
                data: elementsToFall,
                delay: 0.2
            });
        }

        if (elementsToSpawn.length > 0) {
            animations.push({
                elementIds: elementsToSpawn.map((_, index) => `spawn_${index}`),
                animationType: 'spawn',
                data: elementsToSpawn,
                delay: 0.4
            });
        }

        return { animations };
    }

    private async executeAnimationSequence(sequence: BoardAnimationSequence): Promise<void> {
        this._isAnimating = true;
        
        try {
            for (const animation of sequence.animations) {
                if (animation.delay) {
                    await this.delay(animation.delay);
                }
                
                await this.executeAnimation(animation);
            }
            
            if (sequence.onComplete) {
                sequence.onComplete();
            }
        } finally {
            this._isAnimating = false;
        }
    }

    private async executeAnimation(animation: any): Promise<void> {
        const promises: Promise<void>[] = [];
        
        switch (animation.animationType) {
            case 'eliminate':
                animation.elementIds.forEach((id: string) => {
                    const element = this._elementNodes.get(id);
                    if (element) {
                        promises.push(this.eliminateElement(element));
                    }
                });
                break;
                
            case 'fall':
                animation.data.forEach((fallData: any) => {
                    const element = this._elementNodes.get(fallData.id);
                    if (element) {
                        promises.push(this.fallElement(element, fallData.to));
                    }
                });
                break;
                
            case 'spawn':
                animation.data.forEach((spawnData: any, index: number) => {
                    promises.push(this.spawnElement(spawnData.elementType, spawnData.position, `spawn_${Date.now()}_${index}`));
                });
                break;
                
            case 'swap':
                if (animation.data.elements && animation.data.elements.length === 2) {
                    promises.push(this.swapElements(
                        animation.data.elements[0],
                        animation.data.elements[1],
                        animation.data.isSuccess
                    ));
                }
                break;
        }
        
        await Promise.all(promises);
    }

    private async createElement(elementType: ElementType, position: Position, id: string): Promise<ElementView | null> {
        if (!this._elementPrefab || !this._boardContainer) return null;
        
        const elementNode = instantiate(this._elementPrefab);
        const elementView = elementNode.getComponent(ElementView);
        
        if (!elementView) {
            console.error('ElementView component not found on prefab');
            elementNode.destroy();
            return null;
        }

        // 设置元素属性
        elementView.setElementType(elementType);
        elementView.elementId = id;
        elementView.setGridPosition(position);
        
        // 设置位置
        const worldPos = this._gridPositions[position.y][position.x];
        elementNode.setPosition(worldPos);
        
        // 添加到容器
        this._boardContainer.addChild(elementNode);
        this._elementNodes.set(id, elementView);
        
        // 设置事件监听
        elementView.getEventTarget().on(UIEventType.ELEMENT_SELECTED, this.onElementSelected, this);
        elementView.getEventTarget().on(UIEventType.ELEMENT_SWAP_REQUEST, this.onElementSwapRequest, this);
        
        return elementView;
    }

    private async eliminateElement(element: ElementView): Promise<void> {
        await element.playEliminateAnimation();
        
        const id = element.elementId;
        this._elementNodes.delete(id);
        this._selectedElements.delete(id);
        
        element.node.destroy();
    }

    private async fallElement(element: ElementView, newPosition: Position): Promise<void> {
        const targetWorldPos = this._gridPositions[newPosition.y][newPosition.x];
        const currentPos = element.getGridPosition();
        const fallDistance = newPosition.y - currentPos.y;
        
        element.setGridPosition(newPosition);
        await element.playFallAnimation(targetWorldPos, fallDistance);
    }

    private async spawnElement(elementType: ElementType, position: Position, id: string): Promise<void> {
        const element = await this.createElement(elementType, position, id);
        if (element) {
            await element.playSpawnAnimation();
        }
    }

    private async swapElements(element1: ElementView, element2: ElementView, isSuccess: boolean): Promise<void> {
        const pos1 = element1.getGridPosition();
        const pos2 = element2.getGridPosition();
        
        const worldPos1 = this._gridPositions[pos2.y][pos2.x];
        const worldPos2 = this._gridPositions[pos1.y][pos1.x];
        
        const promises = [
            element1.playSwapAnimation(worldPos1, isSuccess),
            element2.playSwapAnimation(worldPos2, isSuccess)
        ];
        
        if (isSuccess) {
            element1.setGridPosition(pos2);
            element2.setGridPosition(pos1);
        }
        
        await Promise.all(promises);
    }

    private onBoardTouchStart(event: any): void {
        if (this._isAnimating) return;
        
        const element = this.getElementAtPosition(event.getLocation());
        if (element && element.isInteractable) {
            this._isDragging = true;
            this._dragStartElement = element;
            this._dragCurrentElement = element;
            
            this.showSwapIndicator(element.node.getPosition());
        }
    }

    private onBoardTouchMove(event: any): void {
        if (!this._isDragging || !this._dragStartElement) return;
        
        const currentElement = this.getElementAtPosition(event.getLocation());
        
        if (currentElement !== this._dragCurrentElement) {
            this._dragCurrentElement = currentElement;
            
            if (currentElement && this.isValidSwapTarget(this._dragStartElement, currentElement)) {
                this.updateSwapIndicator(
                    this._dragStartElement.node.getPosition(),
                    currentElement.node.getPosition()
                );
            }
        }
    }

    private onBoardTouchEnd(event: any): void {
        if (!this._isDragging) return;
        
        if (this._dragStartElement && this._dragCurrentElement && 
            this._dragStartElement !== this._dragCurrentElement &&
            this.isValidSwapTarget(this._dragStartElement, this._dragCurrentElement)) {
            
            this.requestElementSwap(this._dragStartElement, this._dragCurrentElement);
        }
        
        this.hideSwapIndicator();
        this.resetDragState();
    }

    private onBoardTouchCancel(): void {
        this.hideSwapIndicator();
        this.resetDragState();
    }

    private onElementSelected(eventData: any): void {
        this.emit(UIEventType.ELEMENT_SELECTED, eventData);
    }

    private onElementSwapRequest(eventData: any): void {
        this.emit(UIEventType.ELEMENT_SWAP_REQUEST, eventData);
    }

    private getElementAtPosition(screenPos: Vec2): ElementView | null {
        // 转换屏幕坐标到世界坐标，然后找到对应的元素
        for (const [id, element] of this._elementNodes) {
            const elementNode = element.node;
            const worldPos = elementNode.getWorldPosition();
            const uiTransform = elementNode.getComponent(UITransform);
            
            if (uiTransform) {
                const size = uiTransform.contentSize;
                const bounds = {
                    left: worldPos.x - size.width / 2,
                    right: worldPos.x + size.width / 2,
                    bottom: worldPos.y - size.height / 2,
                    top: worldPos.y + size.height / 2
                };
                
                if (screenPos.x >= bounds.left && screenPos.x <= bounds.right &&
                    screenPos.y >= bounds.bottom && screenPos.y <= bounds.top) {
                    return element;
                }
            }
        }
        
        return null;
    }

    private isValidSwapTarget(element1: ElementView, element2: ElementView): boolean {
        const pos1 = element1.getGridPosition();
        const pos2 = element2.getGridPosition();
        
        const deltaX = Math.abs(pos1.x - pos2.x);
        const deltaY = Math.abs(pos1.y - pos2.y);
        
        return (deltaX === 1 && deltaY === 0) || (deltaX === 0 && deltaY === 1);
    }

    private requestElementSwap(element1: ElementView, element2: ElementView): void {
        this.emit(UIEventType.ELEMENT_SWAP_REQUEST, {
            element1: {
                id: element1.elementId,
                position: element1.getGridPosition(),
                elementType: element1.elementType
            },
            element2: {
                id: element2.elementId,
                position: element2.getGridPosition(),
                elementType: element2.elementType
            }
        });
    }

    private createSwapIndicator(): Node {
        const indicator = new Node('SwapIndicator');
        // 创建交换指示器的可视化组件
        return indicator;
    }

    private showSwapIndicator(position: Vec3): void {
        if (this._swapIndicator) {
            this._swapIndicator.setPosition(position);
            this._swapIndicator.active = true;
        }
    }

    private updateSwapIndicator(startPos: Vec3, endPos: Vec3): void {
        if (this._swapIndicator) {
            const midPos = new Vec3((startPos.x + endPos.x) / 2, (startPos.y + endPos.y) / 2, 0);
            this._swapIndicator.setPosition(midPos);
        }
    }

    private hideSwapIndicator(): void {
        if (this._swapIndicator) {
            this._swapIndicator.active = false;
        }
    }

    private resetDragState(): void {
        this._isDragging = false;
        this._dragStartElement = null;
        this._dragCurrentElement = null;
    }

    private updateSelectedElements(selectedElements: Set<string>): void {
        // 取消之前的选中状态
        this._selectedElements.forEach(id => {
            const element = this._elementNodes.get(id);
            if (element && !selectedElements.has(id)) {
                element.setSelected(false);
            }
        });
        
        // 应用新的选中状态
        selectedElements.forEach(id => {
            const element = this._elementNodes.get(id);
            if (element && !this._selectedElements.has(id)) {
                element.setSelected(true);
            }
        });
        
        this._selectedElements = new Set(selectedElements);
    }

    private async playBoardIntroAnimation(): Promise<void> {
        const promises: Promise<void>[] = [];
        
        this._elementNodes.forEach((element, id) => {
            const delay = Math.random() * 0.5;
            promises.push(
                this.delay(delay).then(() => element.playSpawnAnimation())
            );
        });
        
        await Promise.all(promises);
    }

    private clearAllElements(): void {
        this._elementNodes.forEach((element) => {
            element.node.destroy();
        });
        
        this._elementNodes.clear();
        this._selectedElements.clear();
    }

    private pauseAllAnimations(): void {
        this._elementNodes.forEach((element) => {
            element.node.pauseSystemEvents();
        });
    }

    private refreshBoardDisplay(): void {
        if (this._currentBoard) {
            this.updateBoard(this._currentBoard);
        }
    }

    private cleanup(): void {
        this.clearAllElements();
        
        if (this._boardContainer) {
            this._boardContainer.off(Node.EventType.TOUCH_START, this.onBoardTouchStart, this);
            this._boardContainer.off(Node.EventType.TOUCH_MOVE, this.onBoardTouchMove, this);
            this._boardContainer.off(Node.EventType.TOUCH_END, this.onBoardTouchEnd, this);
            this._boardContainer.off(Node.EventType.TOUCH_CANCEL, this.onBoardTouchCancel, this);
        }
    }

    private delay(seconds: number): Promise<void> {
        return new Promise(resolve => {
            this.scheduleOnce(() => resolve(), seconds);
        });
    }

    public getElementCount(): number {
        return this._elementNodes.size;
    }

    public isAnimating(): boolean {
        return this._isAnimating;
    }

    public getSelectedElements(): Set<string> {
        return new Set(this._selectedElements);
    }
}