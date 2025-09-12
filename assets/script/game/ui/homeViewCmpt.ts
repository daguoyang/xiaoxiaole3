import { _decorator, Node, Vec3, Prefab, instantiate, v2, ScrollView, PageView, UITransform, Sprite, SpriteFrame, Color, isValid } from 'cc';
import { BaseViewCmpt } from '../../base/baseViewCmpt';
import { ScrollViewCmpt } from '../../base/scrollViewCmpt';
import { EventName } from '../../definitions/eventName';
import { mapCmpt } from './item/mapCmpt';
import { LevelConfig } from '../../definitions/levelConfig';
import { ViewName } from '../../definitions/viewNameConst';
import { App } from '../../core/app';
import { CocosHelper } from '../../helpers/cocosHelper';
import { GlobalFuncHelper } from '../../helpers/globalFuncHelper';
import { ResLoadHelper } from '../../helpers/resLoadHelper';
import { StorageHelper, StorageHelperKey } from '../../helpers/storageHelper';
import { ToolsHelper } from '../../helpers/toolsHelper';
import { Advertise } from '../../wx/advertise';
import { SoundType } from '../../core/audioManager';
const { ccclass, property } = _decorator;

enum Pages {
    shop = 0,      // 隐藏，不使用
    rank = 1,      // 排行页面
    home = 2,      // 主页页面 (默认)
    share = 3,     // 隐藏，不使用
    setting = 4    // 设置页面
}


@ccclass('homeViewCmpt')
export class MainMenuController extends BaseViewCmpt {
    private scrollview: ScrollViewCmpt = null;
    private btnNode: Node = null;
    private localBtn: Node = null;
    private home: Node = null;
    private pageView: PageView = null;
    private isStart: boolean = false;
    private pageTime: number = 0.5;
    private head: Node = null;
    private lbCoin: Node = null;
    private lbLife: Node = null;
    private heartUpdateTimer: any = null; // 体力倒计时更新定时器
    private PagesName = {
        "0": "shopBtn",      // 商店按钮，但功能重定向到广告
        "1": "rankBtn",      // 排行按钮
        "2": "homeBtn",      // 主页按钮
        "3": "shareBtn",     // 分享按钮，但功能已移除
        "4": "settingBtn"    // 设置按钮
    }
    onLoad() {
        super.onLoad();
        
        // 播放主页面背景音乐
        App.audio.play('game_theme_music', SoundType.Music, true);

        // 挂载重写版调试水印/面板（仅开发期显示）
        (async () => {
            try {
                const mod = await import('../../../new-scripts/ui/DebugOverlay');
                // @ts-ignore
                mod.DebugOverlay.mount();
            } catch (e) {
                // 忽略旧版本缺少模块的情况
            }
        })();
        
        this.btnNode = this.viewList.get("bottom/btn");
        this.pageView = this.viewList.get("page").getComponent(PageView);
        this.home = this.viewList.get("page/view/content/home");
        this.lbLife = this.viewList.get("page/view/content/home/top/life/lbLife");
        this.lbCoin = this.viewList.get("page/view/content/home/top/coin/lbCoin");
        this.head = this.viewList.get("page/view/content/home/top/head");
        this.localBtn = this.viewList.get("page/view/content/home/localBtn");
        this.localBtn.active = false;
        this.scrollview = this.viewList.get('page/view/content/home/scrollview').getComponent(ScrollViewCmpt);
        this.scrollview.node.on("scroll-to-top", this.scrollingToTop, this);
        App.event.on(EventName.Game.UpdataGold, this.initData, this);
        App.event.on(EventName.Game.Scrolling, this.evtScrolling, this);
        App.event.on(EventName.Game.Scrolling, this.evtScrolling, this);
        App.event.on(EventName.Game.GotoShop, this.evtGotoShop, this);
        App.event.on(EventName.Game.UpdateAvatar, this.evtUpdateAvatar, this);
        App.event.on(EventName.Game.HeartUpdate, this.updateHeartInfo, this);
        this.pageView.node.on('page-turning', this.evtPageView, this);
        
        // 隐藏商店和分享按钮
        this.hideShopAndShareButtons();
        
        // 直接重新排列按钮（背景图片已直接替换）
        this.scheduleOnce(() => {
            this.rearrangeBottomButtons();
        }, 0.1);
        
        // 延迟再次强制清理，确保所有元素都被处理
        this.scheduleOnce(() => {
            this.forceCleanupUI();
        }, 0.5);
    }

    onDestroy() {
        super.onDestroy();
        App.event.off(EventName.Game.UpdataGold, this);
        App.event.off(EventName.Game.UpdateAvatar, this);
        App.event.off(EventName.Game.HeartUpdate, this);
        
        // 清理体力更新定时器
        if (this.heartUpdateTimer) {
            clearInterval(this.heartUpdateTimer);
            this.heartUpdateTimer = null;
        }
    }
    async loadExtraData(isStart: boolean, pageIndex: number = 2) {
        App.view.closeView(ViewName.Single.eLoadingView);
        App.view.closeView(ViewName.Single.eGameView);
        App.view.closeView(ViewName.Single.eAcrossView);

        this.isStart = isStart;
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == pageIndex;
        });
        console.log("this.PagesName[`${pageIndex}`]   " + this.PagesName[`${pageIndex}`])
        this.showSelectedBtn(this.PagesName[`${pageIndex}`]);
        this.initData();//shetting里面初始化事件触发
        Advertise.showBannerAds();
    }

    async initData() {
        if (!this.home.active) return;
        let list = [];
        let lv = LevelConfig.getCurLevel();
        let index = Math.ceil(lv / 8) + 4;
        for (let i = index; i >= 1; i--) {
            list.push(i);
        }
        this.scrollview.content.removeAllChildren();
        this.scrollview.initData({ list: list, target: this });
        let offsetY = this.scrollview.getMaxScrollOffset().y;
        this.scrollview.scrollToOffset(v2(0, offsetY - Math.floor(lv / 8) * 1024), 1);
        this.continueGame();
        this.setHomeInfo();
    }

    setHomeInfo() {
        CocosHelper.updateUserHeadSpriteAsync(this.head, App.user.rankData.icon);
        this.updateLocalBtnAvatar();
        CocosHelper.updateLabelText(this.lbCoin, GlobalFuncHelper.getGold());
        this.updateHeartInfo();
    }
    
    /** 更新体力显示 - 主页显示格式为 "3/5" 带倒计时 */
    updateHeartInfo() {
        if (!this.viewList || !isValid(this.node)) {
            console.warn('主页组件已销毁，跳过 updateHeartInfo');
            return;
        }
        
        const currentHeart = App.heartManager.getCurrentHeart();
        const maxHeart = App.heartManager.getMaxHeart();
        let heartText = `${currentHeart}/${maxHeart}`;
        
        // 如果不是满体力，显示下次恢复倒计时
        if (currentHeart < maxHeart) {
            const countdown = App.heartManager.getNextRecoverCountdown();
            if (countdown > 0) {
                const timeStr = App.heartManager.formatCountdown(countdown);
                heartText += `\n${timeStr}`;
            }
            
            // 启动倒计时更新定时器
            this.startHeartUpdateTimer();
        } else {
            // 满体力时停止定时器
            this.stopHeartUpdateTimer();
        }
        
        CocosHelper.updateLabelText(this.lbLife, heartText);
    }
    
    /** 启动体力倒计时更新定时器 */
    startHeartUpdateTimer() {
        // 如果已经有定时器在运行，先清除
        if (this.heartUpdateTimer) {
            return;
        }
        
        // 每秒更新一次倒计时
        this.heartUpdateTimer = setInterval(() => {
            const currentHeart = App.heartManager.getCurrentHeart();
            const maxHeart = App.heartManager.getMaxHeart();
            
            if (currentHeart >= maxHeart) {
                // 满体力时停止定时器
                this.stopHeartUpdateTimer();
                this.updateHeartInfo();
                return;
            }
            
            let heartText = `${currentHeart}/${maxHeart}`;
            const countdown = App.heartManager.getNextRecoverCountdown();
            
            // 关键修复：如果倒计时<=1秒，主动触发体力检查
            if (countdown <= 1) {
                console.log('倒计时即将结束，主动检查体力恢复');
                App.heartManager.checkHeartRecover();
                // 重新获取更新后的数据
                const newHeart = App.heartManager.getCurrentHeart();
                if (newHeart > currentHeart) {
                    // 体力已恢复，直接更新UI
                    console.log(`体力已恢复: ${currentHeart} -> ${newHeart}`);
                    this.updateHeartInfo();
                    return;
                }
            }
            
            if (countdown > 0) {
                const timeStr = App.heartManager.formatCountdown(countdown);
                heartText += `\n${timeStr}`;
            }
            
            CocosHelper.updateLabelText(this.lbLife, heartText);
        }, 1000);
    }
    
    /** 停止体力倒计时更新定时器 */
    stopHeartUpdateTimer() {
        if (this.heartUpdateTimer) {
            clearInterval(this.heartUpdateTimer);
            this.heartUpdateTimer = null;
        }
    }

    /** 更新下方弹出按钮的头像 */
    updateLocalBtnAvatar() {
        if (this.localBtn && App.user && App.user.rankData) {
            CocosHelper.updateUserHeadSpriteAsync(this.localBtn, App.user.rankData.icon);
        }
    }

    continueGame() {
        if (!this.isStart) return;
        this.scheduleOnce(() => {
            let lv = App.gameLogic.curLevel;
            App.view.openView(ViewName.Single.eChallengeView, lv);
        }, 1);
    }

    evtScrolling(node: Node) {
        let off1 = this.scrollview.getScrollOffset().y;
        let offsetY = this.scrollview.getMaxScrollOffset().y;
        let lv = App.gameLogic.curLevel;
        let off2 = offsetY - Math.floor(lv / 8) * 1024;
        let gap = Math.abs(off1 - off2);
        this.localBtn.active = gap > 1300;
    }

    /** 滚动到顶端了，给个解锁更多的提示 */
    async scrollingToTop() {
        App.view.showMsgTips("先完成前面关卡即可解锁更多关卡");
    }

    pressLocalButton() {
        App.audio.play('ui_touch_feedback');
        let offsetY = this.scrollview.getMaxScrollOffset().y;
        let lv = App.gameLogic.curLevel;
        this.scrollview.scrollToOffset(v2(0, offsetY - Math.floor(lv / 8) * 1024), 1);
        this.localBtn.active = false;
    }

    selectPlayerHead() {
        App.audio.play('ui_touch_feedback');
        this.showSelectedBtn('settingBtn');
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.setting;
        });
    }

    evtGotoShop() {
        // 跳转商店逻辑改为显示广告
        console.log("显示广告（重写版由新模块管理ID）");
        Advertise.showVideoAds();
    }

    openSettingsPanel(node: Node) {
        App.audio.play('ui_touch_feedback');
        this.showSelectedBtn(node.name);
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.setting;
        });
        this.pageView.scrollToPage(Pages.setting, this.pageTime);
    }
    openShopPanel(node: Node) {
        App.audio.play('ui_touch_feedback');
        this.showSelectedBtn(node.name);
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.shop;
        });
        this.pageView.scrollToPage(Pages.shop, this.pageTime);
    }
    returnToHome(node: Node) {
        App.audio.play('ui_touch_feedback');
        this.showSelectedBtn(node.name);
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.home;
        });
        this.pageView.scrollToPage(Pages.home, this.pageTime);
        if (this.scrollview.content.children.length < 1) {
            this.initData();
        }
    }
    showRankingList(node: Node) {
        App.audio.play('ui_touch_feedback');
        this.showSelectedBtn(node.name);
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.rank;
        });
        this.pageView.scrollToPage(Pages.rank, this.pageTime);
    }
    shareGameResult(node: Node) {
        App.audio.play('ui_touch_feedback');
        this.showSelectedBtn(node.name);
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.share;
        });
        this.pageView.scrollToPage(Pages.share, this.pageTime);
    }

    showSelectedBtn(n: string) {
        if (!this.btnNode) return;
        
        this.btnNode.children.forEach(item => {
            // 只处理可见的按钮
            if (item.active) {
                let selectedNode = item.getChildByName("s");
                let normalNode = item.getChildByName("n");
                
                if (selectedNode) {
                    selectedNode.active = n == item.name;
                }
                if (normalNode) {
                    normalNode.active = n != item.name;
                }
                
                // 确保按钮本身可见
                item.opacity = 255;
                
                console.log(`按钮 ${item.name}: s=${selectedNode?.active}, n=${normalNode?.active}`);
            }
        })
    }

    evtPageView(pv: PageView) {
        let pageIndex = pv.getCurrentPageIndex();
        if (pageIndex == 2) { // 主页是索引2
            this.setHomeInfo();
        } else {
            // 离开主页时停止体力倒计时定时器
            this.stopHeartUpdateTimer();
        }
    }

    /** 头像更新事件处理 */
    evtUpdateAvatar() {
        // 立即更新主页头像和地图头像
        CocosHelper.updateUserHeadSpriteAsync(this.head, App.user.rankData.icon);
        this.updateLocalBtnAvatar();
        // 更新地图组件中的头像
        this.updateMapAvatars();
    }

    /** 更新地图中的头像 */
    updateMapAvatars() {
        // 获取地图滚动视图中的所有地图组件
        let mapNodes = this.scrollview.node.getComponentsInChildren(mapCmpt);
        mapNodes.forEach(map => {
            if (map.updateLocalAvatar) {
                map.updateLocalAvatar();
            }
        });
    }

    activateSharePage() {
        App.audio.play('ui_touch_feedback');
        console.log("显示广告（重写版由新模块管理ID）");
        Advertise.showVideoAds();
    }

    /**
     * 隐藏商店和分享按钮，只保留排行、主页、设置三个按钮
     */
    hideShopAndShareButtons() {
        if (!this.btnNode) return;
        
        // 隐藏商店按钮 (shopBtn)
        let shopBtn = this.btnNode.getChildByName('shopBtn');
        if (shopBtn) {
            shopBtn.active = false;
            console.log("已隐藏商店按钮");
        }
        
        // 隐藏分享按钮 (shareBtn)
        let shareBtn = this.btnNode.getChildByName('shareBtn');
        if (shareBtn) {
            shareBtn.active = false;
            console.log("已隐藏分享按钮");
        }
    }

    /** 更换底部背景图片为3按钮版本 */
    async changeToThreeButtonBackground() {
        if (!this.btnNode) return;
        
        try {
            // 加载新的3按钮背景图片
            let spriteFrame: SpriteFrame = null;
            
            const paths = [
                'ui/Sprite/acheck/functionbg_3btn',
                'functionbg_3btn',
                'Sprite/acheck/functionbg_3btn',
                'acheck/functionbg_3btn'
            ];
            
            for (const path of paths) {
                try {
                    console.log(`尝试加载路径: ${path}`);
                    spriteFrame = await ResLoadHelper.loadCommonAssetSync(path, SpriteFrame);
                    if (spriteFrame) {
                        console.log(`✅ 成功加载背景图片: ${path}`);
                        break;
                    }
                } catch (error) {
                    console.log(`路径 ${path} 加载失败: ${error.message}`);
                }
            }
            
            if (spriteFrame) {
                // 递归查找所有包含 Sprite 组件的节点
                const findSpriteNodes = (node: Node): Node[] => {
                    const result: Node[] = [];
                    const sprite = node.getComponent(Sprite);
                    if (sprite) {
                        result.push(node);
                    }
                    for (const child of node.children) {
                        result.push(...findSpriteNodes(child));
                    }
                    return result;
                };
                
                const spriteNodes = findSpriteNodes(this.btnNode);
                console.log(`找到 ${spriteNodes.length} 个包含Sprite组件的节点`);
                
                // 尝试替换所有可能的背景图片
                let replaced = false;
                for (const spriteNode of spriteNodes) {
                    const sprite = spriteNode.getComponent(Sprite);
                    if (sprite && sprite.spriteFrame) {
                        const originalName = sprite.spriteFrame.name;
                        console.log(`检查节点 ${spriteNode.name}，原图片: ${originalName}`);
                        
                        // 如果是 functionbg 相关的图片，就替换
                        if (originalName && originalName.includes('functionbg')) {
                            sprite.spriteFrame = spriteFrame;
                            console.log(`✅ 成功替换节点 ${spriteNode.name} 的背景图片`);
                            replaced = true;
                        }
                    }
                }
                
                if (!replaced) {
                    console.log('❌ 未找到需要替换的背景图片');
                    // 列出所有找到的图片，用于调试
                    spriteNodes.forEach((node, index) => {
                        const sprite = node.getComponent(Sprite);
                        const name = sprite?.spriteFrame?.name || 'null';
                        console.log(`  节点${index}: ${node.name} -> ${name}`);
                    });
                }
            } else {
                console.log('❌ 加载3按钮背景图片失败');
            }
        } catch (error) {
            console.error('❌ 更换背景图片时发生错误:', error);
        }
    }
    
    /** 重新排列底部按钮，只显示三个：排行、主页、设置 */
    rearrangeBottomButtons() {
        if (!this.btnNode) return;
        
        // 获取所有按钮
        let rankBtn = this.btnNode.getChildByName('rankBtn');
        let homeBtn = this.btnNode.getChildByName('homeBtn'); 
        let settingBtn = this.btnNode.getChildByName('settingBtn');
        
        if (!rankBtn || !homeBtn || !settingBtn) {
            console.error('❌ 找不到必要的按钮');
            return;
        }

        // 将三个按钮均匀分布
        // 分成3个区域，每个区域宽度约为 379px
        const positions = [
            -379,  // 左区域中心 (rankBtn)
            0,     // 中心区域中心 (homeBtn) 
            379    // 右区域中心 (settingBtn)
        ];
        
        // 重新定位按钮
        rankBtn.position = new Vec3(positions[0], rankBtn.position.y, rankBtn.position.z);
        homeBtn.position = new Vec3(positions[1], homeBtn.position.y, homeBtn.position.z);
        settingBtn.position = new Vec3(positions[2], settingBtn.position.y, settingBtn.position.z);
        
        // 确保按钮可见并移除蒙层
        [rankBtn, homeBtn, settingBtn].forEach(btn => {
            btn.active = true;
            btn.opacity = 255;
            btn.scale = new Vec3(1, 1, 1);
            
            // 移除白色蒙层
            this.removeButtonOverlay(btn);
        });
        
        // 隐藏分割线
        this.hideDividerLines();
        
        console.log('✅ 按钮重新排列完成');
    }
    
    /** 调试：打印按钮节点结构 */
    debugButtonStructure() {
        if (!this.btnNode) return;
        
        console.log('=== 按钮节点结构调试 ===');
        
        const printNode = (node: Node, indent: string = '') => {
            const sprite = node.getComponent(Sprite);
            const transform = node.getComponent(UITransform);
            const color = sprite ? sprite.color : null;
            const size = transform ? `${transform.width}x${transform.height}` : 'no-size';
            
            console.log(`${indent}${node.name} [${size}] ${sprite ? 'Sprite' : 'NoSprite'} ${color ? `rgba(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)},${Math.round(color.a)})` : ''} active=${node.active}`);
            
            node.children.forEach(child => {
                printNode(child, indent + '  ');
            });
        };
        
        printNode(this.btnNode);
        console.log('=== 调试结束 ===');
    }
    
    /** 隐藏分割线和蒙层 */
    hideDividerLines() {
        if (!this.btnNode) return;
        
        // 先调试查看结构
        this.debugButtonStructure();
        
        // 强制隐藏所有可能的分割线和蒙层
        const forceHide = (node: Node) => {
            node.children.forEach(child => {
                const sprite = child.getComponent(Sprite);
                const transform = child.getComponent(UITransform);
                const name = child.name.toLowerCase();
                
                let shouldHide = false;
                let reason = '';
                
                // 检查名称 - 扩展分割线关键词
                if (name.includes('line') || name.includes('divider') || 
                    name.includes('border') || name.includes('separator') ||
                    name.includes('mask') || name.includes('overlay') ||
                    name.includes('split') || name.includes('gap') ||
                    name.includes('bar') || name.includes('strip') ||
                    name.includes('fence') || name.includes('wall')) {
                    shouldHide = true;
                    reason = 'name-match';
                }
                // 检查尺寸 - 很细的垂直或水平线，更宽松的检测
                else if (transform && sprite) {
                    // 垂直分割线：宽度很小，高度较大
                    if (transform.width <= 20 && transform.height > 50) {
                        shouldHide = true;
                        reason = 'thin-vertical-line';
                    }
                    // 水平分割线：高度很小，宽度较大
                    else if (transform.height <= 20 && transform.width > 50) {
                        shouldHide = true;
                        reason = 'thin-horizontal-line';
                    }
                }
                // 检查颜色 - 黑色或深色分割线，包括灰色线条
                else if (sprite && sprite.color && transform) {
                    const color = sprite.color;
                    // 深色线条（黑色、深灰色）
                    if ((color.r < 100 && color.g < 100 && color.b < 100 && color.a > 150) ||
                        // 灰色细线
                        (color.r > 100 && color.r < 180 && Math.abs(color.r - color.g) < 20 && Math.abs(color.g - color.b) < 20)) {
                        
                        // 必须是细线才隐藏，避免误隐藏大面积元素
                        if ((transform.width <= 30 && transform.height > 20) || 
                            (transform.height <= 30 && transform.width > 20)) {
                            shouldHide = true;
                            reason = 'dark-thin-line';
                        }
                    }
                }
                
                if (shouldHide && child.active) {
                    child.active = false;
                    console.log(`🚫 强制隐藏: ${child.name} (${reason}) [${transform ? transform.width + 'x' + transform.height : 'no-size'}]`);
                }
                
                // 递归处理子节点
                if (child.children.length > 0) {
                    forceHide(child);
                }
            });
        };
        
        forceHide(this.btnNode);
        
        // 超强力分割线检测 - 直接遍历背景容器的所有子节点
        this.ultraForceHideDividers();
    }
    
    /** 超强力分割线隐藏 - 最后手段 */
    ultraForceHideDividers() {
        console.log('⚡ 启动超强力分割线检测...');
        
        // 从根节点开始搜索所有可能的分割线
        const searchNode = this.btnNode.parent || this.btnNode;
        
        const ultraHide = (node: Node, depth: number = 0) => {
            const indent = '  '.repeat(depth);
            
            node.children.forEach(child => {
                const sprite = child.getComponent(Sprite);
                const transform = child.getComponent(UITransform);
                const name = child.name.toLowerCase();
                
                if (sprite && transform && child.active) {
                    const color = sprite.color;
                    let shouldHide = false;
                    let reason = '';
                    
                    // 超宽松的细线检测 - 任何细长的元素
                    const aspectRatio = transform.width / transform.height;
                    const isVeryThin = (transform.width <= 50 && transform.height > 100) ||
                                      (transform.height <= 50 && transform.width > 100);
                    const isExtremeThin = (transform.width <= 10) || (transform.height <= 10);
                    
                    // 如果是极细的元素
                    if (isExtremeThin && (transform.width > 30 || transform.height > 30)) {
                        shouldHide = true;
                        reason = 'extreme-thin';
                    }
                    // 如果是很细的元素且不是按钮
                    else if (isVeryThin && !name.includes('btn') && !name.includes('button')) {
                        shouldHide = true;
                        reason = 'very-thin-non-button';
                    }
                    // 纯色细线检测
                    else if (color && transform.width * transform.height < 5000) { // 面积小于5000的小元素
                        // 单色元素且形状细长
                        if ((color.r === color.g && color.g === color.b) && // 灰度色
                            (aspectRatio > 10 || aspectRatio < 0.1)) { // 宽高比极端
                            shouldHide = true;
                            reason = 'monochrome-thin-line';
                        }
                    }
                    
                    if (shouldHide) {
                        child.active = false;
                        console.log(`${indent}⚡ 超强力隐藏: ${child.name} (${reason}) [${transform.width}x${transform.height}] ratio=${aspectRatio.toFixed(2)}`);
                    }
                }
                
                // 继续递归，但跳过按钮内部
                if (!name.includes('btn') && !name.includes('button')) {
                    ultraHide(child, depth + 1);
                }
            });
        };
        
        ultraHide(searchNode);
        console.log('⚡ 超强力检测完成');
    }
    
    /** 移除按钮的白色蒙层效果 */
    removeButtonOverlay(btn: Node) {
        if (!btn) return;
        
        console.log(`🔍 检查按钮 ${btn.name} 的蒙层...`);
        
        // 递归处理所有子节点的白色蒙层
        const processNode = (node: Node, depth: number = 0) => {
            const sprite = node.getComponent(Sprite);
            const indent = '  '.repeat(depth);
            
            if (sprite && sprite.color) {
                const color = sprite.color;
                const name = node.name.toLowerCase();
                
                console.log(`${indent}检查节点: ${node.name} rgba(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)},${Math.round(color.a)})`);
                
                let shouldRemove = false;
                let reason = '';
                
                // 检查是否是白色或接近白色的蒙层
                if (color.r > 180 && color.g > 180 && color.b > 180) {
                    // 半透明白色蒙层 - 这些通常是真正的蒙层
                    if (color.a > 0 && color.a < 200) {
                        shouldRemove = true;
                        reason = 'semi-transparent-white';
                    }
                    // 特殊处理：只移除mask和overlay，不要移除n节点（普通状态）
                    else if (name.includes('mask') || name.includes('overlay') || 
                        name.includes('disabled') || name.includes('cover') ||
                        name.includes('selected')) {
                        shouldRemove = true;
                        reason = 'name-based-white';
                    }
                }
                
                // 强制检查特定名称的节点，但排除普通状态的n节点
                if (name.includes('mask') || name.includes('overlay')) {
                    shouldRemove = true;
                    reason = 'forced-name-match';
                }
                // 只处理半透明的s节点，不处理n节点
                else if (name === 's' && color.a > 0 && color.a < 255) {
                    shouldRemove = true;
                    reason = 'semi-transparent-s';
                }
                
                if (shouldRemove) {
                    const oldAlpha = color.a;
                    sprite.color = new Color(color.r, color.g, color.b, 0);
                    console.log(`${indent}🎯 移除蒙层: ${node.name} (${reason}) alpha: ${oldAlpha} -> 0`);
                }
            }
            
            // 递归处理子节点
            node.children.forEach(child => {
                processNode(child, depth + 1);
            });
        };
        
        processNode(btn);
    }
    
    /** 强制清理UI - 最后的清理步骤 */
    forceCleanupUI() {
        console.log('🧹 执行强制UI清理...');
        
        if (!this.btnNode) return;
        
        // 再次隐藏分割线
        this.hideDividerLines();
        
        // 再次处理按钮蒙层
        let rankBtn = this.btnNode.getChildByName('rankBtn');
        let homeBtn = this.btnNode.getChildByName('homeBtn'); 
        let settingBtn = this.btnNode.getChildByName('settingBtn');
        
        [rankBtn, homeBtn, settingBtn].forEach(btn => {
            if (btn) {
                this.removeButtonOverlay(btn);
            }
        });
        
        // 强制设置所有可见按钮的透明度
        this.btnNode.children.forEach(btn => {
            if (btn.active) {
                btn.opacity = 255;
                
                // 强制设置所有子节点可见
                btn.children.forEach(child => {
                    if (child.name === 'n' || child.name === 's') {
                        child.opacity = 255;
                    }
                });
            }
        });
        
        console.log('🧹 强制清理完成');
    }
    
    // 兼容旧的按钮绑定系统
    onClick_localBtn() { this.pressLocalButton(); }
    onClick_head() { this.selectPlayerHead(); }
    onClick_settingBtn(node: Node) { this.openSettingsPanel(node); }
    onClick_shopBtn(node: Node) { this.openShopPanel(node); }
    onClick_homeBtn(node: Node) { this.returnToHome(node); }
    onClick_rankBtn(node: Node) { this.showRankingList(node); }
    onClick_shareBtn(node: Node) { this.shareGameResult(node); }
    onClick_sharePageBtn() { this.activateSharePage(); }
    onClick_closeBtn() { 
        // 通过视图管理器正确关闭，确保从allView Map中删除
        App.view.closeView(ViewName.Single.eHomeView); 
    }

}
