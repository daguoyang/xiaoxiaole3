import { StorageHelper, StorageHelperKey } from "../helpers/storageHelper";
import { LevelCfgData, RankData } from "./enumConst";

class config {
    public data: RankData[] = [
        { "id": 1, "name": "阿狸", "level": 800, "gold": 8000, "star": 800, "icon": 1 },
        { "id": 2, "name": "王大锤Online", "level": 797, "gold": 7970, "star": 797, "icon": 2 },
        { "id": 3, "name": "小白同学✿", "level": 794, "gold": 7940, "star": 794, "icon": 3 },
        { "id": 4, "name": "Tony_99", "level": 791, "gold": 7910, "star": 791, "icon": 4 },
        { "id": 5, "name": "专业挖墙角", "level": 788, "gold": 7880, "star": 788, "icon": 5 },
        { "id": 6, "name": "兎孒菈菈℡", "level": 785, "gold": 7850, "star": 785, "icon": 6 },
        { "id": 7, "name": "影子刺客27", "level": 782, "gold": 7820, "star": 782, "icon": 7 },
        { "id": 8, "name": "旧梦如风﹌", "level": 779, "gold": 7790, "star": 779, "icon": 8 },
        { "id": 9, "name": "社恐患者一枚", "level": 776, "gold": 7760, "star": 776, "icon": 9 },
        { "id": 10, "name": "star★light", "level": 773, "gold": 7730, "star": 773, "icon": 1 },
        { "id": 11, "name": "隔壁老王", "level": 770, "gold": 7700, "star": 770, "icon": 2 },
        { "id": 12, "name": "Butterflyつ恋", "level": 767, "gold": 7670, "star": 767, "icon": 3 },
        { "id": 13, "name": "游戏小能手233", "level": 764, "gold": 7640, "star": 764, "icon": 4 },
        { "id": 14, "name": "o(=•ェ•=)m猫猫头", "level": 761, "gold": 7610, "star": 761, "icon": 5 },
        { "id": 15, "name": "吃瓜第一线", "level": 758, "gold": 7580, "star": 758, "icon": 6 },
        { "id": 16, "name": "暖风十里不如你", "level": 755, "gold": 7550, "star": 755, "icon": 7 },
        { "id": 17, "name": "Lucky丶小七", "level": 752, "gold": 7520, "star": 752, "icon": 8 },
        { "id": 18, "name": "Q仔", "level": 749, "gold": 7490, "star": 749, "icon": 9 },
        { "id": 19, "name": "脑袋空空~", "level": 746, "gold": 7460, "star": 746, "icon": 1 },
        { "id": 20, "name": "轩辕霸气哥", "level": 743, "gold": 7430, "star": 743, "icon": 2 },
        { "id": 21, "name": "Miss丶Sweet", "level": 740, "gold": 7400, "star": 740, "icon": 3 },
        { "id": 22, "name": "无敌小笼包", "level": 737, "gold": 7370, "star": 737, "icon": 4 },
        { "id": 23, "name": "烟雨江南℡", "level": 734, "gold": 7340, "star": 734, "icon": 5 },
        { "id": 24, "name": "忘川秋水", "level": 731, "gold": 7310, "star": 731, "icon": 6 },
        { "id": 25, "name": "这名字真难起", "level": 728, "gold": 7280, "star": 728, "icon": 7 },
        { "id": 26, "name": "南城旧梦〆", "level": 725, "gold": 7250, "star": 725, "icon": 8 },
        { "id": 27, "name": "BigBoss77", "level": 722, "gold": 7220, "star": 722, "icon": 9 },
        { "id": 28, "name": "哈哈哈哈哈哈", "level": 719, "gold": 7190, "star": 719, "icon": 1 },
        { "id": 29, "name": "泡泡茶壶ღ", "level": 716, "gold": 7160, "star": 716, "icon": 2 },
        { "id": 30, "name": "CoolKidX", "level": 713, "gold": 7130, "star": 713, "icon": 3 },
        { "id": 31, "name": "丶一抹浅笑", "level": 710, "gold": 7100, "star": 710, "icon": 4 },
        { "id": 32, "name": "梦里有你", "level": 707, "gold": 7070, "star": 707, "icon": 5 },
        { "id": 33, "name": "笑看风云ミ", "level": 704, "gold": 7040, "star": 704, "icon": 6 },
        { "id": 34, "name": "吃货联盟", "level": 701, "gold": 7010, "star": 701, "icon": 7 },
        { "id": 35, "name": "Mr_无所谓", "level": 698, "gold": 6980, "star": 698, "icon": 8 },
        { "id": 36, "name": "小区扛把子", "level": 695, "gold": 6950, "star": 695, "icon": 9 },
        { "id": 37, "name": "柠檬不萌", "level": 692, "gold": 6920, "star": 692, "icon": 1 },
        { "id": 38, "name": "爱打拼图的羊", "level": 689, "gold": 6890, "star": 689, "icon": 2 },
        { "id": 39, "name": "AngelBaby520", "level": 686, "gold": 6860, "star": 686, "icon": 3 },
        { "id": 40, "name": "彼岸花开づ", "level": 683, "gold": 6830, "star": 683, "icon": 4 },
        { "id": 41, "name": "草莓味布丁", "level": 680, "gold": 6800, "star": 680, "icon": 5 },
        { "id": 42, "name": "夜半星河°", "level": 677, "gold": 6770, "star": 677, "icon": 6 },
        { "id": 43, "name": "我家WiFi最强", "level": 674, "gold": 6740, "star": 674, "icon": 7 },
        { "id": 44, "name": "Lonely丶Soul", "level": 671, "gold": 6710, "star": 671, "icon": 8 },
        { "id": 45, "name": "风吹裤衩凉", "level": 668, "gold": 6680, "star": 668, "icon": 9 },
        { "id": 46, "name": "叫我大魔王", "level": 665, "gold": 6650, "star": 665, "icon": 1 },
        { "id": 47, "name": "旧人不覆", "level": 662, "gold": 6620, "star": 662, "icon": 2 },
        { "id": 48, "name": "随便取的名字", "level": 659, "gold": 6590, "star": 659, "icon": 3 },
        { "id": 49, "name": "兔兔快跑~", "level": 656, "gold": 6560, "star": 656, "icon": 4 },
        { "id": 50, "name": "Jack小黑子", "level": 653, "gold": 6530, "star": 653, "icon": 5 },
        { "id": 51, "name": "夏至未至丶", "level": 650, "gold": 6500, "star": 650, "icon": 6 },
        { "id": 52, "name": "开心就好233", "level": 647, "gold": 6470, "star": 647, "icon": 7 },
        { "id": 53, "name": "灵魂画手✿", "level": 644, "gold": 6440, "star": 644, "icon": 8 },
        { "id": 54, "name": "╰つ黑白调℡", "level": 641, "gold": 6410, "star": 641, "icon": 9 },
        { "id": 55, "name": "永远滴神√", "level": 638, "gold": 6380, "star": 638, "icon": 1 },
        { "id": 56, "name": "木子李", "level": 635, "gold": 6350, "star": 635, "icon": 2 },
        { "id": 57, "name": "我超菜别打我", "level": 632, "gold": 6320, "star": 632, "icon": 3 },
        { "id": 58, "name": "星河入梦﹏", "level": 629, "gold": 6290, "star": 629, "icon": 4 },
        { "id": 59, "name": "夜的第七章", "level": 626, "gold": 6260, "star": 626, "icon": 5 },
        { "id": 60, "name": "瓜皮少年", "level": 623, "gold": 6230, "star": 623, "icon": 6 },
        { "id": 61, "name": "啦啦啦啦啦啦啦", "level": 620, "gold": 6200, "star": 620, "icon": 7 },
        { "id": 62, "name": "Crystal冰凌", "level": 617, "gold": 6170, "star": 617, "icon": 8 },
        { "id": 63, "name": "专业打酱油", "level": 614, "gold": 6140, "star": 614, "icon": 9 },
        { "id": 64, "name": "╭ァ流年似水", "level": 611, "gold": 6110, "star": 611, "icon": 1 },
        { "id": 65, "name": "咸鱼翻身日", "level": 608, "gold": 6080, "star": 608, "icon": 2 },
        { "id": 66, "name": "北海有鱼✧", "level": 605, "gold": 6050, "star": 605, "icon": 3 },
        { "id": 67, "name": "TONY老六", "level": 602, "gold": 6020, "star": 602, "icon": 4 },
        { "id": 68, "name": "快乐星球住户", "level": 599, "gold": 5990, "star": 599, "icon": 5 },
        { "id": 69, "name": "梦醒时分", "level": 596, "gold": 5960, "star": 596, "icon": 6 },
        { "id": 70, "name": "冷月孤心", "level": 593, "gold": 5930, "star": 593, "icon": 7 },
        { "id": 71, "name": "社交恐惧晚期", "level": 590, "gold": 5900, "star": 590, "icon": 8 },
        { "id": 72, "name": "咕咕咕咕咕", "level": 587, "gold": 5870, "star": 587, "icon": 9 },
        { "id": 73, "name": "爱唱歌的小熊", "level": 584, "gold": 5840, "star": 584, "icon": 1 },
        { "id": 74, "name": "雷神托尼嘎嘎", "level": 581, "gold": 5810, "star": 581, "icon": 2 },
        { "id": 75, "name": "o_o小眼睛", "level": 578, "gold": 5780, "star": 578, "icon": 3 },
        { "id": 76, "name": "旧梦难寻﹏", "level": 575, "gold": 5750, "star": 575, "icon": 4 },
        { "id": 77, "name": "笑嘻嘻ヅ", "level": 572, "gold": 5720, "star": 572, "icon": 5 },
        { "id": 78, "name": "星辰大海√", "level": 569, "gold": 5690, "star": 569, "icon": 6 },
        { "id": 79, "name": "咖啡不加糖", "level": 566, "gold": 5660, "star": 566, "icon": 7 },
        { "id": 80, "name": "一只小仙女✿", "level": 563, "gold": 5630, "star": 563, "icon": 8 },
        { "id": 81, "name": "专业坑人大师", "level": 560, "gold": 5600, "star": 560, "icon": 9 },
        { "id": 82, "name": "渣男本渣233", "level": 557, "gold": 5570, "star": 557, "icon": 1 },
        { "id": 83, "name": "小黑子别跑", "level": 554, "gold": 5540, "star": 554, "icon": 2 },
        { "id": 84, "name": "夜未央℡", "level": 551, "gold": 5510, "star": 551, "icon": 3 },
        { "id": 85, "name": "冰美式不加冰", "level": 548, "gold": 5480, "star": 548, "icon": 4 },
        { "id": 86, "name": "陈独秀请坐下", "level": 545, "gold": 5450, "star": 545, "icon": 5 },
        { "id": 87, "name": "无敌小旋风", "level": 542, "gold": 5420, "star": 542, "icon": 6 },
        { "id": 88, "name": "╰☆小幸运☆╮", "level": 539, "gold": 5390, "star": 539, "icon": 7 },
        { "id": 89, "name": "糖醋小排骨", "level": 536, "gold": 5360, "star": 536, "icon": 8 },
        { "id": 90, "name": "不要点我名", "level": 533, "gold": 5330, "star": 533, "icon": 9 },
        { "id": 91, "name": "哈哈Orz", "level": 530, "gold": 5300, "star": 530, "icon": 1 },
        { "id": 92, "name": "头号玩家Pro", "level": 527, "gold": 5270, "star": 527, "icon": 2 },
        { "id": 93, "name": "脑子进水啦", "level": 524, "gold": 5240, "star": 524, "icon": 3 },
        { "id": 94, "name": "琴心剑魄", "level": 521, "gold": 5210, "star": 521, "icon": 4 },
        { "id": 95, "name": "一只小迷糊", "level": 518, "gold": 5180, "star": 518, "icon": 5 },
        { "id": 96, "name": "未来可期✿", "level": 515, "gold": 5150, "star": 515, "icon": 6 },
        { "id": 97, "name": "燃烧的胸毛", "level": 512, "gold": 5120, "star": 512, "icon": 7 },
        { "id": 98, "name": "梦回大唐つ", "level": 509, "gold": 5090, "star": 509, "icon": 8 },
        { "id": 99, "name": "拖延症晚期", "level": 506, "gold": 5060, "star": 506, "icon": 9 },
        { "id": 100, "name": "随缘吧少年", "level": 503, "gold": 5030, "star": 503, "icon": 1 }
    ];

    /**
     * 每日动态更新排行榜等级
     * 算法：随机选择15-25名玩家，等级增加1-10关
     * 等级越高，增长幅度越小，最高不超过1700关
     */
    public performDailyUpdate(): void {
        const today = new Date().toDateString();
        const lastUpdate = StorageHelper.getData("RankLastUpdate", "");
        
        // 检查是否需要更新
        if (lastUpdate === today) {
            return;
        }
        
        
        // 随机选择15-25名玩家进行更新
        const updateCount = Math.floor(Math.random() * 11) + 15; // 15-25人
        const playersToUpdate: number[] = [];
        
        // 随机选择玩家索引
        while (playersToUpdate.length < updateCount) {
            const randomIndex = Math.floor(Math.random() * this.data.length);
            if (!playersToUpdate.includes(randomIndex)) {
                playersToUpdate.push(randomIndex);
            }
        }
        
        // 更新选中的玩家等级
        playersToUpdate.forEach(index => {
            const player = this.data[index];
            const currentLevel = player.level;
            
            // 根据当前等级计算增长幅度
            let growthRange = { min: 1, max: 10 };
            if (currentLevel >= 800) {
                growthRange = { min: 1, max: 3 };      // 800+: 1-3关增长
            } else if (currentLevel >= 700) {
                growthRange = { min: 1, max: 5 };      // 700-799: 1-5关增长  
            } else if (currentLevel >= 600) {
                growthRange = { min: 2, max: 7 };      // 600-699: 2-7关增长
            } else {
                growthRange = { min: 3, max: 10 };     // 550-599: 3-10关增长
            }
            
            const growth = Math.floor(Math.random() * (growthRange.max - growthRange.min + 1)) + growthRange.min;
            const newLevel = Math.min(currentLevel + growth, 1700); // 不超过1700关
            
            // 更新数据
            player.level = newLevel;
            player.gold = newLevel * 10;  // 金币按等级*10计算
            player.star = newLevel;       // 星数等于等级
            
            console.log(`玩家 ${player.name} 等级从 ${currentLevel} 提升到 ${newLevel} (+${growth})`);
        });
        
        // 重新排序
        this.data.sort((a, b) => b.level - a.level);
        
        // 更新排名
        for (let i = 0; i < this.data.length; i++) {
            this.data[i].rank = i + 1;
        }
        
        // 保存更新时间
        StorageHelper.setData("RankLastUpdate", today);
        
        console.log(`排行榜更新完成，共更新 ${updateCount} 名玩家`);
    }
    
    /**
     * 获取排行榜数据，自动检查是否需要每日更新
     */
    public getData(): RankData[] {
        this.performDailyUpdate();
        return this.data;
    }
}

export let RankConfig = new config();
