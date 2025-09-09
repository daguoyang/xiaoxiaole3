import { _decorator, Component, Node } from 'cc';
import { BaseViewCmpt } from '../../base/baseViewCmpt';
import { ScrollViewCmpt } from '../../base/scrollViewCmpt';
import { RankData } from '../../definitions/enumConst';
import { LevelConfig } from '../../definitions/levelConfig';
import { RankConfig } from '../../definitions/rankConfig';
import { App } from '../../core/app';
import { Net } from '../../net/net';
import { Router } from '../../net/routers';
import { GlobalFuncHelper } from '../../helpers/globalFuncHelper';
import { StorageHelper, StorageHelperKey } from '../../helpers/storageHelper';
import { rankItemCmpt } from './item/rankItemCmpt';
const { ccclass, property } = _decorator;

@ccclass('rankCmpt')
export class RankCmpt extends BaseViewCmpt {
    private scrollView: ScrollViewCmpt = null;
    onLoad() {
        super.onLoad();
        this.scrollView = this.viewList.get('rankScroll').getComponent(ScrollViewCmpt);
        this.initData();
    }

    initData() {
        this.evtRankList(null);
    }

    evtRankList(data) {
        let list: RankData[] = [];
        let rdt: RankData = {
            star: GlobalFuncHelper.getGold(),
            id: 0,
            level: LevelConfig.getCurLevel(),
            icon: GlobalFuncHelper.getIcon(),
            name: App.user.rankData.name,
            time: "",
            rank: 0,
        }
        list.push(rdt);
        this.setRankList(list);
    }

    setRankList(list?: RankData[]) {
        let arr = RankConfig.getData(); // 使用新的getData方法，自动执行每日更新
        if (list) {
            arr = arr.concat(list);
        }
        arr.sort((a, b) => { return -a.level + b.level });
        for (let i = 0; i < arr.length; i++) {
            arr[i].rank = i + 1;
        }

        if (!this.scrollView) {
            this.scrollView = this.viewList.get('rankScroll').getComponent(ScrollViewCmpt);
        }
        this.scrollView.initData({ list: arr, target: this });
        this.scrollView.scrollToTop(1);
    }
}


