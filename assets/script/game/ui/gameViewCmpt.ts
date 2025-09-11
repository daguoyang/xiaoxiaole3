import { _decorator, Node, v3, UITransform, instantiate, Vec3, tween, Prefab, Vec2, Sprite, isValid } from 'cc';
import { BaseViewCmpt } from '../../base/baseViewCmpt';
import { PowerUpType, Bomb, Constant, LevelData, NavigationIndex, PageIndex } from '../../definitions/enumConst';
import { EventName } from '../../definitions/eventName';
import { LevelConfig } from '../../definitions/levelConfig';
import { ViewName } from '../../definitions/viewNameConst';
import { App } from '../../core/app';
import { SoundType } from '../../core/audioManager';
import { CocosHelper } from '../../helpers/cocosHelper';
import { GlobalFuncHelper } from '../../helpers/globalFuncHelper';
import { ResLoadHelper } from '../../helpers/resLoadHelper';
import { ToolsHelper } from '../../helpers/toolsHelper';
import { Advertise } from '../../wx/advertise';
import { GameGridManager } from './gridManagerCmpt';
import { gridCmpt } from './item/gridCmpt';
import { rocketCmpt } from './item/rocketCmpt';
const { ccclass, property } = _decorator;

@ccclass('gameViewCmpt')
export class SweetMatchGameView extends BaseViewCmpt {
    /**  ui */
    private gridMgr: GameGridManager = null;
    private gridNode: Node = null;
    private effNode: Node = null;
    private target1: Node = null;
    private target2: Node = null;
    private targetBg: Node = null;
    private lbStep: Node = null;
    private spPro: Node = null;
    private star: Node = null;
    private lbTool1: Node = null;
    private lbTool2: Node = null;
    private lbTool3: Node = null;
    private lbTool4: Node = null;
    private addBtn1: Node = null;
    private addBtn2: Node = null;
    private addBtn3: Node = null;
    private addBtn4: Node = null;
    private headAvatar: Node = null;
    /**   */
    private gridPre: Prefab = null;
    private particlePre: Prefab = null;
    private rocketPre: Prefab = null;
    private blockArr: Node[][] = []
    private blockPosArr: Vec3[][] = [];
    private hideList = [];
    /** 行列数 - 固定9x9棋盘 */
    private H: number = 9;
    private V: number = 9;
    private hasStartedTouch: boolean = false;
    private curTwo: gridCmpt[] = [];
    private shouldStartChange: boolean = false;
    /** 关卡数据 */
    private level: number = 0;
    private stepCount: number = 0;
    private data: LevelData = null;
    private coutArr: any[] = [];
    private curScore: number = 0;
    private starCount: number = 0;
    private hasWon: boolean = false;
    private resultShown: boolean = false; // 标记结果弹窗是否已经显示并处理过
    private flyingAnimationCount: number = 0; // 正在飞行的动画数量
    private needCheckAfterAnimation: boolean = false; // Check game state after animation completes
    
    // 提示系统相关变量
    private idleTimer: any = null;
    private hintTimer: any = null;
    private shouldShowHint: boolean = false;
    private hintElements: {pos1: {h: number, v: number}, pos2: {h: number, v: number}} | null = null;
    private readonly IDLE_TIME = 30000; // 30秒无操作
    private readonly HINT_INTERVAL = 1500; // 提示间隔1.5秒
    onLoad() {
        for (let i = 1; i < 5; i++) {
            this[`onAddTool${i}`] = this.onClickAddButton.bind(this);
            this[`onUseTool${i}`] = this.onClickToolButton.bind(this);
            // 兼容按钮绑定系统
            this[`onClick_addBtn${i}`] = this.onClickAddButton.bind(this);
            this[`onClick_toolBtn${i}`] = this.onClickToolButton.bind(this);
        }
        super.onLoad();
        App.audio.play('ambient_melody', SoundType.Music, true);
        this.gridMgr = this.viewList.get('center/gridManager').getComponent(GameGridManager);
        this.gridNode = this.viewList.get('center/gridNode');
        this.effNode = this.viewList.get('center/effNode');
        this.targetBg = this.viewList.get('top/content/targetBg');
        this.target1 = this.viewList.get('top/target1');
        this.target2 = this.viewList.get('top/target2');
        this.lbStep = this.viewList.get('top/lbStep');
        this.spPro = this.viewList.get('top/probg/spPro');
        this.star = this.viewList.get('top/star');
        this.lbTool1 = this.viewList.get('bottom/proppenal/tool1/prompt/lbTool1');
        this.lbTool2 = this.viewList.get('bottom/proppenal/tool2/prompt/lbTool2');
        this.lbTool3 = this.viewList.get('bottom/proppenal/tool3/prompt/lbTool3');
        this.lbTool4 = this.viewList.get('bottom/proppenal/tool4/prompt/lbTool4');
        this.addBtn1 = this.viewList.get('bottom/proppenal/tool1/addBtn1');
        this.addBtn2 = this.viewList.get('bottom/proppenal/tool2/addBtn2');
        this.addBtn3 = this.viewList.get('bottom/proppenal/tool3/addBtn3');
        this.addBtn4 = this.viewList.get('bottom/proppenal/tool4/addBtn4');
        this.headAvatar = this.viewList.get('top/head6');
    }

    addEvents() {
        super.addEvents();
        App.event.on(EventName.Game.TouchStart, this.evtTouchStart, this);
        App.event.on(EventName.Game.TouchMove, this.evtTouchMove, this);
        App.event.on(EventName.Game.TouchEnd, this.evtTouchEnd, this);
        App.event.on(EventName.Game.ContinueGame, this.evtContinueGame, this);
        App.event.on(EventName.Game.Restart, this.evtRestart, this);
    }
    /** 初始化 */
    async loadExtraData(lv: number) {
        App.view.closeView(ViewName.Single.eHomeView);
        Advertise.showInterstitialAds();
        this.level = lv;
        this.data = await LevelConfig.getLevelData(lv);
        App.gameLogic.blockCount = this.data.blockCount;
        this.flyingAnimationCount = 0; // 重置飞行动画计数器
        this.needCheckAfterAnimation = false; // 重置检查标记
        this.resultShown = false; // 重置结果弹窗显示标记
        
        // 初始化提示系统
        this.initHintSystem();
        this.setLevelInfo();
        this.updateHeadAvatar();
        if (!this.gridPre) {
            this.gridPre = await ResLoadHelper.loadPieces(ViewName.Pieces.grid);
            this.particlePre = await ResLoadHelper.loadPieces(ViewName.Pieces.particle);
            this.rocketPre = await ResLoadHelper.loadPieces(ViewName.Pieces.rocket);
        }
        await this.initLayout();
    }
    /*********************************************  UI information *********************************************/
    /*********************************************  UI information *********************************************/
    /*********************************************  UI information *********************************************/
    /** 设置关卡信息 */
    setLevelInfo() {
        let data = this.data;
        let idArr = data.mapData[0].m_id;
        let ctArr = data.mapData[0].m_ct;
        let mkArr = data.mapData[0].m_mk;  // 🎯 使用正确的目标数量字段
        console.log(`关卡${this.level}初始化目标数据:`, {idArr, ctArr, mkArr});
        this.coutArr = [];
        for (let i = 0; i < idArr.length; i++) {
            // 🎯 使用m_mk作为目标数量，这才是正确的配置
            let temp = [idArr[i], mkArr[i]];
            console.log(`目标${i}: 类型${idArr[i]}, 目标数量${temp[1]}`);
            this.coutArr.push(temp);
        }
        console.log(`关卡${this.level}最终目标数组:`, this.coutArr);
        // 🎯 使用配置文件中的原始步数，不再减少步数
        let steps = this.data.moveCount;
        this.stepCount = steps;
        this.updateTargetCount();
        this.updateStep();
        this.updateScorePercent();
        this.updateToolsInfo();
    }
    /** 道具信息 */
    updateToolsInfo() {
        if (!this.viewList || !isValid(this.node)) {
            console.warn('游戏组件已销毁，跳过 updateToolsInfo');
            return;
        }
        
        // 正式模式 - 正常道具管理
        const isTestMode = false; // 正式版本设为 false
        
        let bombCount = GlobalFuncHelper.getBomb(Bomb.bomb);
        let horCount = GlobalFuncHelper.getBomb(Bomb.hor);
        let verCount = GlobalFuncHelper.getBomb(Bomb.ver);
        let allCount = GlobalFuncHelper.getBomb(Bomb.allSame);
        
        // 显示具体道具数量
        CocosHelper.updateLabelText(this.lbTool1, bombCount);
        CocosHelper.updateLabelText(this.lbTool2, horCount);
        CocosHelper.updateLabelText(this.lbTool3, verCount);
        CocosHelper.updateLabelText(this.lbTool4, allCount);
        this.addBtn1.active = bombCount <= 0;
        this.addBtn2.active = horCount <= 0;
        this.addBtn3.active = verCount <= 0;
        this.addBtn4.active = allCount <= 0;
    }

    /** Update elimination target count */
    updateTargetCount() {
        if (!this.viewList || !isValid(this.node)) {
            console.warn('游戏组件已销毁，跳过 updateTargetCount');
            return;
        }
        
        let arr = this.coutArr;
        console.log(`更新目标显示, 当前目标数组:`, arr);
        this.target1.active = arr.length <= 2;
        this.target2.active = arr.length > 2;
        let target = arr.length <= 2 ? this.target1 : this.target2;
        target.children.forEach((item, idx) => {
            item.active = idx < arr.length;
            if (idx < arr.length) {
                console.log(`设置目标${idx}: 类型${arr[idx][0]}, 数量${arr[idx][1]}`);
                item.getComponent(gridCmpt).setType(arr[idx][0]);
                item.getComponent(gridCmpt).setCount(arr[idx][1]);
            }
        });
        this.checkResult();
    }
    /** 更新星级进度和积分 */
    updateScorePercent() {
        if (!this.viewList || !isValid(this.node)) {
            console.warn('游戏组件已销毁，跳过 updateScorePercent');
            return;
        }
        
        let arr = this.data.scores;
        let percent = this.curScore / arr[arr.length - 1] < 1 ? this.curScore / arr[arr.length - 1] : 1;
        let width = 190 * percent;
        this.spPro.getComponent(UITransform).width = width;
        this.star.children.forEach((item, idx) => {
            let per = arr[idx] / arr[arr.length - 1];
            item.setPosition(v3(per * 180, 0, 1));
            item.getChildByName('s').active = this.curScore >= arr[idx];
            if (this.curScore >= arr[idx]) {
                this.starCount = idx + 1;
            }
        });
    }

    /** 更新头像 */
    updateHeadAvatar() {
        if (this.headAvatar && App.user && App.user.rankData) {
            CocosHelper.updateUserHeadSpriteAsync(this.headAvatar, App.user.rankData.icon);
        }
    }

    /** 更新步数 */
    updateStep() {
        if (!this.viewList || !isValid(this.node)) {
            console.warn('游戏组件已销毁，跳过 updateStep');
            return;
        }
        
        if (this.stepCount < 0) this.stepCount = 0;
        CocosHelper.updateLabelText(this.lbStep, this.stepCount);
    }
    /** 结束检测 */
    checkResult() {
        console.log(`🔍 checkResult调用 - 关卡${this.level}, 已胜利:${this.hasWon}, 剩余步数:${this.stepCount}, 飞行动画:${this.flyingAnimationCount}`);
        if (this.hasWon) return;
        let count = 0;
        for (let i = 0; i < this.coutArr.length; i++) {
            if (this.coutArr[i][1] == 0) {
                count++;
            }
        }
        console.log(`📊 目标完成情况: ${count}/${this.coutArr.length}`);
        if (count == this.coutArr.length) {
            // win
            this.hasWon = true;
            console.log(`🏆 游戏胜利！关卡${this.level}, 剩余步数:${this.stepCount}, 当前飞行动画:${this.flyingAnimationCount}`);
            
            // 统一处理：无论是否有剩余步数，都先等待当前所有动画完成
            if (this.flyingAnimationCount > 0) {
                console.log(`🔄 还有${this.flyingAnimationCount}个飞行动画，等待完成后再处理胜利逻辑`);
                // 在动画完成的回调中会检查hasWon状态并继续处理
                return;
            }
            
            // 如果没有飞行动画，立即处理剩余步数或弹窗
            if (this.stepCount > 0) {
                console.log(`📦 有剩余步数，执行handleLastSteps`);
                this.handleLastSteps();
            } else {
                console.log(`⚡ 没有剩余步数，等待所有动画完成后弹出胜利弹窗`);
                if (!this.resultShown) {
                    this.resultShown = true;
                    this.checkAndShowWinDialog();
                }
            }
        }
        else if (this.stepCount <= 0 && count != this.coutArr.length) {
            //lose
            if (this.flyingAnimationCount <= 0) {
                // 没有飞行动画，立即失败
                App.view.openView(ViewName.Single.eResultView, this.level, false);
            } else {
                // 有飞行动画，标记需要在动画完成后检查
                this.needCheckAfterAnimation = true;
            }
        }
    }

    /** 过关，处理剩余步数 */
    async handleLastSteps() {
        let step = this.stepCount;
        
        for (let i = 0; i < step; i++) {
            await ToolsHelper.delayTime(0.1);
            this.stepCount--;
            this.updateStep();
            this.throwTools();
        }
        await ToolsHelper.delayTime(1);
        this.checkAllBomb();
    }
    
    /**
     * 计算剩余步数的总奖励分数
     */
    private calculateTotalStepBonus(remainingSteps: number): number {
        // 基于当前关卡的分数配置计算总奖励
        const maxRatio = Math.max(...this.data.blockRatio);
        const bonusPerStep = Math.floor(maxRatio * 2); // 每步奖励倍数
        const totalBonus = bonusPerStep * remainingSteps;
        console.log(`步数奖励计算: 最高分数${maxRatio} × 2倍 × ${remainingSteps}步 = ${totalBonus}分`);
        return totalBonus;
    }

    /** 检测网格中是否还有炸弹 */
    async checkAllBomb() {
        if (!isValid(this)) return;
        let isHaveBomb: boolean = false;
        for (let i = 0; i < this.H; i++) {
            for (let j = 0; j < this.V; j++) {
                let item = this.blockArr[i][j];
                if (item && this.isBomb(item.getComponent(gridCmpt))) {
                    isHaveBomb = true;
                    this.handleBomb(item.getComponent(gridCmpt), true);
                }
            }
        }
        await ToolsHelper.delayTime(1);
        if (!isHaveBomb && this.hasWon && !this.resultShown) {
            this.resultShown = true;
            this.checkAndShowWinDialog();
        }
    }

    throwTools(bombType: number = -1, worldPosition: Vec3 = null, isRemainingStep: boolean = false) {
        App.audio.play("rocket_launch_sound")
        let originPos = worldPosition || this.lbStep.worldPosition;
        let p1 = this.effNode.getComponent(UITransform).convertToNodeSpaceAR(originPos);
        let particle = instantiate(this.particlePre);
        this.effNode.addChild(particle);
        particle.setPosition(p1);
        particle.children.forEach(item => {
            item.active = item.name == "move";
        });
        let item: gridCmpt = this.getRandomBlock();
        if (item) {
            let p2 = this.effNode.getComponent(UITransform).convertToNodeSpaceAR(item.node.worldPosition);
            tween(particle).to(1, { position: p2 }).call(async () => {
                particle.destroy();
                let rand = bombType == -1 ? Math.floor(Math.random() * 3) + 8 : bombType;
                item && item.setType(rand);
                
                // 🎯 只有剩余步数的炸弹才自动爆炸，玩家道具不自动爆炸
                if (item && this.isBomb(item) && isRemainingStep) {
                    console.log(`剩余步数炸弹立即爆炸: 位置(${item.h},${item.v}), 类型:${item.type}`);
                    await ToolsHelper.delayTime(0.3); // 短暂延迟让玩家看到炸弹
                    await this.handleBomb(item, true);
                }
            }).start();
        }
    }

    getRandomBlock() {
        let h = Math.floor(Math.random() * this.H);
        let v = Math.floor(Math.random() * this.V);
        if (this.blockArr[h][v] && this.blockArr[h][v].getComponent(gridCmpt).type < 7) {
            return this.blockArr[h][v].getComponent(gridCmpt);
        }
        else {
            return this.getRandomBlock();
        }
    }

    evtContinueGame() {
        this.stepCount += 5;
        this.shouldStartChange = false;
        this.hasStartedTouch = false;
        this.updateStep();
        // Close result dialog, continue game
        App.view.closeView(ViewName.Single.eResultView);
    }

    /*********************************************  gameLogic *********************************************/
    /*********************************************  gameLogic *********************************************/
    /*********************************************  gameLogic *********************************************/
    /** 触控事件（开始） */
    async evtTouchStart(p: Vec2) {
        console.log(this.hasStartedTouch, this.shouldStartChange)
        this.handleProtected();
        if (this.shouldStartChange) return;
        if (this.hasStartedTouch) return;
        // 如果已经胜利，不允许再操作
        if (this.hasWon) return;
        if (this.stepCount <= 0) {
            App.view.showMsgTips("步数不足");
            App.view.openView(ViewName.Single.eResultView, this.level, false);
            return;
        }
        
        // 用户操作，重置提示计时器
        this.resetHintTimer();
        let pos = this.gridNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(p.x, p.y, 1));
        let bc = this.checkClickOnBlock(pos);
        this.curTwo = [];
        if (bc) {
            bc.setSelected(true);
            this.curTwo.push(bc);
            console.log(bc.data);
            this.hasStartedTouch = true;
        }
        // await this.checkMoveDown();
    }
    /** 触控事件（滑动） */
    evtTouchMove(p: Vec2) {
        if (this.shouldStartChange) return;
        if (!this.hasStartedTouch) return;
        let pos = this.gridNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(p.x, p.y, 1));
        let bc = this.checkClickOnBlock(pos);
        if (bc && App.gameLogic.isNeighbor(bc, this.curTwo[0])) {
            bc.setSelected(true);
            this.curTwo.push(bc);
            this.shouldStartChange = true;
            this.startChangeCurTwoPos();
        }
    }
    /** 触控事件（结束 ） */
    async evtTouchEnd(p: Vec2) {
        if (this.shouldStartChange) return;
        if (!this.hasStartedTouch) return;
        let pos = this.gridNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(p.x, p.y, 1));
        let bc = this.checkClickOnBlock(pos);
        /** 点到炸弹 */
        if (bc && (this.isBomb(bc)) && this.curTwo.length == 1) {
            console.log("直接点击炸弹，类型:", bc.type, "位置:", bc.h, bc.v, "curTwo:", this.curTwo.map(item => item ? item.type : 'null'));
            // 点击特效元素触发，扣减步数
            this.stepCount--;
            this.updateStep();
            await this.handleBomb(bc);
        }
        this.hasStartedTouch = false;
        this.shouldStartChange = false;
        this.resetSelected();
    }

    private isRecording: boolean = false;
    /** Protection layer to prevent game interruption from unexpected player operations */
    handleProtected() {
        if ((this.shouldStartChange || this.hasStartedTouch) && !this.isRecording) {
            this.isRecording = true;
            this.scheduleOnce(() => {
                if (isValid(this)) {
                    this.isRecording = false;
                    this.shouldStartChange = false;
                    this.hasStartedTouch = false;
                }
            }, 5)
        }
    }
    /** 是否是炸弹 */
    isBomb(bc: gridCmpt) {
        return bc.type >= 8 && bc.type <= 11
    }

    /** 是否是炸弹 */
    async handleBomb(bc: gridCmpt, isResult: boolean = false) {
        console.log(`handleBomb 被调用，炸弹类型:${bc.type}, 位置:(${bc.h},${bc.v}), isResult:${isResult}`);
        if (this.isBomb(bc)) {
            let bombList = [];
            let list2 = [];
            let list: gridCmpt[] = await this.getBombList(bc);
            console.log(`主炸弹影响了${list.length}个元素`);
            bombList.push(list);
            
            // 收集所有连锁炸弹，但分别处理五消和其他炸弹
            let chainedFiveMatches: gridCmpt[] = [];
            let chainedOtherBombs: gridCmpt[] = [];
            
            console.log(`检查${list.length}个元素中的连锁炸弹`);
            for (let i = 0; i < list.length; i++) {
                console.log(`检查元素${i}: 位置(${list[i].h},${list[i].v}), 类型:${list[i].type}, 是否炸弹:${this.isBomb(list[i])}`);
                if (list[i].h == bc.h && list[i].v == bc.v) {
                    console.log("跳过原炸弹位置");
                    continue;
                }
                if (this.isBomb(list[i])) {
                    if (list[i].type === Bomb.allSame) {
                        console.log(`连锁反应中发现五消，位置:(${list[i].h},${list[i].v})`);
                        chainedFiveMatches.push(list[i]);
                    } else {
                        console.log(`连锁反应中发现其他炸弹，位置:(${list[i].h},${list[i].v}), 类型:${list[i].type}`);
                        chainedOtherBombs.push(list[i]);
                    }
                }
            }
            
            // 处理连锁的其他炸弹（非五消），需要递归处理更深层的连锁
            let processedBombs = new Set<string>(); // 防止重复处理
            let pendingBombs = [...chainedOtherBombs];
            
            while (pendingBombs.length > 0) {
                let bomb = pendingBombs.shift();
                let bombKey = `${bomb.h},${bomb.v}`;
                if (processedBombs.has(bombKey)) continue;
                
                console.log(`处理连锁炸弹: 位置(${bomb.h},${bomb.v}), 类型:${bomb.type}`);
                let chainedList = await this.getBombList(bomb);
                console.log(`连锁炸弹影响了${chainedList.length}个元素`);
                bombList.push(chainedList);
                processedBombs.add(bombKey);
                
                // 检查这个连锁炸弹是否又波及了其他炸弹（包括五消）
                for (let affected of chainedList) {
                    if (affected.h == bomb.h && affected.v == bomb.v) continue; // 跳过炸弹本身
                    let affectedKey = `${affected.h},${affected.v}`;
                    if (this.isBomb(affected) && !processedBombs.has(affectedKey)) {
                        if (affected.type === Bomb.allSame) {
                            console.log(`深层连锁发现五消，位置:(${affected.h},${affected.v})`);
                            if (!chainedFiveMatches.some(fm => fm.h === affected.h && fm.v === affected.v)) {
                                chainedFiveMatches.push(affected);
                            }
                        } else {
                            console.log(`深层连锁发现其他炸弹，位置:(${affected.h},${affected.v}), 类型:${affected.type}`);
                            pendingBombs.push(affected);
                        }
                    }
                }
            }
            
            // 单独处理连锁的五消，确保它们的特效100%触发
            for (let fiveMatch of chainedFiveMatches) {
                console.log(`单独处理被波及的五消，位置:(${fiveMatch.h},${fiveMatch.v})`);
                let fiveMatchAffected = await this.getBombList(fiveMatch);
                console.log(`五消处理完成，影响了${fiveMatchAffected.length}个元素`);
                bombList.push(fiveMatchAffected);
            }
            
            let func = (pc: gridCmpt) => {
                for (let i = 0; i < list2.length; i++) {
                    if (list2[i].h == pc.h && list2[i].v == pc.v) {
                        return true;
                    }
                }
                return false;
            }
            for (let i = 0; i < bombList.length; i++) {
                for (let j = 0; j < bombList[i].length; j++) {
                    let item = bombList[i][j];
                    if (!func(item)) {
                        list2.push(item);
                    }
                }
            }

            await this.handleSamelistBomb(list2);
            await this.checkAgain(isResult);
            return true;
        }
        return false;
    }

    /** 获取特效影响的元素列表 */
    async getBombList(bc: gridCmpt): Promise<gridCmpt[]> {
        let list: gridCmpt[] = [];
        switch (bc.type) {
            case Bomb.hor:
                for (let i = 0; i < this.H; i++) {
                    let item = this.blockArr[i][bc.v];
                    if (item) {
                        list.push(item.getComponent(gridCmpt));
                    }
                }
                App.audio.play("line_clear_audio")
                let rocket1 = instantiate(this.rocketPre);
                this.effNode.addChild(rocket1);
                if (bc.node) {
                    rocket1.setPosition(bc.node.position);
                } else {
                    rocket1.setPosition(this.blockPosArr[bc.h][bc.v]);
                }
                rocket1.getComponent(rocketCmpt).initData(bc.type);
                break;
            case Bomb.ver:
                for (let i = 0; i < this.V; i++) {
                    let item = this.blockArr[bc.h][i];
                    if (item) {
                        list.push(item.getComponent(gridCmpt));
                    }
                }
                App.audio.play("line_clear_audio")
                let rocket = instantiate(this.rocketPre);
                this.effNode.addChild(rocket);
                if (bc.node) {
                    rocket.setPosition(bc.node.position);
                } else {
                    rocket.setPosition(this.blockPosArr[bc.h][bc.v]);
                }
                rocket.getComponent(rocketCmpt).initData(bc.type);
                break;
            case Bomb.bomb:
                for (let i = bc.h - 2; i < bc.h + 2 && i < this.V; i++) {
                    for (let j = bc.v - 2; j < bc.v + 2 && j < this.V; j++) {
                        if (i < 0 || j < 0) continue;
                        let item = this.blockArr[i][j];
                        if (item) {
                            list.push(item.getComponent(gridCmpt));
                        }
                    }
                }
                App.audio.play("explosive_blast_fx")
                break;
            case Bomb.allSame:
                console.log("五消元素被触发，位置:", bc.h, bc.v, "节点状态:", bc.node ? "存在" : "已销毁");
                let curType: number = -1;
                // 先尝试从用户选中的元素中获取目标类型（用户主动触发的情况）
                // 只有当用户选中的两个元素中有一个是当前五消元素时，才使用用户选择的目标类型
                let isUserDirectlyTriggered = false;
                if (this.curTwo && this.curTwo.length > 0) {
                    for (let i = 0; i < this.curTwo.length; i++) {
                        if (this.curTwo[i] && this.curTwo[i].h == bc.h && this.curTwo[i].v == bc.v) {
                            isUserDirectlyTriggered = true;
                            break;
                        }
                    }
                }
                if (isUserDirectlyTriggered && this.curTwo && this.curTwo.length > 0) {
                    for (let i = 0; i < this.curTwo.length; i++) {
                        if (this.curTwo[i].type != bc.type) {
                            curType = this.curTwo[i].type;
                        }
                    }
                    console.log("从用户选中元素获取目标类型:", curType);
                } else {
                    console.log("五消元素被其他炸弹波及");
                }
                // 如果没有找到目标类型，说明是被其他炸弹波及，随机选择一个类型
                if (curType < 0) {
                    console.log("五消元素被波及，寻找目标类型");
                    // 先尝试从周围找一个非炸弹类型
                    for (let i = bc.h - 1; i <= bc.h + 1 && i < this.H; i++) {
                        for (let j = bc.v - 1; j <= bc.v + 1 && j < this.V; j++) {
                            if (i < 0 || j < 0) continue;
                            let item = this.blockArr[i][j];
                            if (item) {
                                let gridComp = item.getComponent(gridCmpt);
                                if (gridComp && !this.isBomb(gridComp) && curType < 0) {
                                    curType = gridComp.type;
                                    console.log("找到周围目标类型:", curType);
                                    break;
                                }
                            }
                        }
                        if (curType >= 0) break;
                    }
                }
                if (bc.node) {
                    let iconNode = bc.node.getChildByName('icon');
                    if (iconNode) {
                        let node = iconNode.getChildByName('Match11');
                        if (node) {
                            node.getComponent(Sprite).enabled = false;
                            let aNode = node.getChildByName('a');
                            if (aNode) {
                                aNode.active = true;
                            }
                            // 停止五消元素的旋转动画
                            let rotateComponent = node.getComponent('rotateSelf');
                            if (rotateComponent) {
                                node.removeComponent('rotateSelf');
                                console.log("移除五消元素旋转组件");
                            }
                            // 重置角度为0，确保不再旋转
                            node.angle = 0;
                        }
                    }
                }
                if (curType < 0) {
                    curType = Math.floor(Math.random() * App.gameLogic.blockCount);
                    console.log("随机选择目标类型:", curType);
                }
                console.log("Final target type:", curType, "Begin eliminating same-type elements");
                App.audio.play("rocket_launch_sound")
                let eliminatedCount = 0;
                for (let i = 0; i < this.H; i++) {
                    for (let j = 0; j < this.V; j++) {
                        let item = this.blockArr[i][j];
                        if (item && item.getComponent(gridCmpt).type == curType) {
                            list.push(item.getComponent(gridCmpt));
                            eliminatedCount++;
                            let particle = instantiate(this.particlePre);
                            this.effNode.addChild(particle);
                            if (bc.node) {
                                particle.setPosition(bc.node.position);
                            } else {
                                particle.setPosition(this.blockPosArr[bc.h][bc.v]);
                            }
                            particle.children.forEach(item => {
                                item.active = item.name == "move";
                            });
                            tween(particle).to(0.3, { position: item.position }).call(async (particle) => {
                                await ToolsHelper.delayTime(0.1);
                                particle.destroy();
                            }).start();
                        }
                    }
                }
                console.log("Five-match element eliminated", eliminatedCount, "same-type elements, total with self:", eliminatedCount + 1);
                list.push(bc);
                // 缩短延迟时间，让四消导弹特效更明显
                await ToolsHelper.delayTime(0.3);
                break;
        }
        return list;
    }

    /** 获取特效影响的元素列表，但只播放特效不销毁特效本身 */
    async getBombListWithoutDestroy(bc: gridCmpt): Promise<gridCmpt[]> {
        let list: gridCmpt[] = [];
        switch (bc.type) {
            case Bomb.hor:
                for (let i = 0; i < this.H; i++) {
                    let item = this.blockArr[i][bc.v];
                    if (item) {
                        list.push(item.getComponent(gridCmpt));
                    }
                }
                App.audio.play("line_clear_audio")
                let rocket1 = instantiate(this.rocketPre);
                this.effNode.addChild(rocket1);
                rocket1.setPosition(bc.node.position);
                rocket1.getComponent(rocketCmpt).initData(bc.type);
                break;
            case Bomb.ver:
                for (let i = 0; i < this.V; i++) {
                    let item = this.blockArr[bc.h][i];
                    if (item) {
                        list.push(item.getComponent(gridCmpt));
                    }
                }
                App.audio.play("line_clear_audio")
                let rocket = instantiate(this.rocketPre);
                this.effNode.addChild(rocket);
                rocket.setPosition(bc.node.position);
                rocket.getComponent(rocketCmpt).initData(bc.type);
                break;
            case Bomb.bomb:
                for (let i = bc.h - 2; i < bc.h + 2 && i < this.V; i++) {
                    for (let j = bc.v - 2; j < bc.v + 2 && j < this.V; j++) {
                        if (i < 0 || j < 0) continue;
                        let item = this.blockArr[i][j];
                        if (item) {
                            list.push(item.getComponent(gridCmpt));
                        }
                    }
                }
                App.audio.play("explosive_blast_fx")
                break;
        }
        return list;
    }

    /** 只播放炸弹特效，不返回影响列表 */
    async playBombEffect(bc: gridCmpt): Promise<void> {
        if (!bc || !bc.node) return;
        
        switch (bc.type) {
            case Bomb.hor:
            case Bomb.ver:
                App.audio.play("line_clear_audio");
                let rocket = instantiate(this.rocketPre);
                this.effNode.addChild(rocket);
                rocket.setPosition(bc.node.position);
                rocket.getComponent(rocketCmpt).initData(bc.type);
                break;
            case Bomb.bomb:
                App.audio.play("explosive_blast_fx");
                break;
        }
    }

    /** 计算炸弹影响的元素，不依赖节点状态 */
    calculateBombAffectedElements(bc: gridCmpt): gridCmpt[] {
        let list: gridCmpt[] = [];
        
        switch (bc.type) {
            case Bomb.hor:
                // Eliminate entire row horizontally
                for (let i = 0; i < this.H; i++) {
                    let item = this.blockArr[i][bc.v];
                    if (item) {
                        list.push(item.getComponent(gridCmpt));
                    }
                }
                break;
            case Bomb.ver:
                // Eliminate entire column vertically
                for (let i = 0; i < this.V; i++) {
                    let item = this.blockArr[bc.h][i];
                    if (item) {
                        list.push(item.getComponent(gridCmpt));
                    }
                }
                break;
            case Bomb.bomb:
                // 周围区域消除
                for (let i = bc.h - 2; i < bc.h + 2 && i < this.V; i++) {
                    for (let j = bc.v - 2; j < bc.v + 2 && j < this.V; j++) {
                        if (i < 0 || j < 0) continue;
                        let item = this.blockArr[i][j];
                        if (item) {
                            list.push(item.getComponent(gridCmpt));
                        }
                    }
                }
                break;
        }
        
        return list;
    }

    /** 选中状态还原 */
    resetSelected() {
        if (!this.isValid) {
            return;
        }
        this.curTwo.forEach(item => {
            if (item) {
                item.setSelected(false);
            }
        })
    }

    /** 开始交换连个选中的方块 */
    async startChangeCurTwoPos(isBack: boolean = false) {
        let time = Constant.changeTime;
        let one = this.curTwo[0], two = this.curTwo[1];
        if (!isBack) {
            App.audio.play("banner_appear_fx")
        }
        else {
            App.audio.play("banner_dismiss_audio")
        }
        if (!one || !two) return;
        tween(one.node).to(time, { position: this.blockPosArr[two.h][two.v] }).start();
        tween(two.node).to(time, { position: this.blockPosArr[one.h][one.v] }).call(async () => {
            if (!isBack) {
                this.changeData(one, two);
                console.log("交换位置触发炸弹，one:", one ? one.type : 'null', "two:", two ? two.type : 'null', "curTwo:", this.curTwo.map(item => item ? item.type : 'null'));
                
                // 检查是否有特效元素参与交换
                const hasBombInExchange = this.isBomb(one) || this.isBomb(two);
                let specialExchangeHandled = false;
                let isbomb1 = false, isbomb2 = false;
                let matchResult = false;
                
                if (hasBombInExchange) {
                    console.log("有特效元素参与交换，检查是否是五消+基础元素的情况");
                    
                    // 特殊处理：五消和基础元素交换，需要先处理五消再生成四消
                    const isFiveBasicExchange = (this.isFiveMatchBomb(one) && !this.isBomb(two)) || 
                                               (this.isFiveMatchBomb(two) && !this.isBomb(one));
                    
                    if (isFiveBasicExchange) {
                        console.log("检测到五消+基础元素交换，先处理五消特效再生成四消");
                        
                        // 确定哪个是五消，哪个是基础元素
                        const fiveMatch = this.isFiveMatchBomb(one) ? one : two;
                        const basicElement = this.isFiveMatchBomb(one) ? two : one;
                        
                        console.log(`五消位置:(${fiveMatch.h},${fiveMatch.v}), 基础元素位置:(${basicElement.h},${basicElement.v}), 类型:${basicElement.type}`);
                        
                        // 先处理五消特效（消除全屏该基础元素类型）
                        isbomb1 = await this.handleBomb(fiveMatch);
                        
                        // 然后在基础元素位置生成四消（如果该位置还存在的话）
                        if (this.blockArr[basicElement.h] && this.blockArr[basicElement.h][basicElement.v]) {
                            console.log("在基础元素位置生成四消特效");
                            // 直接设置为四消类型（这里可以选择横向、竖向或炸弹）
                            let fourMatchType = Math.random() < 0.33 ? Bomb.hor : (Math.random() < 0.5 ? Bomb.ver : Bomb.bomb);
                            basicElement.setType(fourMatchType);
                            
                            // 触发四消特效
                            await ToolsHelper.delayTime(0.2); // 短暂延迟让玩家看到四消生成
                            isbomb2 = await this.handleBomb(basicElement);
                        }
                        
                        specialExchangeHandled = true; // 标记为已特殊处理
                    } else {
                        // 其他情况：按原逻辑处理
                        // 有特效元素参与交换，先检查能否生成新的特效元素
                        matchResult = await this.startCheckThree();
                        
                        // 生成特效元素后，再处理原来的特效元素交换逻辑
                        if (matchResult) {
                            console.log("生成了新的特效元素，现在处理原特效元素");
                            // 检查特效元素之间的特殊交换
                            specialExchangeHandled = await this.handleSpecialExchange(one, two);
                            
                            if (!specialExchangeHandled) {
                                // 如果不是特殊交换，按原来的逻辑处理特效元素
                                isbomb1 = await this.handleBomb(one);
                                isbomb2 = await this.handleBomb(two);
                            }
                        } else {
                            // 没有生成新特效元素，按原逻辑处理
                            specialExchangeHandled = await this.handleSpecialExchange(one, two);
                            if (!specialExchangeHandled) {
                                isbomb1 = await this.handleBomb(one);
                                isbomb2 = await this.handleBomb(two);
                            }
                        }
                    }
                } else {
                    // 没有特效元素参与，按原逻辑处理
                    matchResult = await this.startCheckThree();
                }
                // 只有成功的操作才扣减步数
                if ((matchResult || (isbomb1 || isbomb2) || specialExchangeHandled)) {
                    // 统一扣减步数逻辑
                    this.stepCount--;
                    this.updateStep();
                    this.checkAgain()
                }
                else {
                    console.log(this.curTwo);
                    this.startChangeCurTwoPos(true);
                    // 无效操作后检查是否游戏失败和是否需要洗牌
                    this.scheduleOnce(async () => {
                        this.checkResult();
                        // 检查是否需要洗牌
                        await this.checkAndShuffle();
                    }, 0.1);
                }
            }
            else {
                this.changeData(one, two);
                this.shouldStartChange = false;
                this.hasStartedTouch = false;
                this.resetSelected();
            }
        }).start();
    }

    /**
     * 是否已经加入到列表中了
     */
    private checkExist(item: gridCmpt, samelist: any[]) {
        for (let i = 0; i < samelist.length; i++) {
            for (let j = 0; j < samelist[i].length; j++) {
                let ele: gridCmpt = samelist[i][j];
                if (ele.data.h == item.data.h && ele.data.v == item.data.v) {
                    return true;
                }
            }
        }
        return false;
    }
    /** 反复检查 */
    async checkAgain(isResult: boolean = false) {
        let bool = await this.startCheckThree();
        if (bool) {
            this.checkAgain(isResult);
        }
        else {
            this.resetSelected();
            this.shouldStartChange = false;
            this.hasStartedTouch = false;
            if (isResult) {
                console.log(isResult);
                this.checkAllBomb();
            }
            // 没有更多消除时，检查游戏状态和是否需要洗牌
            this.scheduleOnce(async () => {
                if (this.flyingAnimationCount <= 0) {
                    this.checkResult();
                    // 检查是否需要洗牌
                    await this.checkAndShuffle();
                    // 重新启动提示计时器
                    this.resetHintTimer();
                }
            }, 0.1);
        }
    }
    /**
     * 开始检测是否有满足消除条件的存在
     * @returns bool
     */
    async startCheckThree(cb: Function = null): Promise<boolean> {
        return new Promise(async resolve => {
            let samelist = [];
            for (let i = 0; i < this.H; i++) {
                for (let j = 0; j < this.V; j++) {
                    if (!this.isValid) {
                        resolve(false);
                        return;
                    }
                    let item = this.blockArr[i][j];
                    if (!item || item.getComponent(gridCmpt).getMoveState()) continue;
                    if (this.checkExist(item.getComponent(gridCmpt), samelist)) continue;
                    let hor: gridCmpt[] = this._checkHorizontal(item.getComponent(gridCmpt));
                    let ver: gridCmpt[] = this._checkVertical(item.getComponent(gridCmpt));
                    if (hor.length >= 3 && ver.length >= 3) {
                        hor = hor.slice(1, hor.length);//将自己去掉一个（重复）
                        hor = hor.concat(ver);
                        samelist.push(hor);
                    }
                }
            }
            for (let i = 0; i < this.H; i++) {
                for (let j = 0; j < this.V; j++) {
                    let item = this.blockArr[i][j];
                    if (!item || item.getComponent(gridCmpt).getMoveState()) continue;
                    if (this.checkExist(item.getComponent(gridCmpt), samelist)) continue;
                    let hor: gridCmpt[] = this._checkHorizontal(item.getComponent(gridCmpt));
                    let ver: gridCmpt[] = this._checkVertical(item.getComponent(gridCmpt));
                    if (hor.length >= 3) {
                        samelist.push(hor);
                    }
                    else if (ver.length >= 3) {
                        samelist.push(ver);
                    }
                }
            }
            cb && cb(!!samelist.length);
            await this.handleSamelist(samelist);
            let bool = !!samelist.length;
            resolve(bool);
        })
    }

    /**
     * 结果列表，进一步判断每一组元素是否合法
     * @param samelist [Element[]]
     * @returns 
     */
    private async handleSamelist(samelist: any[]) {
        return new Promise(async resolve => {
            if (samelist.length < 1) {
                resolve("");
                return;
            }
            this._deleteDuplicates(samelist);
            //0:去掉不合法的
            samelist = this.jugetLegitimate(samelist);
            // let soundList = ['combo_cool', 'combo_excellent', 'combo_good', 'combo_great', 'combo_perfect'];
            // let rand = Math.floor(Math.random() * soundList.length); // 注释掉不存在的combo音效
            //1:移除
            for (let i = 0; i < samelist.length; i++) {
                let item = samelist[i];
                if (item.length < 3) continue;
                if (item.length > 3) {
                    this.synthesisBomb(item);
                    continue;
                }
                if (item.length > 3) {
                    // App.audio.play(soundList[rand]) // 注释掉不存在的combo音效
                } else {
                    App.audio.play('match_elimination');
                }
                for (let j = 0; j < item.length; j++) {
                    let ele: gridCmpt = item[j];
                    let particle = instantiate(this.particlePre);
                    this.effNode.addChild(particle);
                    particle.children.forEach(item => {
                        item.active = +item.name == ele.type;
                    })
                    let tp = ele.type;
                    let worldPosition = ele.node.worldPosition
                    this.flyItem(tp, worldPosition);
                    this.addScoreByType(tp);
                    particle.setPosition(this.blockPosArr[ele.h][ele.v]);
                    this.blockArr[ele.h][ele.v] = null;
                    ele.node.destroy();
                }
            }
            await ToolsHelper.delayTime(0.2);
            await this.checkMoveDown();
            resolve("");
        });
    }

    /** 炸弹消除 */
    private async handleSamelistBomb(samelist: any[]) {
        return new Promise(async resolve => {
            if (samelist.length < 1) {
                resolve("");
                return;
            }
            // let soundList = ['combo_cool', 'combo_excellent', 'combo_good', 'combo_great', 'combo_perfect'];
            // let rand = Math.floor(Math.random() * soundList.length);
            // this.scheduleOnce(() => {
            //     if (isValid(this)) {
            //         App.audio.play(soundList[rand])
            //     }
            // }, 0.2); // 注释掉不存在的combo音效
            // 移除
            for (let i = 0; i < samelist.length; i++) {
                let ele: gridCmpt = samelist[i];
                if (!ele) continue;
                let particle = instantiate(this.particlePre);
                this.effNode.addChild(particle);
                particle.children.forEach(item => {
                    item.active = +item.name == ele.type;
                })
                let tp = ele.type;
                if (!ele || !ele.node) continue;
                let worldPosition = ele.node.worldPosition
                this.flyItem(tp, worldPosition);
                this.addScoreByType(tp);
                particle.setPosition(this.blockPosArr[ele.h][ele.v]);
                this.blockArr[ele.h][ele.v] = null;
                if (ele.node)
                    ele.node.destroy();
            }

            await ToolsHelper.delayTime(0.2);
            await this.checkMoveDown();
            resolve("");
        });
    }
    /** 合成炸弹 */
    synthesisBomb(item: gridCmpt[]) {
        /** 先找当前item中是否包含curTwo,包含就以curTwo为中心合成 */
        let center: gridCmpt = null;
        for (let j = 0; j < item.length; j++) {
            for (let m = 0; m < this.curTwo.length; m++) {
                if (item[j].h == this.curTwo[m].h && item[j].v == this.curTwo[m].v) {
                    center = item[j];
                    break;
                }
            }
        }
        if (!center) {
            center = item[Math.floor(item.length / 2)];
        }
        let bombType = App.gameLogic.getBombType(item);
        App.audio.play("banner_dismiss_audio");
        for (let j = 0; j < item.length; j++) {
            let ele: gridCmpt = item[j];
            let tp = ele.type;
            let worldPosition = ele.node.worldPosition
            // 生成特效元素时也要统计目标
            this.flyItem(tp, worldPosition);
            this.addScoreByType(tp);
            tween(ele.node).to(0.1, { position: this.blockPosArr[center.h][center.v] }).call(async (target) => {
                let gt = target.getComponent(gridCmpt);
                console.log(gt.h, gt.v)
                if (gt.h == center.h && gt.v == center.v) {
                    gt.setType(bombType);
                }
                else {
                    // 在销毁前检查是否是特效元素，如果是则先触发特效
                    if (this.isBomb(gt)) {
                        console.log(`synthesisBomb中发现特效元素，位置:(${gt.h},${gt.v}), 类型:${gt.type}, 先触发特效`);
                        await this.handleBomb(gt);
                    } else {
                        this.blockArr[gt.h][gt.v] = null;
                        gt.node.destroy();
                    }
                }
            }).start();

        }
    }
    /**
     * 去掉不合法的
     * @param samelist  [Element[]]
     */
    private jugetLegitimate(samelist: any[]) {
        let arr: any[] = [];
        for (let i = 0; i < samelist.length; i++) {
            let itemlist = samelist[i];
            let bool: boolean = this.startJuge(itemlist);
            if (bool) {
                arr.push(itemlist);
            }
        }
        return arr;
    }

    private startJuge(list: gridCmpt[]): boolean {
        let bool = false;
        let len = list.length;
        switch (len) {
            case 3:
                bool = this._atTheSameHorOrVer(list);
                break;

            case 4:
                bool = this._atTheSameHorOrVer(list);
                break;

            case 5:
                bool = this._atTheSameHorOrVer(list);
                if (!bool) {
                    bool = this._atLeastThreeSameHorAndVer(list);
                }
                break;

            case 6:
                bool = this._atLeastThreeSameHorAndVer(list);
                break;

            case 7:
                bool = this._atLeastThreeSameHorAndVer(list);
                break;

            default://全在行或者列
                bool = this._atLeastThreeSameHorAndVer(list);
                break;

        }
        return bool;
    }

    /**
     * 至少有三个同行且三个同列
     * @param list 
     * @returns 
     */
    private _atLeastThreeSameHorAndVer(list: gridCmpt[]): boolean {
        let bool = false;
        let count = 0;
        //同一列
        for (let i = 0; i < list.length; i++) {
            let item1 = list[i];
            for (let j = 0; j < list.length; j++) {
                let item2 = list[j];
                if (item1.data.h == item2.data.h) {
                    count++;
                    break;
                }
            }
        }
        if (count < 3) return bool;
        count = 0;
        //同一行
        for (let i = 0; i < list.length; i++) {
            let item1 = list[i];
            for (let j = 0; j < list.length; j++) {
                let item2 = list[j];
                if (item1.data.v == item2.data.v) {
                    count++;
                    break;
                }
            }
        }
        if (count < 3) return bool;
        return true;
    }

    /**
     * 处在同一行/或者同一列
     * @param list 
     * @returns 
     */
    private _atTheSameHorOrVer(list: gridCmpt[]): boolean {
        let item = list[0];
        let bool = true;
        //同一列
        for (let i = 0; i < list.length; i++) {
            if (item.data.h != list[i].data.h) {
                bool = false;
                break;
            }
        }
        if (bool) return bool;
        bool = true;
        //同一行
        for (let i = 0; i < list.length; i++) {
            if (item.data.v != list[i].data.v) {
                bool = false;
                break;
            }
        }
        return bool;
    }
    /**
     * 去重复
     */
    private _deleteDuplicates(samelist: any[]) {
        for (let i = 0; i < samelist.length; i++) {
            let itemlist = samelist[i];
            let bool = true;
            do {
                let count = 0;
                for (let m = 0; m < itemlist.length - 1; m++) {
                    for (let n = m + 1; n < itemlist.length; n++) {
                        if (itemlist[m].data.h == itemlist[n].data.h && itemlist[m].data.v == itemlist[n].data.v) {
                            samelist[i].splice(i, 1);
                            count++;
                            console.log('------------repeat----------');
                            break;
                        }
                    }
                }
                bool = count > 0 ? true : false;
            } while (bool);
        }
    }
    /**
     * 以当前滑块为中心沿水平方向检查
     * @param {gridCmpt} item 
     */
    private _checkHorizontal(item: gridCmpt): gridCmpt[] {
        let arr: gridCmpt[] = [item];
        let startX = item.data.h;
        let startY = item.data.v;
        // 右边
        for (let i = startX + 1; i < this.H; i++) {
            if (!this.blockArr[i][startY]) break;
            let ele = this.blockArr[i][startY].getComponent(gridCmpt);
            if (!ele || item.getMoveState()) break;
            if (ele.type == item.type) {
                arr.push(ele);
            }
            else {
                break;
            }
        }
        // 左边
        for (let i = startX - 1; i >= 0; i--) {
            if (i < 0) break;
            if (!this.blockArr[i][startY]) break;
            let ele = this.blockArr[i][startY].getComponent(gridCmpt);
            if (!ele || item.getMoveState()) break;
            if (ele.type == item.type) {
                arr.push(ele);
            }
            else {
                break;
            }
        }
        if (arr.length < 3) return [];
        return arr;
    }

    /**
     * 以当前滑块为中心沿竖直方向检查
     * @param {gridCmpt} item 
     */
    private _checkVertical(item: gridCmpt): gridCmpt[] {
        let arr: gridCmpt[] = [item];
        let startX = item.data.h;
        let startY = item.data.v;
        // 上边
        for (let i = startY + 1; i < this.V; i++) {
            if (!this.blockArr[startX][i]) break;
            let ele = this.blockArr[startX][i].getComponent(gridCmpt);
            if (!ele || item.getMoveState()) break;
            if (ele.type == item.type) {
                arr.push(ele);
            }
            else {
                break;
            }
        }
        // 下边
        for (let i = startY - 1; i >= 0; i--) {
            if (i < 0) break;
            if (!this.blockArr[startX][i]) break;
            let ele = this.blockArr[startX][i].getComponent(gridCmpt);
            if (!ele || item.getMoveState()) break;
            if (ele.type == item.type) {
                arr.push(ele);
            }
            else {
                break;
            }
        }
        if (arr.length < 3) return [];
        return arr;
    }

    /** 数据交换，网格位置交换 */
    changeData(item1: gridCmpt, item2: gridCmpt) {
        /** 数据交换 */
        let temp = item1.data;
        item1.data = item2.data;
        item2.data = temp;

        /** 位置交换 */
        let x1 = item1.data.h;
        let y1 = item1.data.v;
        let x2 = item2.data.h;
        let y2 = item2.data.v;
        let pTemp = this.blockArr[x1][y1];
        this.blockArr[x1][y1] = this.blockArr[x2][y2]
        this.blockArr[x2][y2] = pTemp;
        this.blockArr[x1][y1].getComponent(gridCmpt).initData(this.blockArr[x1][y1].getComponent(gridCmpt).data.h, this.blockArr[x1][y1].getComponent(gridCmpt).data.v);
        this.blockArr[x2][y2].getComponent(gridCmpt).initData(this.blockArr[x2][y2].getComponent(gridCmpt).data.h, this.blockArr[x2][y2].getComponent(gridCmpt).data.v);
    }

    /** 是否点击在方块上 */
    checkClickOnBlock(pos: Vec3): gridCmpt {
        if (!isValid(this)) return;
        if (this.blockArr.length < 1) return;
        for (let i = 0; i < this.H; i++) {
            for (let j = 0; j < this.V; j++) {
                let block = this.blockArr[i][j];
                if (block) {
                    if (block.getComponent(gridCmpt).isInside(pos)) {
                        return block.getComponent(gridCmpt);
                    }
                }
            }
        }
        return null;
    }

    /** 消除后向下滑动 */
    async checkMoveDown() {
        return new Promise(async resolve => {
            for (let i = 0; i < this.H; i++) {
                let count = 0;
                for (let j = 0; j < this.V; j++) {
                    if (!isValid(this)) return;
                    let block = this.blockArr[i][j];
                    let isHide = App.gameLogic.checkInHideList(i, j);
                    if (!block) {
                        if (!isHide) {
                            count++;
                        } else {
                            //当前格子以下是不是全是边界空的，是边界空的就忽略，否则就+1
                            let bool = App.gameLogic.checkAllInHideList(i, j);
                            if (!bool && count > 0) {
                                count++;
                            }
                        }
                    }
                    else if (block && count > 0) {
                        let count1 = await this.getDownLastCount(i, j, count);
                        this.blockArr[i][j] = null;
                        this.blockArr[i][j - count1] = block;
                        block.getComponent(gridCmpt).initData(i, j - count1);
                        tween(block).to(0.5, { position: this.blockPosArr[i][j - count1] }, { easing: 'backOut' }).call(resolve).start();
                    }
                }
            }
            // await ToolsHelper.delayTime(0.2);
            await this.checkReplenishBlock();
            resolve("");
        });
    }

    /** 获取最终下落的格子数 */
    async getDownLastCount(i, j, count): Promise<number> {
        return new Promise(resolve => {
            let tempCount = 0;
            let func = (i, j, count) => {
                tempCount = count;
                let bool = App.gameLogic.checkInHideList(i, j - count);
                if (bool || this.blockArr[i][j - count]) {
                    func(i, j, count - 1);
                }
            }
            func(i, j, count);
            resolve(tempCount);
        })
    }

    /** 补充新方块填补空缺 */
    async checkReplenishBlock() {
        return new Promise(async resolve => {
            for (let i = 0; i < this.H; i++) {
                for (let j = 0; j < this.V; j++) {
                    let block = this.blockArr[i][j];
                    let isHide = App.gameLogic.checkInHideList(i, j);
                    if (!block && !isHide) {
                        let pos = this.blockPosArr[i][this.V - 1]
                        let block = this.addBlock(i, j, v3(pos.x, pos.y + Constant.Width + 20, 1));
                        this.blockArr[i][j] = block;
                        tween(block).to(0.5, { position: this.blockPosArr[i][j] }, { easing: 'backOut' }).call(resolve).start();
                    }
                }
            }
            await ToolsHelper.delayTime(0.5);
            resolve("");
        });
    }

    async initLayout() {
        this.clearData();
        await this.gridMgr.initGrid();
        this.hideList = App.gameLogic.hideList;
        let gap = 0;
        let width = Constant.Width;
        let count = 0;
        for (let i = 0; i < this.H; i++) {
            this.blockArr.push([]);
            this.blockPosArr.push([]);
            for (let j = 0; j < this.V; j++) {
                if (App.gameLogic.hideFullList.length < this.H * this.V) {
                    App.gameLogic.hideFullList.push([i, j]);
                }
                let xx = (width + gap) * (i + 0) - (width + gap) * (this.H - 1) / 2;
                let yy = (width + gap) * (j + 0) - (width + gap) * (this.V - 1) / 2;
                let pos = v3(xx, yy, 1);
                this.blockPosArr[i][j] = pos;
                if (App.gameLogic.checkInHideList(i, j)) {
                    this.blockArr[i][j] = null;
                    continue;
                }
                count++;
                let block = this.addBlock(i, j, pos);
                block.setScale(v3(0, 0, 0));
                tween(block).to(count / 100, { scale: v3(1, 1, 1) }).start();
                this.blockArr[i][j] = block;
            }
        }
        await ToolsHelper.delayTime(0.8);
        // 自动检测并消除可消除的元素
        this.autoEliminateLoop();
        /** 进入游戏选择的道具炸弹 */
        let list = App.gameLogic.toolsArr;
        for (let i = 0; i < list.length; i++) {
            this.throwTools(list[i]);
        }
        App.gameLogic.toolsArr = [];
    }

    addBlock(i: number, j: number, pos: Vec3 = null) {
        let block = instantiate(this.gridPre);
        this.gridNode.addChild(block);
        block.getComponent(gridCmpt).initData(i, j);
        if (pos) {
            block.setPosition(pos);
        }
        return block;
    }

    clearData() {
        App.gameLogic.resetHdeList(this.level);
        if (this.blockArr.length < 1) return;
        for (let i = 0; i < this.H; i++) {
            for (let j = 0; j < this.V; j++) {
                let block = this.blockArr[i][j];
                if (block) {
                    block.destroy();
                }
            }
        }
        this.blockArr = [];
        this.blockPosArr = [];
        this.shouldStartChange = false;
        this.hasStartedTouch = false;
        this.curScore = 0;
        this.hasWon = false;
    }
    /** 加积分 */
    addScoreByType(type: number) {
        if (type > this.data.blockRatio.length - 1) {
            type = this.data.blockRatio.length - 1;
        }
        let score = this.data.blockRatio[type];
        this.curScore += score;
        this.updateScorePercent();
    }
    /** 飞舞动画 */
    async flyItem(type: number, pos: Vec3) {
        let idx = this.data.mapData[0].m_id.indexOf(type);
        console.log(`flyItem: 元素类型${type}, 在目标中的索引=${idx}, 目标列表=`, this.data.mapData[0].m_id);
        if (idx < 0) {
            console.log(`元素类型${type}不是目标，跳过统计`);
            return;
        }
        
        // 验证目标数组状态
        console.log(`flyItem前目标状态:`, this.coutArr.map((item, index) => `目标${index}[类型${item[0]}]:${item[1]}`));
        
        let item = instantiate(this.gridPre);
        let tempPos = new Vec3();
        let targetPos = new Vec3();
        /** 空间坐标转节点坐标 */
        this.node.getComponent(UITransform).convertToNodeSpaceAR(pos, tempPos)
        this.node.getComponent(UITransform).convertToNodeSpaceAR(this.targetBg.worldPosition, targetPos)
        item.setPosition(tempPos);
        this.node.addChild(item);
        item.getComponent(gridCmpt).setType(type);

        // 减少时间随机性，确保更一致的动画完成时间
        let time = 0.8 + Math.random() * 0.4; // 0.8-1.2秒，范围更小
        item.setScale(0.5, 0.5, 0.5);
        // 开始飞行动画，计数器+1
        this.flyingAnimationCount++;
        
        tween(item).to(time, { position: targetPos }, { easing: 'backIn' }).call(() => {
            this.handleLevelTarget(type);
            item.destroy();
            // 动画完成，计数器-1
            this.flyingAnimationCount--;
            // 检查是否所有动画都完成了
            if (this.flyingAnimationCount <= 0) {
                console.log(`✅ 所有飞行动画完成 - 胜利:${this.hasWon}, 剩余步数:${this.stepCount}, 需要延迟检查:${this.needCheckAfterAnimation}`);
                
                if (this.needCheckAfterAnimation) {
                    this.needCheckAfterAnimation = false;
                    this.checkResult();
                } else if (this.hasWon) {
                    // 胜利状态下，继续处理剩余步数或弹窗
                    if (this.stepCount > 0) {
                        console.log(`📦 动画完成后，还有剩余步数，执行handleLastSteps`);
                        this.handleLastSteps();
                    } else if (!this.resultShown) {
                        console.log(`🏆 动画完成后弹出胜利弹窗 - 关卡${this.level}`);
                        this.resultShown = true;
                        this.checkAndShowWinDialog();
                    }
                }
            }
            // App.audio.play('Full');
        }).start();
    }

    handleLevelTarget(type: number) {
        // 如果游戏已经胜利，不再处理目标计数
        if (this.hasWon) return;
        
        for (let i = 0; i < this.coutArr.length; i++) {
            if (type == this.coutArr[i][0] && this.coutArr[i][1] > 0) {
                this.coutArr[i][1]--;
                break; // 找到匹配的目标后立即跳出循环
            }
        }
        
        this.updateTargetCount();
    }

    /*********************************************  btn *********************************************/
    /*********************************************  btn *********************************************/
    /*********************************************  btn *********************************************/
    evtRestart() {
        this.loadExtraData(this.level);
    }
    executeDebugAction() {
        this.loadExtraData(this.level);
        // this.handleLastSteps();
    }

    /** 设置 */
    openGameSettings() {
        App.view.openView(ViewName.Single.esettingGameView);
    }

    /** 购买金币 */
    enterShopMode() {
        App.audio.play('ui_touch_feedback');
        App.view.openView(ViewName.Single.eBuyView);
    }

    /** 暂停 */
    async pauseGameplay() {
        App.audio.play('ui_touch_feedback');
        App.view.openView(ViewName.Single.esettingGameView);
    }

    /** 添加道具，广告位 */
    onClickAddButton(btnNode: Node) {
        App.audio.play('ui_touch_feedback');
        let type: number = -1;
        switch (btnNode.name) {
            case "addBtn1":
                type = Bomb.bomb;
                break;
            case "addBtn2":
                type = Bomb.hor;
                break;
            case "addBtn3":
                type = Bomb.ver;
                break;
            case "addBtn4":
                type = Bomb.allSame;
                break;
        }
        // 显示广告获取道具
        Advertise.showVideoAdsForTool(
            type,
            () => {
                // 广告播放成功，获得道具
                console.log(`广告播放完成，获得道具！`);
                App.view.showMsgTips(`获得道具！`);
                
                // 更新道具数量显示
                this.updateToolsInfo();
            },
            () => {
                // 广告播放失败或用户取消
                console.log("广告播放失败或用户取消");
                App.view.showMsgTips("未获得道具");
            }
        );
    }
    private isUsingBomb: boolean = false;
    /** 道具 */
    onClickToolButton(btnNode: Node) {
        App.audio.play('ui_touch_feedback');
        if (this.isUsingBomb) return;
        
        // 用户操作，重置提示计时器
        this.resetHintTimer();
        
        this.isUsingBomb = true;
        this.scheduleOnce(() => {
            this.isUsingBomb = false;
            this.shouldStartChange = false;
            this.hasStartedTouch = false;
        }, 1);
        let type: number = -1;
        switch (btnNode.name) {
            case "toolBtn1":
                type = Bomb.bomb;
                break;
            case "toolBtn2":
                type = Bomb.hor;
                break;
            case "toolBtn3":
                type = Bomb.ver;
                break;
            case "toolBtn4":
                type = Bomb.allSame;
                break;
        }
        let bombCount = GlobalFuncHelper.getBomb(type);
        if (bombCount <= 0) {
            // 道具不足时显示广告获取道具
            this.showGameToolInsufficientDialog(type, btnNode);
            return;
        }
        GlobalFuncHelper.setBomb(type, -1);
        let pos = btnNode.worldPosition;
        this.throwTools(type, pos);
        this.updateToolsInfo();
    }

    /** 游戏中道具不足直接看广告 */
    showGameToolInsufficientDialog(toolType: any, btnNode: Node) {
        const toolNames = {
            [Bomb.hor]: "横向导弹",
            [Bomb.ver]: "竖向导弹", 
            [Bomb.bomb]: "炸弹",
            [Bomb.allSame]: "五消道具"
        };
        
        console.log(`游戏中道具${toolType}不足，直接跳转观看广告`);
        
        // 直接观看广告
        Advertise.showVideoAdsForTool(
            toolType,
            () => {
                // 广告播放成功，获得道具
                console.log(`广告播放完成，获得${toolNames[toolType]}`);
                App.view.showMsgTips(`获得${toolNames[toolType]}！`);
                
                // 更新道具显示
                this.updateToolsInfo();
                
                // 自动使用该道具
                setTimeout(() => {
                    GlobalFuncHelper.setBomb(toolType, -1);
                    let pos = btnNode.worldPosition;
                    this.throwTools(toolType, pos);
                    this.updateToolsInfo();
                }, 500);
            },
            () => {
                // 广告播放失败或用户取消
                console.log("广告播放失败或用户取消");
                App.view.showMsgTips("未获得道具");
            }
        );
    }

    /**
     * 检测棋盘是否有可移动的元素
     * @returns Promise<boolean> 是否有可移动的元素
     */
    async detectPossibleMoves(): Promise<boolean> {
        return new Promise(resolve => {
            console.log("开始检测可能的移动...");
            let totalChecked = 0;
            
            // 遍历所有格子，尝试与相邻格子交换
            for (let h = 0; h < this.H; h++) {
                for (let v = 0; v < this.V; v++) {
                    if (!this.blockArr[h][v]) continue;
                    let current = this.blockArr[h][v].getComponent(gridCmpt);
                    if (!current) continue;
                    
                    // 检查右邻居
                    if (h + 1 < this.H && this.blockArr[h + 1][v]) {
                        let neighbor = this.blockArr[h + 1][v].getComponent(gridCmpt);
                        totalChecked++;
                        if (this.canMakeMatch(current, neighbor)) {
                            console.log(`找到可移动组合：位置(${h},${v})与(${h+1},${v})`);
                            resolve(true);
                            return;
                        }
                    }
                    
                    // 检查下邻居
                    if (v + 1 < this.V && this.blockArr[h][v + 1]) {
                        let neighbor = this.blockArr[h][v + 1].getComponent(gridCmpt);
                        totalChecked++;
                        if (this.canMakeMatch(current, neighbor)) {
                            console.log(`找到可移动组合：位置(${h},${v})与(${h},${v+1})`);
                            resolve(true);
                            return;
                        }
                    }
                }
            }
            console.log(`检查了${totalChecked}个组合，未发现可移动元素`);
            resolve(false);
        });
    }

    /**
     * 检测两个元素交换后是否能形成消除
     */
    canMakeMatch(grid1: gridCmpt, grid2: gridCmpt): boolean {
        // 如果任一是特效元素，可以移动
        if (this.isBomb(grid1) || this.isBomb(grid2)) {
            return true;
        }
        
        // 模拟交换
        let temp = grid1.type;
        grid1.type = grid2.type;
        grid2.type = temp;
        
        // 检查是否能形成3连
        let canMatch = this.checkPotentialMatch(grid1) || this.checkPotentialMatch(grid2);
        
        // 恢复原状
        temp = grid1.type;
        grid1.type = grid2.type;
        grid2.type = temp;
        
        return canMatch;
    }

    /**
     * 检测指定位置是否能形成3连消除
     */
    checkPotentialMatch(grid: gridCmpt): boolean {
        let type = grid.type;
        let h = grid.h;
        let v = grid.v;
        
        // 检查横向3连
        let horizontalCount = 1;
        // 向左检查
        for (let i = h - 1; i >= 0 && this.blockArr[i] && this.blockArr[i][v]; i--) {
            let neighborGrid = this.blockArr[i][v].getComponent(gridCmpt);
            if (neighborGrid && neighborGrid.type === type) {
                horizontalCount++;
            } else {
                break;
            }
        }
        // 向右检查
        for (let i = h + 1; i < this.H && this.blockArr[i] && this.blockArr[i][v]; i++) {
            let neighborGrid = this.blockArr[i][v].getComponent(gridCmpt);
            if (neighborGrid && neighborGrid.type === type) {
                horizontalCount++;
            } else {
                break;
            }
        }
        if (horizontalCount >= 3) return true;
        
        // 检查纵向3连
        let verticalCount = 1;
        // 向上检查
        for (let i = v - 1; i >= 0 && this.blockArr[h] && this.blockArr[h][i]; i--) {
            let neighborGrid = this.blockArr[h][i].getComponent(gridCmpt);
            if (neighborGrid && neighborGrid.type === type) {
                verticalCount++;
            } else {
                break;
            }
        }
        // 向下检查
        for (let i = v + 1; i < this.V && this.blockArr[h] && this.blockArr[h][i]; i++) {
            let neighborGrid = this.blockArr[h][i].getComponent(gridCmpt);
            if (neighborGrid && neighborGrid.type === type) {
                verticalCount++;
            } else {
                break;
            }
        }
        if (verticalCount >= 3) return true;
        
        return false;
    }

    /**
     * 重新洗牌 - 打乱棋盘元素
     */
    async shuffleBoard() {
        console.log("开始洗牌...");
        
        // 收集所有非特效元素的类型
        let elementTypes = [];
        for (let h = 0; h < this.H; h++) {
            for (let v = 0; v < this.V; v++) {
                if (this.blockArr[h][v]) {
                    let grid = this.blockArr[h][v].getComponent(gridCmpt);
                    if (grid && !this.isBomb(grid)) {
                        elementTypes.push(grid.type);
                    }
                }
            }
        }
        
        console.log(`收集到${elementTypes.length}个普通元素进行洗牌`);
        
        // Fisher-Yates洗牌算法
        for (let i = elementTypes.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [elementTypes[i], elementTypes[j]] = [elementTypes[j], elementTypes[i]];
        }
        
        // 洗牌特效动画
        await this.playShuffleAnimation();
        
        // 重新分配类型到棋盘
        let typeIndex = 0;
        for (let h = 0; h < this.H; h++) {
            for (let v = 0; v < this.V; v++) {
                if (this.blockArr[h][v]) {
                    let grid = this.blockArr[h][v].getComponent(gridCmpt);
                    if (grid && !this.isBomb(grid)) {
                        grid.setType(elementTypes[typeIndex]);
                        typeIndex++;
                    }
                }
            }
        }
        
        console.log("洗牌完成，重新分配了", typeIndex, "个元素");
    }

    /**
     * 播放洗牌特效动画 - 优化版本
     */
    async playShuffleAnimation(): Promise<void> {
        return new Promise(resolve => {
            // 所有元素随机旋转和缩放动画，增加波浪效果
            let animationCount = 0;
            let totalAnimations = 0;
            
            for (let h = 0; h < this.H; h++) {
                for (let v = 0; v < this.V; v++) {
                    if (this.blockArr[h][v]) {
                        let grid = this.blockArr[h][v].getComponent(gridCmpt);
                        if (grid && !this.isBomb(grid)) {
                            totalAnimations++;
                            
                            // 基于位置计算波浪延迟，从左上角向右下角传播
                            let waveDelay = (h + v) * 0.05;
                            // 添加随机因子，让动画更自然
                            let randomDelay = Math.random() * 0.3;
                            let finalDelay = waveDelay + randomDelay;
                            
                            this.scheduleOnce(() => {
                                // 更生动的旋转 + 缩放 + 弹性动画
                                let rotationAngle = (Math.random() - 0.5) * 720; // 更大的旋转角度
                                
                                tween(this.blockArr[h][v])
                                    // 第一阶段：旋转并缩小，添加轻微的位置偏移
                                    .to(0.15, { 
                                        scale: v3(0.05, 0.05, 1),
                                        angle: rotationAngle,
                                        position: v3(
                                            this.blockArr[h][v].position.x + (Math.random() - 0.5) * 20,
                                            this.blockArr[h][v].position.y + (Math.random() - 0.5) * 20,
                                            this.blockArr[h][v].position.z
                                        )
                                    })
                                    // 第二阶段：弹性恢复，回到原位
                                    .to(0.25, { 
                                        scale: v3(1.1, 1.1, 1),
                                        angle: 0,
                                        position: this.blockPosArr[h][v]
                                    })
                                    // 第三阶段：轻微回弹
                                    .to(0.1, { 
                                        scale: v3(1, 1, 1)
                                    })
                                    .call(() => {
                                        animationCount++;
                                        if (animationCount >= totalAnimations) {
                                            resolve();
                                        }
                                    })
                                    .start();
                            }, finalDelay);
                        }
                    }
                }
            }
            
            // 如果没有需要动画的元素，直接完成
            if (totalAnimations === 0) {
                resolve();
            }
            
            // 播放洗牌音效
            App.audio.play('banner_dismiss_audio');
        });
    }

    /**
     * 检查是否需要洗牌并执行
     */
    async checkAndShuffle() {
        let hasPossibleMoves = await this.detectPossibleMoves();
        console.log("检查可移动元素结果:", hasPossibleMoves);
        
        if (!hasPossibleMoves) {
            console.log("没有可移动的元素，开始洗牌");
            await this.shuffleBoard();
            
            // 洗牌后检查是否有可以直接消除的元素
            let hasMatchesAfterShuffle = await this.detectMatches();
            console.log("洗牌后可消除元素检查结果:", hasMatchesAfterShuffle);
            
            if (hasMatchesAfterShuffle) {
                console.log("洗牌后发现可消除元素，开始自动消除");
                // 自动消除洗牌后产生的匹配
                let matchResult = await this.startCheckThree();
                if (matchResult) {
                    // 如果有消除，继续检查是否有连锁消除
                    this.checkAgain();
                }
            } else {
                // 洗牌后没有可消除元素，再次检查可移动性，避免无限循环
                let hasMovesAfterShuffle = await this.detectPossibleMoves();
                console.log("洗牌后可移动元素检查结果:", hasMovesAfterShuffle);
                if (!hasMovesAfterShuffle) {
                    console.log("洗牌后仍无可移动元素，再次洗牌");
                    await this.shuffleBoard();
                    
                    // 再次洗牌后也要检查是否有可消除元素
                    let hasMatchesAfterSecondShuffle = await this.detectMatches();
                    if (hasMatchesAfterSecondShuffle) {
                        console.log("二次洗牌后发现可消除元素，开始自动消除");
                        let matchResult = await this.startCheckThree();
                        if (matchResult) {
                            this.checkAgain();
                        }
                    }
                }
            }
        } else {
            console.log("发现可移动元素，无需洗牌");
        }
    }

    /**
     * 自动消除循环 - 进入游戏后自动检测并消除可消除的元素
     */
    async autoEliminateLoop() {
        console.log("开始自动消除检测...");
        
        // 检测是否有可消除的元素
        let hasMatches = await this.detectMatches();
        
        if (hasMatches) {
            console.log("发现可消除元素，开始自动消除...");
            // 使用现有的checkAgain方法进行消除，它会递归处理所有连锁反应
            this.checkAgain();
        } else {
            console.log("进入游戏时未发现可消除元素");
        }
        
        // 确保用户可以开始游戏
        this.hasStartedTouch = false;
        this.shouldStartChange = false;
    }

    /**
     * 检测当前棋盘是否存在可消除的组合
     * @returns Promise<boolean> 是否存在可消除的组合
     */
    async detectMatches(): Promise<boolean> {
        return new Promise(resolve => {
            for (let i = 0; i < this.H; i++) {
                for (let j = 0; j < this.V; j++) {
                    let item = this.blockArr[i][j];
                    if (!item || item.getComponent(gridCmpt).getMoveState()) continue;
                    
                    let gridComponent = item.getComponent(gridCmpt);
                    
                    // 检查水平方向
                    let hor: gridCmpt[] = this._checkHorizontal(gridComponent);
                    if (hor.length >= 3) {
                        console.log(`发现水平可消除组合，位置: (${i}, ${j}), 长度: ${hor.length}`);
                        resolve(true);
                        return;
                    }
                    
                    // 检查垂直方向
                    let ver: gridCmpt[] = this._checkVertical(gridComponent);
                    if (ver.length >= 3) {
                        console.log(`发现垂直可消除组合，位置: (${i}, ${j}), 长度: ${ver.length}`);
                        resolve(true);
                        return;
                    }
                }
            }
            resolve(false);
        });
    }

    /** 初始化提示系统 */
    initHintSystem() {
        this.clearAllHintTimers();
        this.startIdleTimer();
    }

    /** 重置提示计时器 */
    resetHintTimer() {
        // 清除所有提示相关的计时器
        this.clearAllHintTimers();
        this.stopHintAnimation();
        // 重新开始空闲计时器
        this.startIdleTimer();
    }

    /** 开始空闲计时器（30秒） */
    startIdleTimer() {
        this.idleTimer = setTimeout(() => {
            this.showHintForPossibleMove();
        }, this.IDLE_TIME);
    }

    /** 清除所有提示计时器 */
    clearAllHintTimers() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
        if (this.hintTimer) {
            clearInterval(this.hintTimer);
            this.hintTimer = null;
        }
    }

    /** 停止提示动画 */
    stopHintAnimation() {
        if (this.shouldShowHint && this.hintElements) {
            this.shouldShowHint = false;
            // 恢复被提示元素的正常状态
            this.resetHintElementsScale();
            this.hintElements = null;
        }
    }

    /** 显示可移动元素的提示 */
    async showHintForPossibleMove() {
        console.log("30秒无操作，开始寻找可提示的移动");
        
        const moveInfo = await this.findFirstPossibleMove();
        if (moveInfo) {
            this.hintElements = moveInfo;
            this.shouldShowHint = true;
            console.log(`显示提示：位置(${moveInfo.pos1.h},${moveInfo.pos1.v})与位置(${moveInfo.pos2.h},${moveInfo.pos2.v})`);
            this.startHintAnimation();
        } else {
            console.log("未找到可移动的元素，无法显示提示");
        }
    }

    /** 查找第一个可移动的组合 */
    async findFirstPossibleMove(): Promise<{pos1: {h: number, v: number}, pos2: {h: number, v: number}} | null> {
        return new Promise(resolve => {
            // 遍历所有格子，寻找第一个可移动的组合
            for (let h = 0; h < this.H; h++) {
                for (let v = 0; v < this.V; v++) {
                    if (!this.blockArr[h][v]) continue;
                    let current = this.blockArr[h][v].getComponent(gridCmpt);
                    if (!current) continue;
                    
                    // 检查右邻居
                    if (h + 1 < this.H && this.blockArr[h + 1][v]) {
                        let neighbor = this.blockArr[h + 1][v].getComponent(gridCmpt);
                        if (this.canMakeMatch(current, neighbor)) {
                            resolve({
                                pos1: {h: h, v: v},
                                pos2: {h: h + 1, v: v}
                            });
                            return;
                        }
                    }
                    
                    // 检查下邻居
                    if (v + 1 < this.V && this.blockArr[h][v + 1]) {
                        let neighbor = this.blockArr[h][v + 1].getComponent(gridCmpt);
                        if (this.canMakeMatch(current, neighbor)) {
                            resolve({
                                pos1: {h: h, v: v},
                                pos2: {h: h, v: v + 1}
                            });
                            return;
                        }
                    }
                }
            }
            resolve(null);
        });
    }

    /** 开始提示动画 */
    startHintAnimation() {
        if (!this.hintElements) return;
        
        this.hintTimer = setInterval(() => {
            if (!this.shouldShowHint || !this.hintElements) {
                this.clearAllHintTimers();
                return;
            }
            this.playHintBounce();
        }, this.HINT_INTERVAL);
        
        // 立即播放一次动画
        this.playHintBounce();
    }

    /** 播放提示跳动动画 */
    playHintBounce() {
        if (!this.hintElements) return;
        
        const element1 = this.blockArr[this.hintElements.pos1.h][this.hintElements.pos1.v];
        const element2 = this.blockArr[this.hintElements.pos2.h][this.hintElements.pos2.v];
        
        if (element1) {
            tween(element1)
                .to(0.2, { scale: v3(1.2, 1.2, 1) })
                .to(0.2, { scale: v3(1, 1, 1) })
                .start();
        }
        
        if (element2) {
            tween(element2)
                .to(0.2, { scale: v3(1.2, 1.2, 1) })
                .to(0.2, { scale: v3(1, 1, 1) })
                .start();
        }
    }

    /** 重置提示元素的缩放 */
    resetHintElementsScale() {
        if (!this.hintElements) return;
        
        const element1 = this.blockArr[this.hintElements.pos1.h][this.hintElements.pos1.v];
        const element2 = this.blockArr[this.hintElements.pos2.h][this.hintElements.pos2.v];
        
        if (element1) {
            element1.setScale(1, 1, 1);
        }
        if (element2) {
            element2.setScale(1, 1, 1);
        }
    }

    /** 处理特效元素交换的特殊逻辑 */
    async handleSpecialExchange(one: gridCmpt, two: gridCmpt): Promise<boolean> {
        const isBomb1 = this.isBomb(one);
        const isBomb2 = this.isBomb(two);
        
        // 如果两个都不是炸弹，返回false
        if (!isBomb1 && !isBomb2) {
            return false;
        }
        
        // 如果只有一个是炸弹，不是特殊交换
        if (isBomb1 && !isBomb2 || !isBomb1 && isBomb2) {
            return false;
        }
        
        // 两个都是炸弹的特殊交换逻辑
        console.log(`特效元素交换: ${one.type} 与 ${two.type}`);
        
        // 四消和四消交换 → 特效叠加（已经实现，使用现有逻辑）
        if (this.isFourMatchBomb(one) && this.isFourMatchBomb(two)) {
            console.log("四消与四消交换，使用现有叠加逻辑");
            return false; // 让原有逻辑处理
        }
        
        // 四消和五消交换 → 五消随机选择目标，把所有该目标元素变成四消特效
        if ((this.isFourMatchBomb(one) && this.isFiveMatchBomb(two)) ||
            (this.isFiveMatchBomb(one) && this.isFourMatchBomb(two))) {
            console.log("四消与五消交换，五消随机选择目标并转换为四消特效");
            await this.handleFourFiveExchange(one, two);
            return true;
        }
        
        // 五消和五消交换 → 全屏消除
        if (this.isFiveMatchBomb(one) && this.isFiveMatchBomb(two)) {
            console.log("五消与五消交换，全屏消除");
            await this.handleFiveFiveExchange(one, two);
            return true;
        }
        
        return false;
    }

    /** 判断是否为四消炸弹（横向、竖向、炸弹） */
    isFourMatchBomb(grid: gridCmpt): boolean {
        return grid.type === Bomb.hor || grid.type === Bomb.ver || grid.type === Bomb.bomb;
    }

    /** 判断是否为五消炸弹 */
    isFiveMatchBomb(grid: gridCmpt): boolean {
        return grid.type === Bomb.allSame;
    }

    /** 处理四消与五消交换 */
    async handleFourFiveExchange(one: gridCmpt, two: gridCmpt) {
        // 确定哪个是四消，哪个是五消
        const fourMatch = this.isFourMatchBomb(one) ? one : two;
        const fiveMatch = this.isFiveMatchBomb(one) ? one : two;
        
        console.log(`四消类型: ${fourMatch.type}, 五消类型: ${fiveMatch.type}`);
        
        // 五消随机选择一种目标元素类型
        let targetType = await this.selectRandomTargetType(fiveMatch);
        console.log(`五消选择的目标类型: ${targetType}`);
        
        if (targetType >= 0) {
            // 找到所有该类型的元素，并将它们转换为四消特效
            let convertedElements: gridCmpt[] = [];
            for (let i = 0; i < this.H; i++) {
                for (let j = 0; j < this.V; j++) {
                    let item = this.blockArr[i][j];
                    if (item) {
                        let gridComp = item.getComponent(gridCmpt);
                        if (gridComp && gridComp.type === targetType) {
                            // 将该元素转换为四消特效
                            gridComp.setType(fourMatch.type);
                            convertedElements.push(gridComp);
                            console.log(`位置(${i},${j})的元素从类型${targetType}转换为四消类型${fourMatch.type}`);
                        }
                    }
                }
            }
            console.log(`转换了 ${convertedElements.length} 个元素为四消特效类型 ${fourMatch.type}`);
        }
        
        // 播放五消的视觉效果
        await this.playFiveMatchEffect(fiveMatch);
        
        // 延迟等待转换完成
        await ToolsHelper.delayTime(0.3);
        
        // 收集所有需要触发的炸弹（包括原四消和转换后的四消）
        let bombsToTrigger: gridCmpt[] = [];
        
        // 先添加原四消炸弹
        bombsToTrigger.push(fourMatch);
        
        // 再添加所有转换后的四消炸弹（排除原来的四消位置）
        for (let i = 0; i < this.H; i++) {
            for (let j = 0; j < this.V; j++) {
                let item = this.blockArr[i][j];
                if (item) {
                    let gridComp = item.getComponent(gridCmpt);
                    if (gridComp && gridComp.type === fourMatch.type && 
                        !(gridComp.h === fourMatch.h && gridComp.v === fourMatch.v)) {
                        bombsToTrigger.push(gridComp);
                    }
                }
            }
        }
        
        console.log(`准备触发 ${bombsToTrigger.length} 个四消炸弹（包括原位置和转换后的）`);
        
        // 先收集所有炸弹的影响列表和播放所有特效
        let allAffectedElements: gridCmpt[] = [];
        let bombEffectPromises = [];
        
        for (let bomb of bombsToTrigger) {
            console.log(`触发位置(${bomb.h},${bomb.v})的四消炸弹，类型:${bomb.type}`);
            
            // 播放特效但不获取影响列表（避免节点被销毁问题）
            bombEffectPromises.push(this.playBombEffect(bomb));
            
            // 手动计算影响的元素，避免依赖可能被销毁的节点
            let affectedList = this.calculateBombAffectedElements(bomb);
            
            // 添加到总影响列表（不包括炸弹本身）
            for (let element of affectedList) {
                if (!(element.h === bomb.h && element.v === bomb.v)) {
                    // 避免重复添加
                    if (!allAffectedElements.find(existing => existing.h === element.h && existing.v === element.v)) {
                        allAffectedElements.push(element);
                    }
                }
            }
        }
        
        // 等待所有特效播放完成
        await Promise.all(bombEffectPromises);
        
        // 统一处理所有受影响的元素
        if (allAffectedElements.length > 0) {
            await this.handleSamelistBomb(allAffectedElements);
        }
        
        // 最后移除所有触发过的炸弹
        await ToolsHelper.delayTime(0.2);
        await this.handleSamelistBomb(bombsToTrigger);
    }

    /** 处理五消与五消交换 → 全屏消除 */
    async handleFiveFiveExchange(one: gridCmpt, two: gridCmpt) {
        console.log("五消与五消交换，执行全屏消除");
        
        // 播放两个五消的特效
        await Promise.all([
            this.playFiveMatchEffect(one),
            this.playFiveMatchEffect(two)
        ]);
        
        // 全屏消除所有非炸弹元素
        let allElements: gridCmpt[] = [];
        for (let i = 0; i < this.H; i++) {
            for (let j = 0; j < this.V; j++) {
                let item = this.blockArr[i][j];
                if (item) {
                    let gridComp = item.getComponent(gridCmpt);
                    if (gridComp && !this.isBomb(gridComp)) {
                        allElements.push(gridComp);
                    }
                }
            }
        }
        
        // 统计各个类型的元素数量
        let typeCount = {};
        let targetTypes = this.data.mapData[0].m_id; // 获取目标类型列表
        let targetElementsCount = {};
        
        allElements.forEach(element => {
            if (typeCount[element.type]) {
                typeCount[element.type]++;
            } else {
                typeCount[element.type] = 1;
            }
            
            // 单独统计目标类型的元素数量
            if (targetTypes.includes(element.type)) {
                if (targetElementsCount[element.type]) {
                    targetElementsCount[element.type]++;
                } else {
                    targetElementsCount[element.type] = 1;
                }
            }
        });
        
        console.log(`=== 全屏消除统计 ===`);
        console.log(`总共消除 ${allElements.length} 个元素`);
        console.log(`所有类型分布:`, typeCount);
        console.log(`当前目标类型:`, targetTypes);
        console.log(`目标类型元素数量:`, targetElementsCount);
        console.log(`当前目标完成状态:`, this.coutArr.map((item, index) => `目标${index}[类型${item[0]}]:${item[1]}`));
        
        // 播放全屏消除动画
        App.audio.play("rocket_launch_sound");
        for (let element of allElements) {
            let particle = instantiate(this.particlePre);
            this.effNode.addChild(particle);
            particle.setPosition(one.node.position); // 从第一个五消位置发出粒子
            particle.children.forEach(item => {
                item.active = item.name == "move";
            });
            tween(particle).to(0.5, { position: element.node.position }).call(async (particle) => {
                await ToolsHelper.delayTime(0.2);
                particle.destroy();
            }).start();
        }
        
        await ToolsHelper.delayTime(0.7);
        
        // 处理所有被消除的元素
        await this.handleSamelistBomb(allElements.concat([one, two]));
    }

    /** 为五消选择随机目标类型 */
    async selectRandomTargetType(fiveMatch: gridCmpt): Promise<number> {
        let targetType = -1;
        
        // 先尝试从周围找一个非炸弹类型
        for (let i = fiveMatch.h - 1; i <= fiveMatch.h + 1 && i < this.H; i++) {
            for (let j = fiveMatch.v - 1; j <= fiveMatch.v + 1 && j < this.V; j++) {
                if (i < 0 || j < 0) continue;
                let item = this.blockArr[i][j];
                if (item) {
                    let gridComp = item.getComponent(gridCmpt);
                    if (gridComp && !this.isBomb(gridComp) && targetType < 0) {
                        targetType = gridComp.type;
                        break;
                    }
                }
            }
            if (targetType >= 0) break;
        }
        
        // 如果周围没有找到，随机选择一个类型
        if (targetType < 0) {
            targetType = Math.floor(Math.random() * App.gameLogic.blockCount);
        }
        
        return targetType;
    }

    /** 播放五消特效动画 */
    async playFiveMatchEffect(fiveMatch: gridCmpt) {
        let iconNode = fiveMatch.node.getChildByName('icon');
        if (iconNode) {
            let node = iconNode.getChildByName('Match11');
            if (node) {
                node.getComponent(Sprite).enabled = false;
                let aNode = node.getChildByName('a');
                if (aNode) {
                    aNode.active = true;
                }
                // 停止五消元素的旋转动画
                let rotateComponent = node.getComponent('rotateSelf');
                if (rotateComponent) {
                    node.removeComponent('rotateSelf');
                    console.log("移除五消元素旋转组件");
                }
                // 重置角度为0，确保不再旋转
                node.angle = 0;
            }
        }
    }

    /** 检查并显示胜利弹窗 */
    private checkAndShowWinDialog() {
        console.log(`准备检查胜利弹窗 - 当前飞行动画:${this.flyingAnimationCount}, 已胜利:${this.hasWon}`);
        
        // 如果飞行动画已经结束，立即弹窗
        if (this.flyingAnimationCount <= 0) {
            console.log(`飞行动画已结束，立即弹出胜利弹窗`);
            // 在显示结果弹窗前最终更新星级计算
            this.updateScorePercent();
            console.log(`🌟 最终星级计算详情:`);
            console.log(`  当前分数: ${this.curScore}`);
            console.log(`  分数阈值: [${this.data?.scores?.join(', ')}]`);
            console.log(`  计算出的星数: ${this.starCount}`);
            console.log(`🎯 传递给胜利弹窗的数据: 关卡${this.level}, 星数${this.starCount}`);
            App.view.openView(ViewName.Single.eResultView, this.level, true, this.coutArr, this.starCount);
            return;
        }
        
        // 如果还有飞行动画，等待0.5秒再检查
        this.scheduleOnce(() => {
            console.log(`延迟检查 - 飞行动画:${this.flyingAnimationCount}`);
            if (this.flyingAnimationCount <= 0) {
                console.log(`延迟检查后弹出胜利弹窗`);
                // 在显示结果弹窗前最终更新星级计算
                this.updateScorePercent();
                console.log(`🌟 延迟检查后星级计算详情:`);
                console.log(`  当前分数: ${this.curScore}`);
                console.log(`  分数阈值: [${this.data?.scores?.join(', ')}]`);
                console.log(`  计算出的星数: ${this.starCount}`);
                console.log(`🎯 延迟检查传递给胜利弹窗的数据: 关卡${this.level}, 星数${this.starCount}`);
                App.view.openView(ViewName.Single.eResultView, this.level, true, this.coutArr, this.starCount);
            } else {
                // 递归继续检查
                this.checkAndShowWinDialog();
            }
        }, 0.5);
    }

    /** 销毁时清理计时器 */
    onDestroy() {
        super.onDestroy();
        this.clearAllHintTimers();
        this.stopHintAnimation();
    }
    
    // 兼容旧的按钮绑定系统
    onClick_testBtn() { this.executeDebugAction(); }
    onClick_setBtn() { this.openGameSettings(); }
    onClick_buyBtn() { this.enterShopMode(); }
    async onClick_pauseBtn() { await this.pauseGameplay(); }
    onClick_closeBtn() { 
        // 通过视图管理器正确关闭，确保从allView Map中删除
        App.view.closeView(ViewName.Single.eGameView); 
    }
}