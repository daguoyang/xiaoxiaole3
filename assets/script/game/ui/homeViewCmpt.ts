import { _decorator, Node, Vec3, Prefab, instantiate, v2, ScrollView, PageView } from 'cc';
import { BaseViewCmpt } from '../../components/baseViewCmpt';
import { ScrollViewCmpt } from '../../components/scrollViewCmpt';
import { EventName } from '../../const/eventName';
import { mapCmpt } from './item/mapCmpt';
import { LevelConfig } from '../../const/levelConfig';
import { ViewName } from '../../const/viewNameConst';
import { App } from '../../core/app';
import { CocosHelper } from '../../utils/cocosHelper';
import { GlobalFuncHelper } from '../../utils/globalFuncHelper';
import { ResLoadHelper } from '../../utils/resLoadHelper';
import { StorageHelper, StorageHelperKey } from '../../utils/storageHelper';
import { ToolsHelper } from '../../utils/toolsHelper';
import { Advertise } from '../../wx/advertise';
const { ccclass, property } = _decorator;

enum Pages {
    shop = 0,      // 隐藏，不使用
    rank = 1,      // 排行页面
    home = 2,      // 主页页面 (默认)
    share = 3,     // 隐藏，不使用
    setting = 4    // 设置页面
}


@ccclass('homeViewCmpt')
export class homeViewCmpt extends BaseViewCmpt {
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

    onClick_localBtn() {
        App.audio.play('button_click');
        let offsetY = this.scrollview.getMaxScrollOffset().y;
        let lv = App.gameLogic.curLevel;
        this.scrollview.scrollToOffset(v2(0, offsetY - Math.floor(lv / 8) * 1024), 1);
        this.localBtn.active = false;
    }

    onClick_head() {
        App.audio.play('button_click');
        this.showSelectedBtn('settingBtn');
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.setting;
        });
    }

    evtGotoShop() {
        // 跳转商店逻辑改为显示广告
        console.log("显示广告，广告ID：adunit-7fc34b1dba8ed852");
        Advertise.showVideoAds();
    }

    onClick_settingBtn(node: Node) {
        App.audio.play('button_click');
        this.showSelectedBtn(node.name);
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.setting;
        });
        this.pageView.scrollToPage(Pages.setting, this.pageTime);
    }
    onClick_shopBtn(node: Node) {
        App.audio.play('button_click');
        this.showSelectedBtn(node.name);
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.shop;
        });
        this.pageView.scrollToPage(Pages.shop, this.pageTime);
    }
    onClick_homeBtn(node: Node) {
        App.audio.play('button_click');
        this.showSelectedBtn(node.name);
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.home;
        });
        this.pageView.scrollToPage(Pages.home, this.pageTime);
        if (this.scrollview.content.children.length < 1) {
            this.initData();
        }
    }
    onClick_rankBtn(node: Node) {
        App.audio.play('button_click');
        this.showSelectedBtn(node.name);
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.rank;
        });
        this.pageView.scrollToPage(Pages.rank, this.pageTime);
    }
    onClick_shareBtn(node: Node) {
        App.audio.play('button_click');
        this.showSelectedBtn(node.name);
        this.pageView.getPages().forEach((item, idx) => {
            item.active = idx == Pages.share;
        });
        this.pageView.scrollToPage(Pages.share, this.pageTime);
    }

    showSelectedBtn(n: string) {
        this.btnNode.children.forEach(item => {
            // 只处理可见的按钮
            if (item.active) {
                let selectedNode = item.getChildByName("s");
                let normalNode = item.getChildByName("n");
                if (selectedNode) selectedNode.active = n == item.name;
                if (normalNode) normalNode.active = n != item.name;
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

    onClick_sharePageBtn() {
        App.audio.play('button_click');
        console.log("显示广告，广告ID：adunit-7fc34b1dba8ed852");
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
        
        // 调整剩余三个按钮的位置，使其居中分布
        this.adjustButtonLayout();
    }

    /**
     * 调整按钮布局，让三个按钮(排行、主页、设置)居中分布
     */
    adjustButtonLayout() {
        if (!this.btnNode) return;
        
        let activeButtons = [];
        let buttonNames = ['rankBtn', 'homeBtn', 'settingBtn'];
        
        // 收集所有激活的按钮
        buttonNames.forEach(name => {
            let btn = this.btnNode.getChildByName(name);
            if (btn && btn.active) {
                activeButtons.push(btn);
            }
        });
        
        // 重新排布三个按钮的位置
        if (activeButtons.length === 3) {
            // 假设按钮容器宽度，三个按钮平均分布
            let containerWidth = this.btnNode.getComponent('UITransform')?.width || 600;
            let buttonSpacing = containerWidth / 4; // 分成4段，按钮占中间3段
            
            activeButtons.forEach((btn, index) => {
                let pos = btn.getPosition();
                // 重新设置x坐标：-buttonSpacing, 0, buttonSpacing
                pos.x = (index - 1) * buttonSpacing;
                btn.setPosition(pos);
            });
            
            console.log("已调整按钮布局为三个按钮居中分布");
        }
    }

}