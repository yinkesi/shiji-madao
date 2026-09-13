/* ============================================================
 * 实验史记 · 马刀风云 —— 数据卷
 * 据音克思《实验史记》改编 · 卷八《马刀书》为玩法蓝本
 * ============================================================ */
window.SJI_DATA = (function () {
  "use strict";

  /* ---------------- 角色 ----------------
   * 每人：名、号、出处卷、色、字、血、被动、技能
   * kind: unit=单体 range内 / self=自身 / adj=自身周身AOE / raoe=范围AOE / enemy-all=全场敌方
   */
  const CHARACTERS = {
    /* ============ 可操作 · 十七人 ============ */
    dage: {
      id: "dage", name: "贾瀚元", hao: "大哥", juan: "卷一", glyph: "哥",
      color: "#c06a2c", hp: 10,
      passive: { name: "城墙之梦", desc: "立于城墙时，刀击伤害+1。（梦破败城墙，苔藓覆其上，终无尽头）" },
      skill: { name: "护手霜之赠", kind: "unit", range: 3, ap: 2, cd: 3,
        desc: "距三内一敌受1伤，且下回合跳过。（此乃吾心意也，敬请笑纳——歆慧无语）" },
      quote: "大哥者，贾瀚元也，其父任于海大，其母亦然。",
      bio: "实验三异能者之首。为兵谴数十人搬书，及还，谓哥曰：尔搬何书？对曰：吾名为贾瀚元。善之韫、歆慧、梦晨，高考后皆以护手霜与原话表白之。",
      playable: true, aggr: 0.7
    },
    shenren: {
      id: "shenren", name: "江润翔", hao: "神人", juan: "卷一", glyph: "神",
      color: "#7a6ba0", hp: 10,
      passive: { name: "鲍鱼之肆", desc: "每回合结束时，相邻敌人各损1血。（置脏鞋袜与脸盆，久之皆发酵）" },
      skill: { name: "原神明信片", kind: "unit", range: 2, ap: 1, cd: 3,
        desc: "距二内一敌下回合跳过。（购原神明信片以贻之，诺然欣然受之）" },
      quote: "其声阴柔若太监，其目如双缝，以至光发生干涉。",
      bio: "尝为陌生学童困于厕，啵啵呼于厕，为师者掌掴。神教会十四人以骂神为己任，神闻之，喜不自胜。历史甚善，常于历史课媚师。",
      playable: true, aggr: 0.6
    },
    xiannv: {
      id: "xiannv", name: "姜付艳", hao: "仙女", juan: "卷一", glyph: "仙",
      color: "#b0486e", hp: 10,
      passive: { name: "晨读之声", desc: "免疫跳过与沉默。（吾声响，乃吾勤奋专注也，汝欲吾损声，岂不害我耶？）" },
      skill: { name: "怒斥滚", kind: "unit", range: 3, ap: 1, cd: 2,
        desc: "距三内一敌受2伤并击退一格。（歆慧恶之，曰：滚。——仙之声极尖锐，语速极快，远亦及之）" },
      quote: "仙致于学，常走而饭，走而诵，声极大，使人不得安宁。",
      bio: "其形神似大哥，态亦似神人，故卓文谓之仙。于宿舍厕所解手从不冲水，曰：事真多！曾怒斥李帆改编己为马刀角色，其声极尖锐，语速极快。",
      playable: true, aggr: 0.65
    },
    touge: {
      id: "touge", name: "陈修逸", hao: "头哥", juan: "卷七", glyph: "头",
      color: "#5e7d4f", hp: 12,
      passive: { name: "球棍意念", desc: "免疫击退。（与球棍意念合一，官知止而神欲行）" },
      skill: { name: "三溴化氮", kind: "adj", range: 1, ap: 2, cd: 3,
        desc: "周身所有敌人受2伤并中毒二回合。（陀螺名曰三溴化氮，鲜有败绩；体味绝类鸩毒，故号溴逸）" },
      quote: "其头甚圜，发短不盈寸，绝类卤蛋。",
      bio: "面不红，心不跳，若无其事。三次为捉，四次换家。以数学一百四十五高居级部第二，又以语文七十三、英语四十六点五高居榜底，张楠号之神。赛博妻子芙宁娜。",
      playable: true, aggr: 0.7
    },
    lifan: {
      id: "lifan", name: "李帆", hao: "李疯", juan: "卷十二", glyph: "帆",
      color: "#3f7d8c", hp: 10,
      passive: { name: "课代表夺权", desc: "购刀不需行动点。（假英语课代表之职权，聚众阴谋，苹苹果得C等）" },
      skill: { name: "Say You Say Me", kind: "raoe", range: 2, ap: 1, cd: 3,
        desc: "距二内所有敌人五成机率下回合跳过。（上台笑场者三，班人皆以say you为乐）" },
      quote: "初中时举华意志于班，自为戈，奉他人为希，后为主任所毁。",
      bio: "著《三战史》，做桌游《二战杀》，皆为主任所毁。马刀七班刀之创者，作宝可梦马刀，与六班合流，始成今日之马刀。禁闭室考英语，勇夺19.9分。",
      playable: true, aggr: 0.6
    },
    wonder: {
      id: "wonder", name: "王元昊", hao: "wonder", juan: "卷五", glyph: "问",
      color: "#8c5a3c", hp: 10,
      passive: { name: "马刀之神", desc: "血祭后，接下来两次伤害翻倍。（常人仅一次；血祭血祭血血祭）" },
      skill: { name: "GBC算不算", kind: "unit", range: 3, ap: 1, cd: 2,
        desc: "距三内一敌受2伤，若其血量为偶数则+1。（每有新题辄曰：GBC，算不算）" },
      quote: "究所有自然数之和为负十二分之一，数周，故号之曰wonder，意为想知道。",
      bio: "TGO之首。能思十四节课而不辍，究一题十四课，卒解之，予汶斌，汶斌秒之，wonder大怒。以牛顿定理破九省联考十八题，六班叹服。",
      playable: true, aggr: 0.8
    },
    wenbin: {
      id: "wenbin", name: "于汶斌", hao: "狗白菜", juan: "卷五", glyph: "斌",
      color: "#6d8c3f", hp: 10,
      passive: { name: "秒之", desc: "刀击有三成机率造成双倍伤害。（wonder究一题十四课，汶斌秒之）" },
      skill: { name: "弹簧纸箭", kind: "unit", range: 3, ap: 1, cd: 2,
        desc: "距三内一敌受2伤。（以弹簧串联笔杆，以纸条为箭，射程数米）" },
      quote: "以面如白菜，故号曰狗白菜（GBC）。",
      bio: "教主也。铃响而含笑未许下课，径出之：下课铃响，故走往饭，此自然之理也。期中数学150，强基之分轻取第一。后入复旦大学。",
      playable: true, aggr: 0.6
    },
    yurun: {
      id: "yurun", name: "隋毓润", hao: "joker", juan: "卷五", glyph: "润",
      color: "#9a7b2d", hp: 10,
      passive: { name: "清华大志", desc: "血量低于五时伤害+1。（毓润常有大志，目标清华，钦法赞于七班）" },
      skill: { name: "面包之赠", kind: "self", range: 0, ap: 1, cd: 3,
        desc: "回复3血。（此面包之韫予我也——之韫见吾而大羞，面红而塞我一面包，诚矣！）" },
      quote: "吾半年，未尝洗澡。——也诚矣，其味甚于头哥神人。",
      bio: "仪表堂堂，然卫生可与神人相较。尝持初中化学卷97炫于六班。自诩美才兼备而白于雨佳：盍不从我？雨佳大怒，不语而走。毓润于是大宣扬以成功，众人皆不信。",
      playable: true, aggr: 0.55
    },
    luhao: {
      id: "luhao", name: "刘鲁豪", hao: "道", juan: "卷十一", glyph: "豪",
      color: "#4a6d9c", hp: 20,
      passive: { name: "大腹如斗", desc: "生命上限20，且刀击数值翻倍（马踢与技能不翻倍）。（奕然见鲁豪腹大如斗，乃拍之，觉好玩，拍之不止。道之所在，刀下加倍奉还）" },
      skill: { name: "锦绣昼行", kind: "unit", range: 3, ap: 1, cd: 3,
        desc: "距三内一敌受2伤，且其下回合行动点-1。（恋爱而不让人知，如锦绣夜行，谁知之者！今予我纸条，是所谓富贵还乡、锦绣昼行也）" },
      quote: "恋爱而不让人知，如锦绣夜行，谁知之者！",
      bio: "道德帮之道。不叠被，五日不叠为看何时查也。因《微积分入门》遭含笑诘。创三国刀，世界马刀协会委员。绍铭叹曰：苟非汝，吾且死也。",
      playable: true, aggr: 0.6
    },
    xiaochuan: {
      id: "xiaochuan", name: "颜小川", hao: "德艺", juan: "卷十一", glyph: "川",
      color: "#2e8b74", hp: 10,
      passive: { name: "卧薪尝胆", desc: "每次受伤后，下一次伤害+1。（卧薪尝胆，报期末之耻，一举夺魁）" },
      skill: { name: "王霸之气", kind: "unit", range: 2, ap: 1, cd: 3,
        desc: "距二内一敌受1伤且缴械一回合。（伏于讲桌，邈然俯视，烨然有王霸之气也）" },
      quote: "夫川，流而不息，水准而不盈，其富在博！",
      bio: "道德帮之德艺兼修者。数学课代表，多送卷。尝于窗边戏跳鸡你太美，邻舍称妙而遁。欲夺第一，包举六班，几为美人所灭，卒忍痛割爱。",
      playable: true, aggr: 0.65
    },
    guyin: {
      id: "guyin", name: "顾一", hao: "只因", juan: "卷十一", glyph: "因",
      color: "#333333", hp: 11,
      passive: { name: "皇太子", desc: "每场一次，受致命伤时保留1血。（其父顾良任二十班班主任，生皆戏呼顾一为皇太子）" },
      skill: { name: "坤拳九式", kind: "unit", range: 1, ap: 1, cd: 2,
        desc: "相邻一敌受2伤，然有一成半机率自伤1。（以第一式攻鲁豪时，误伤己手，遂废此招；今稍加收敛）" },
      quote: "尝以俚歌鸡你太美闻于班中，遂得此名。",
      bio: "自创坤拳九式，专好啄人。每自言吾摆烂矣，然暗中勤学不辍。及榜发，竟为级部第一。痴嗜原神，尝十连抽得双黄。后入东南大学。",
      playable: true, aggr: 0.75
    },
    zichen: {
      id: "zichen", name: "王子琛", hao: "武", juan: "卷十", glyph: "琛",
      color: "#7d4a6b", hp: 10,
      passive: { name: "班长之威", desc: "相邻敌人对琛伤害-1，至少为1。（号令两班，政由琛出，威震天下）" },
      skill: { name: "体育课起义", kind: "raoe", range: 99, ap: 2, cd: 4,
        desc: "所有敌人受1伤且下回合行动点-1。（夺其话筒：马上解散，毋恐担责，凡有责任，在吾一人！）" },
      quote: "子琛者，大事可与焉，然必教之引之。",
      bio: "故六班班长。物竞如痴如狂。欲于体育课起义，先告含笑：此通知尔，非求建议也。含笑大怒：尔敢为此，吾誓杀汝。后入香港中文大学。",
      playable: true, aggr: 0.6
    },
    shaoming: {
      id: "shaoming", name: "刘绍铭", hao: "铭", juan: "卷三", glyph: "铭",
      color: "#8a3b3b", hp: 11,
      passive: { name: "不怒自威", desc: "对半血以下敌人伤害+1。（仪表堂堂，不怒自威）" },
      skill: { name: "歆慧纸条", kind: "unit", range: 3, ap: 1, cd: 2,
        desc: "距三内一敌受3伤。（纸条之多，少有过之者。毓润心害之，遂置桌洞以害铭）" },
      quote: "急击勿失。——鲁豪为之奈何之答也。",
      bio: "潮海之冠。QQ友列唯歆慧一人（然QQ已用数年）。挟卓本以买饭，分纸条以自现，毁鲁豪以自保。冷暴力致决裂，长叹：怎能不悔也！",
      playable: true, aggr: 0.7
    },
    xinhui: {
      id: "xinhui", name: "武歆慧", hao: "慧", juan: "卷三", glyph: "慧",
      color: "#a0527d", hp: 11,
      passive: { name: "灵光乍现", desc: "每第二回合行动点+1。（小学以诗词闻名，号为神童；右手断，以左手书之，得奖）" },
      skill: { name: "一声滚", kind: "unit", range: 2, ap: 1, cd: 2,
        desc: "距二内一敌受2伤并击退两格。（歆慧恶之，曰：滚。——大哥于是遂走）" },
      quote: "貌美晔丽，风韵婉转。",
      bio: "右手断，以左手书之，得作文大赛奖。既黑铭，吾觉未有之爽也。高考英语137.5，让大哥的128.5黯然失色。后入同济大学。",
      playable: true, aggr: 0.6
    },
    guayu: {
      id: "guayu", name: "郭凯宇", hao: "呱宇", juan: "卷九", glyph: "呱",
      color: "#c2942f", hp: 10,
      passive: { name: "疾如电", desc: "二成机率闪避一切伤害。（飞身出班，疾如电，行如风雨）" },
      skill: { name: "提壶狂奔", kind: "self", range: 0, ap: 1, cd: 2,
        desc: "立即获得2行动点，且下次伤害+1。（径提水壶而出班，疾如电，行如风雨。何以携水壶？——顺道）" },
      quote: "为人英俊挺拔，为二楼最帅之男。",
      bio: "嗜水如命，如不饮，必不活。如厕必携水壶。与汶斌四战，三败一胜，所亡失者以十数（饮料）。体育常冠于班，破百。后入复旦大学。",
      playable: true, aggr: 0.6
    },
    yiran: {
      id: "yiran", name: "隋奕然", hao: "小蛙", juan: "卷九", glyph: "蛙",
      color: "#5a8c46", hp: 10,
      passive: { name: "魔方宗师", desc: "每回合首次受伤-1。（技艺炉火纯青，为兵以监控视之，破门而入，碎之万段）" },
      skill: { name: "拍肚皮", kind: "unit", range: 1, ap: 1, cd: 2,
        desc: "相邻一敌受2伤，自愈1血。（见鲁豪腹大如斗，乃拍之，觉好玩，拍之不止）" },
      quote: "何只有凯宇一男也！——师竟未认出奕然亦男也。",
      bio: "梦晨谓之神青蛙，广超改曰小蛙，奕然甚喜此号。捡一发卡，幻想其为梦晨所有，四处求问，闻是仙女的，甩手弃掷于地，若为蝎子所蛰。后入北京理工大学。",
      playable: true, aggr: 0.6
    },
    dazhan: {
      id: "dazhan", name: "祝大展", hao: "少年展", juan: "卷六", glyph: "展",
      color: "#7c5cd6", hp: 12,
      passive: { name: "探楼发屋", desc: "一次移动可走两格。（探科技楼，门把手无不摸，走廊无不走，亡处不寻）" },
      skill: { name: "玉米为刃", kind: "unit", range: 1, ap: 1, cd: 2,
        desc: "相邻一敌受3伤。（乃幻想玉米为刃，欲以杀人，拔玉米而舞）" },
      quote: "少年展者，祝大展也。有龙凤之姿。",
      bio: "编程之能未有过之者。月考睡过头，除姓名外靡不毕缪，卒得109。乒乓球正反手不辨，师长以为其陪考。惟高中恋爱成者，与可怡也。后入南京大学。",
      playable: true, aggr: 0.7
    },

    /* ============ BOSS / 剧情角色 ============ */
    hanxiao: {
      id: "hanxiao", name: "孙含笑", hao: "上", juan: "卷二", glyph: "上",
      color: "#a44a3f", hp: 12, boss: true,
      passive: { name: "班主任之威", desc: "受到的一切伤害-1，至少为1。（训声百转，属引恐怖，绕窗数日而不绝）" },
      skill: { name: "遣返回家", kind: "unit", range: 3, ap: 2, cd: 3,
        desc: "距三内一敌被遣返回家一回合。（其子峻还家计二周，而期末级部十一）" },
      quote: "高考者，非假期耳，是上课也！",
      bio: "95年生，烟台海阳人。敢复读，有勇耳；去支教，有见耳。以酸奶贻封控学生，得学生欢。夫香味为臭味稀百倍，臭味为香味浓百倍，今以香掩臭，犹抱薪救火。",
      playable: false, aggr: 0.65
    },
    weibing: {
      id: "weibing", name: "为兵", hao: "老班", juan: "卷一", glyph: "兵",
      color: "#5d5d5d", hp: 12, boss: true,
      passive: { name: "监控之眼", desc: "其攻击无视闪避与减伤，且目标无法免疫跳过。（以监控视之，大怒，破门而入）" },
      skill: { name: "破门而入", kind: "unit", range: 99, ap: 2, cd: 3,
        desc: "瞬至全场任一敌相邻并缴械其刀一回合。（遽扑之，夺其魔方，碎之万段于垃圾桶）" },
      quote: "尔等安有如修逸折正二十面体者乎？",
      bio: "成绩斐然，数创实验纪录。尝与办公室斗地主，仅余四K，为一生瞥来问题所误，乃知其败，骤然作色曰：尔之不善思甚矣！欲往高一从其子而教之，崇国不许，贬其任美术老师。",
      playable: false, aggr: 0.7
    },
    shibo: {
      id: "shibo", name: "张世波", hao: "大师", juan: "卷四", glyph: "波",
      color: "#4f6d8c", hp: 10, boss: true,
      passive: { name: "吸东来之紫气", desc: "每回合回复1血。（没升旗必做气功，序万物之阴阳）" },
      skill: { name: "口诀震场", kind: "raoe", range: 2, ap: 2, cd: 2,
        desc: "距二内所有敌人受2伤。（面面垂直找交线，找到交线找垂线！）" },
      quote: "指数找好友，对数单身狗。",
      bio: "仙风道骨，鹤发童颜。钦法旁听其课，喟然叹曰：苟吾遇之早，吾数学可有成也。晚自习偏心六班：六班留22分而八班18分，钦法叹曰：此真数学老师也。",
      playable: false, aggr: 0.6
    },
    weirong: {
      id: "weirong", name: "杨为荣", hao: "破伤风", juan: "卷四", glyph: "荣",
      color: "#6b4f8c", hp: 10, boss: true,
      passive: { name: "黑棒无双", desc: "刀击伤害+1。（有翼帆者，一棍而不能坐，力度之强，技巧之深，未有过之者）" },
      skill: { name: "奇彪无比", kind: "unit", range: 3, ap: 1, cd: 3,
        desc: "距三内一敌下回合行动点-2。（有错简单题者，辄曰：奇彪无比）" },
      quote: "众人皆错，则曰：拖拉机上炕——惊人。",
      bio: "物理老师，上课甚幽默。其有一黑棒，不盈尺，而威力无双，子琛谓之破伤风棒：苟有得痔疮者离击，或已死。绍铭班倒一，为荣大怒，以戒尺笃之，阴谓课代表曰：此恋爱乎？",
      playable: false, aggr: 0.65
    },
    qinfa: {
      id: "qinfa", name: "钦法", hao: "主任", juan: "卷十四", glyph: "法",
      color: "#3d4a5c", hp: 9, boss: true,
      passive: { name: "穷追猛打", desc: "对半血以下敌人伤害+1。（头哥复为钦法所逮者再，谴之还家者有三）" },
      skill: { name: "当场抓获", kind: "unit", range: 3, ap: 1, cd: 3,
        desc: "距三内一敌缴械一回合（该回合不能刀击）。（此何课也？自习。何以看书耶？——头哥不语）" },
      quote: "汝乃何人？——陈修逸。——此何课也？——自习。",
      bio: "级部主任，深恶看闲书者。收头哥之书，通报于电子班牌。令绍歆互相揭发而自破，绍歆不语，卒予二人记过。",
      playable: false, aggr: 0.7
    },
    chongguo: {
      id: "chongguo", name: "王崇国", hao: "校长", juan: "卷十四", glyph: "国",
      color: "#2f3d2f", hp: 11, boss: true,
      passive: { name: "弃车保帅", desc: "每场一次，致命伤时保留1血并回复3血。（居二中之时，事败，辄弃车保帅以自全）" },
      skills: [
        { name: "评职称", kind: "raoe", range: 99, ap: 2, cd: 3,
          desc: "所有敌人本回合不能施技。（不为班主任者不得评职称——一出，天下皆惊）" },
        { name: "种树", kind: "summon", ap: 1, cd: 3,
          desc: "召唤一名'树'随从。（多种树木，树木皆死，时人谓之种树校长）" }
      ],
      quote: "为师者，吾之属地也，有师敢不从吾乎？",
      bio: "即墨实验之校长也。入实验前举于官场。苛于师而厚于生：免生打水之费，然以热水器加装于教师宿舍者，无之。师生稍背离之。",
      playable: false, aggr: 0.6
    },
    wanzhen: {
      id: "wanzhen", name: "万震", hao: "六班之首", juan: "卷五", glyph: "震",
      color: "#6a8577", hp: 10,
      passive: { name: "潜心至学", desc: "免疫跳过与沉默。（潜心至学，六班无有与之争锋者，无多事）" },
      skill: { name: "数学之首", kind: "unit", range: 2, ap: 1, cd: 2,
        desc: "距二内一敌受2伤。（六班数学之首也，无多事）" },
      quote: "万震者，六班数学之首也，潜心至学，无多事。",
      bio: "TGO成员。wonder每有新题辄曰：wonder震，来不来。后入哈尔滨工业大学。",
      playable: true, aggr: 0.5
    },
    keai: {
      id: "keai", name: "可怡", hao: "大展之怡", juan: "卷六", glyph: "怡",
      color: "#c76b98", hp: 10,
      passive: { name: "心善展", desc: "与大展相邻时，大展伤害+1，且每回合为其疗1血。（大展正道直行，关切同学）" },
      skill: { name: "一糖之恩", kind: "unit", range: 2, ap: 1, cd: 2,
        desc: "距二内一友军回复2血。（与尔一糖，毋有心伤）" },
      quote: "可怡大感功，心益善大展。",
      bio: "于抽转盘未得奖，展乃与一糖。火锅席间数欲夹展饭，展拒之。二人俱玩4399，怡忽念抱展，展狼扑之，撞之于衣柜。后入中国农业大学。",
      playable: false, aggr: 0.4
    },
    limo: {
      id: "limo", name: "李默", hao: "羚羊", juan: "卷十三", glyph: "羚",
      color: "#8f8f5c", hp: 9,
      passive: { name: "巡征", desc: "一次移动可走两格。（每吃饭必疾往，先以右足探地，既而狂奔，状类羚羊）" },
      skill: { name: "争食", kind: "unit", range: 2, ap: 1, cd: 2,
        desc: "距二内一敌受1伤并自愈1血。（每有小零食，默必先索而食之）" },
      quote: "吾之高中，多以为一场游戏一场梦。",
      bio: "好重点班，常于二楼徘徊，时手提其袋，时举其水壶，时人谓之巡征。食诺如而中毒，伏于地板翻滚，哀号灼然，然终躺地以听课。",
      playable: false, aggr: 0.6
    },
    xiangdong: {
      id: "xiangdong", name: "吴相东", hao: "潜逃者", juan: "卷十三", glyph: "东",
      color: "#555577", hp: 9,
      passive: { name: "潜逃", desc: "四分之一机率闪避，且每场一次致命伤不死。（不告而离校，卒潜逃回家，二月不返）" },
      skill: { name: "级部第一", kind: "unit", range: 3, ap: 1, cd: 4,
        desc: "距三内一敌受2伤。（或退步，辄取级部第一，时人侧目而视）" },
      quote: "每逢考试，必潜携手机。",
      bio: "实验之奇人。一夜潜于走读生之队中混出实验，已行至台城，为当班者识其校服，卒寻于其家门前，押而归，乘师不备又走。",
      playable: false, aggr: 0.6
    },
    mob: {
      id: "mob", name: "实验学子", hao: "路人", juan: "各卷", glyph: "生",
      color: "#8c8577", hp: 8,
      passive: { name: "无", desc: "无。" },
      skill: { name: "围观", kind: "unit", range: 1, ap: 1, cd: 3, desc: "相邻一敌受1伤。" },
      quote: "凡马刀，规则至简，而引人入胜。",
      bio: "马刀大兴，扩于九班，又于七班兴。师察生于考试前多痴迷马刀，于是大怒，强令禁之，然亦多有马刀者。",
      playable: false, aggr: 0.5, mob: true
    },
    tree: {
      id: "tree", name: "树", hao: "崇国所种", juan: "卷十四", glyph: "木",
      color: "#4c6b3c", hp: 1,
      passive: { name: "树木皆死", desc: "无。" },
      skill: { name: "无", kind: "unit", range: 1, ap: 1, cd: 9, desc: "相邻一敌受1伤。" },
      quote: "多种树木。树木皆死。",
      bio: "崇国走，复入二中，多种树木。树木皆死，时人谓之种树校长。",
      playable: false, aggr: 0.9, mob: true
    },
    /* 二中四人（卷十五） */
    shengxiang: {
      id: "shengxiang", name: "谭晟翔", hao: "义", juan: "卷十五", glyph: "翔",
      color: "#7a4f4f", hp: 7,
      passive: { name: "能让不能明", desc: "无。（晟翔有义无勇）" },
      skill: { name: "彻夜苦练", kind: "unit", range: 2, ap: 1, cd: 3, desc: "距二内一敌受2伤。（彻夜苦练朵莉亚至四点）" },
      quote: "吾皆为同学，无为如此！",
      bio: "于班德高望重，人有随之而恶连奇。以三百金市五十之机，痴情付之。齐岳复与之为兄弟，于是复与之饭。",
      playable: false, aggr: 0.55
    },
    qiyue: {
      id: "qiyue", name: "鲁齐岳", hao: "痴", juan: "卷十五", glyph: "岳",
      color: "#4f6e7a", hp: 7,
      passive: { name: "有痴无断", desc: "无。（齐岳多情而少断）" },
      skill: { name: "纸条投书", kind: "unit", range: 2, ap: 1, cd: 3, desc: "距二内一敌受2伤。（乃投其书于子烨，子烨蔑之，弃其纸条如草芥）" },
      quote: "一妇人而已，和足挂之！——尔无能知之。",
      bio: "初好子烨，断后好连奇，计不满一月。三白之，连奇勉许之，既高考而分。",
      playable: false, aggr: 0.7
    },
    ziye: {
      id: "ziye", name: "李子烨", hao: "媚", juan: "卷十五", glyph: "烨",
      color: "#8c6a2f", hp: 7,
      passive: { name: "有媚无诚", desc: "无。（子烨有媚无诚）" },
      skill: { name: "谗言", kind: "unit", range: 2, ap: 1, cd: 3, desc: "距二内一敌受1伤且下回合行动点-1。（乃阴谗言于连奇：若华为人阴险，不可与之为谋）" },
      quote: "子烨好评头论足，玲珑可爱。",
      bio: "与他有罅，乃阴谗言。九人联合发朋友圈以阴阳之，子烨闻之大怒，乃告于老师。",
      playable: false, aggr: 0.6
    },
    lianqi: {
      id: "lianqi", name: "岳连奇", hao: "断", juan: "卷十五", glyph: "奇",
      color: "#5c5c8c", hp: 7,
      passive: { name: "有断无柔", desc: "无。（连奇有断无柔）" },
      skill: { name: "二择", kind: "unit", range: 2, ap: 1, cd: 3, desc: "距二内一敌受2伤。（予尔二择：a朋友，b陌路，尔其当之）" },
      quote: "高考且至，吾不欲吾二人难堪。",
      bio: "念齐岳成绩卓越，乃许其入派。连奇派多女生，悉恶子烨。",
      playable: false, aggr: 0.65
    }
  };

  /* 初始可用：第一卷从大哥写起（见原书《序》）。其余角色随剧情"立传"解锁。 */
  const STARTERS = ["dage"];
  const PLAYABLE = ["dage","shenren","xiannv","touge","lifan","wonder","wenbin","yurun","luhao","xiaochuan","guyin","zichen","shaoming","xinhui","guayu","yiran","dazhan","wanzhen"];

  /* ---------------- 剧情关卡（十五卷 + 序章） ---------------- */
  const STAGES = [
    {
      id: "s0", juan: "序章", title: "马刀书",
      intro: "wonder引马刀于TGO，于体育课玩，于是马刀得散。规则至简，而引人入胜。世界马刀协会既立，奉wonder为马刀之神。今汝初执马刀，对手乃潜心至学之万震——无多事，善。",
      tip: "猜拳胜得四动，和得三动，负得二动。行动可：买刀、买马、移动、刀击、马踢、血祭、用技。同城（城墙）上马踢，扣三血并踢下城。",
      enemies: ["wanzhen"], allies: [], rule: null, unlocks: ["wanzhen"],
      outro: "万震败，曰：善。",
      yueks: "音克思曰：马刀之所以引人入胜，在于马刀之人也。既毕业，无复有刀者，悲哉！今以刀会友，善。"
    },
    {
      id: "s1", juan: "卷一", title: "三异能者列传",
      intro: "实验有三异能者，谓之大哥、神人、仙女。与人不善，神情固执，边幅不修，然为师所善，得'卫生标兵''正能量之星'之誉。今三子轮番上阵：先大哥，次神人，终仙女——切记各别其能。",
      tip: "三阵连战，阵间回复四血。大哥立于城墙则伤害+1，诱其下城；神人体味蚀人，勿恋近身；仙女免疫晕眩，其声不可惑。",
      enemies: ["dage", "shenren", "xiannv"], waves: [["dage"], ["shenren"], ["xiannv"]], allies: [], rule: null, unlocks: ["shenren", "xiannv"],
      outro: "后哥以综评入香港中文大学，神入北京电子科技大学——马刀场上，亦复如是。",
      yueks: "音克思曰：向使大哥不贪女色，神重于仪表，仙以礼待人，何至于为人所恶也？然马刀场上，异能者自有异能之用。"
    },
    {
      id: "s1b", juan: "卷一·其二", title: "宿舍风波",
      intro: "熄灯之后，宿舍才是真正的马刀场。神人欲开风扇，鲁豪以身翼蔽开关；仙女于教室后诵书，声震走廊。今夜，两声源合流——汝当寝管。",
      tip: "神人与仙女相邻时互相壮胆（伤害+1），先分其阵。",
      enemies: ["shenren", "xiannv"], allies: [], rule: { id: "dyad", desc: "敌人相邻时刀击与马踢伤害+1（二声部合唱）" },
      outro: "翌日，舍友七人联名上书。含笑曰：宿舍者，必里外为一而后可。",
      yueks: "音克思曰：一风扇之争，可见固执之弊；然其勤诵晨读，亦可敬也。"
    },

    {
      id: "s2", juan: "卷二", title: "含笑本纪",
      intro: "含笑者，孙含笑也，予称之为'上'。上查寝，见汝未当床；上诘之，汝狡辨曰：吾在通济。上怒曰：尔在何处？实验高中耳！——今上亲至马刀场，'遣返回家'之罚，汝且试之。",
      tip: "上受一切伤害-1，且会遣返回家（移出战场一回合）。此乃持久战，血祭抢攻未必明智。",
      enemies: ["hanxiao"], allies: [], rule: null,
      blocked: [[3, 2], [3, 4]], terrain: "cabinet",
      outro: "上诫学生曰：余日一中返家上网，而吾等于宿舍焉，落后甚多，尔当勉自而学也！",
      yueks: "音克思曰：贤哉含笑！敢复读，有勇耳；去支教，有见耳。勇见兼备，序他班而朝同列，无敌于实验。号曰文，可谓谊哉！"
    },
    {
      id: "s3", juan: "卷三", title: "绍歆列传",
      intro: "绍铭仪表堂堂，歆慧貌美晔丽。初，鲁豪感绍铭曰：急击勿失。于是绍歆自此游。二人比邻，则情比金坚，伤害+1——欲破其阵，先分其人。歆慧一声'滚'，能退汝两格。汝之友军，正是媒人鲁豪。",
      tip: "二人相邻时各伤害+1，勿让其聚首。鲁豪会为你顶刀，但别指望他输出。",
      enemies: ["shaoming", "xinhui"], allies: ["luhao"], rule: { id: "dyad", desc: "敌人相邻时伤害+1（情比金坚）" }, unlocks: ["shaoming", "xinhui"],
      blocked: [[2, 3], [4, 3]], terrain: "pillar",
      outro: "铭沉默良久，长叹曰：怎能不悔也！慧既黑铭，曰：吾觉未有之爽也。",
      yueks: "音克思曰：吾闻之大展曰：恋爱多出于地理近。绍歆岂不类乎？欲以己之一厢情愿而恋爱，卒亡其慧，尚不觉寐而不自省，过矣。"
    },
    {
      id: "s3b", juan: "卷三·其二", title: "运动会",
      intro: "秋季运动会。绍铭存歆慧手链于袖，观其入场。今日之绍铭，不怒自威——他刚在级部榜上名列前茅。",
      tip: "此时的绍铭已被加强：血11、纸条3伤。勿令其半血以下，被动『不怒自威』会加伤。",
      enemies: ["shaoming"], allies: [], rule: null, hpScale: 1.15,
      blocked: [[1, 2], [1, 4], [5, 2], [5, 4]], terrain: "cabinet",
      outro: "运动会既散，绍铭窃置手链于歆慧口袋。歆慧归家乃视之，以QQ问曰：手链？二人遂和好如初。",
      yueks: "音克思曰：一链定情，一纸绝交。少年之心，秋天的运动会。"
    },

    {
      id: "s4", juan: "卷四", title: "六班老师传",
      intro: "张世波者，大师也，仙风道骨，鹤发童颜，每回合吸东来之紫气自愈；杨为荣者，物理老师也，黑棒不盈尺而威力无双，刀击+1。二师授课于马刀场。汝非孤军——汶斌在侧：下课铃响，故走往饭，此自然之理也！",
      tip: "大师会回血，集火先斩之。为荣黑棒刀刀入肉（刀击+1），勿与之纠缠。",
      enemies: ["shibo", "weirong"], allies: ["wenbin"], rule: null, unlocks: ["wenbin"],
      blocked: [[2, 2], [2, 4], [4, 2], [4, 4]], terrain: "desk",   // 六班教室的课桌
      outro: "为荣见绍铭班倒一，以戒尺笃之，而阴谓课代表曰：绍铭今班倒一，此恋爱乎？",
      yueks: "音克思曰：凡六班之老师，无不爱岗敬业，知识渊博，此六班强盛之基也。"
    },
    {
      id: "s4b", juan: "卷四·其二", title: "物理晚自习",
      intro: "晚自习，为荣执黑棒巡行于课桌之间。教室里桌椅纵横，正是伏击之地。钦法于门外观望。",
      tip: "课桌不可通行，可借以卡位。为荣的黑棒刀击+1，勿与其贴身。",
      enemies: ["weirong", "mob"], allies: [], rule: null,
      blocked: [[2, 2], [2, 4], [4, 2], [4, 4]], terrain: "desk",
      outro: "子琛谓之破伤风棒：苟有得痔疮者离击，或已死。为荣闻之，不怒，反以此为荣。",
      yueks: "音克思曰：为荣之物理，广大而精微，妙趣横生，生皆拥之。"
    },

    {
      id: "s5", juan: "卷五", title: "TGO列传",
      intro: "TGO者，tiganorganization也，数学题感无双。今逐一领教：先会教主汶斌——秒解题，弹簧纸箭射程数米；再战马刀之神wonder——血祭翻倍两次，勿使其近身血祭。每有新题，wonder辄曰：GBC，算不算？",
      tip: "两阵连战，阵间回复四血。汶斌之箭与wonder之神算皆远及三格，近身则其刀亦利。wonder血祭后两击双倍，见祭速退！",
      enemies: ["wonder", "wenbin"], waves: [["wenbin"], ["wonder"]], allies: [], rule: null, unlocks: ["wonder"],
      blocked: [[2, 2], [2, 4], [4, 2], [4, 4]], terrain: "desk",
      outro: "Wonder每算错，即拍大腿而叫曰：别叫别叫。汶斌有诗赞之曰：打完响指拍大腿，大喊一声别叫了。",
      yueks: "音克思曰：TGO为六班数学之冠，奇思妙想皆出其中，马刀兴焉。至高三，虽分离，亦多究题，此TGO之基也。"
    },
    {
      id: "s5b", juan: "卷五·其二", title: "九省联考",
      intro: "九省联考，压轴第18题。wonder以牛顿定理破之，时人先贬后服。今日，他要当着你的面，再解一次——你就是那道题。",
      tip: "wonder独自一人，血量与攻击皆已强化。其血祭两次翻倍，见祭速退。GBC，算不算？",
      enemies: ["wonder"], allies: [], rule: null, hpScale: 1.35,
      blocked: [[3, 1], [3, 5]], terrain: "table",
      outro: "答案既出，果wonder之法，六班叹服。wonder拍大腿而叫曰：别叫别叫！",
      yueks: "音克思曰：wonder之思维甚慢，然思绪精妙，毅力超凡，能思十四节课而不辍。"
    },

    {
      id: "s6", juan: "卷六", title: "展怡列传",
      intro: "少年展者，祝大展也，有龙凤之姿，探楼发屋，一步两格；可怡心善展，比邻则大展伤害+1且每回合得疗。高中之恋爱者多不就，惟大展成——今汝为不成人之美者。",
      tip: "可怡会为大展疗伤加持，先斩可怡，或以击退拆散二人。大展步幅极大，勿以为距离安全。",
      enemies: ["dazhan", "keai"], allies: [], rule: { id: "lovers", desc: "可怡与大展相邻时，展伤害+1且每回合回血" }, hpScale: 0.7, unlocks: ["dazhan"],
      blocked: [[3, 1], [3, 5]], terrain: "table",
      outro: "既高考，展与可怡牵之手而行于校园，岂不美哉？",
      yueks: "音克思曰：高中之恋爱者多不就，惟大展成。究其本，乃展之收敛而谨慎也。此之谓：恋爱者必慎也。"
    },
    {
      id: "s7", juan: "卷七", title: "修逸列传",
      intro: "陈修逸，不知其何许人也，头甚圜，绝类卤蛋。所持陀螺名曰三溴化氮，鲜有败绩；体味绝类鸩毒，中者中毒。免疫击退——官知止而神欲行。三次为捉，四次换家，至今不易其志。",
      tip: "三溴化氮周身AOE+中毒，勿贴身连击。免疫击退，马踢只能伤之不能踢之。其血不厚，稳扎稳打。",
      enemies: ["touge"], allies: [], rule: null, unlocks: ["touge"],
      blocked: [[3, 3]], terrain: "platform",   // 讲台（头哥正是在此处被为兵逮住）
      outro: "为兵视马刀角色，念曰：豌豆射手，何为豌豆射手？众哄堂大笑。至头哥返校，见其小臂多有伤痕，盖其父母为之。",
      yueks: "音克思曰：余尝闻鲁豪之摆烂，神人之体味，大哥之特立独行。盖修逸者，可谓兼之矣。"
    },
    {
      id: "s7b", juan: "卷七·其二", title: "宿舍之夜",
      intro: "头哥与神人同宿舍。夜半，神人弹弓从上铺弹人，头哥怒曰：鼠辈，吾乃汝陈父也！溴味与臭袜齐飞——汝被锁在了中间。",
      tip: "二臭相加，勿站中央。头哥免疫击退，神人回合末毒害近身者。",
      enemies: ["touge", "shenren"], allies: [], rule: null,
      outro: "头哥得一陀螺，名曰三溴化氮，鲜有败绩，以之为豪，常炫之。",
      yueks: "音克思曰：汝母尚在？——勇珺怒吼之声，犹在耳边。"
    },

    {
      id: "s8", juan: "卷八", title: "世界马刀协会锦标赛",
      intro: "后，世界马刀协会立，以鲁豪、小川、子琛、大展、翼帆为委员，奉wonder为马刀之神。今为锦标赛制：连胜三阵——先鲁豪，次小川，终子琛。阵间回复四血。",
      tip: "三连战。赛事之间可充分休整，故每阵可放手一搏；子琛的起义会波及全场，留神其第三回合的援军。",
      enemies: ["luhao"], waves: [["luhao"], ["xiaochuan"], ["zichen"]], allies: [], rule: null, hpScale: 0.68, restFull: true, unlocks: ["luhao", "xiaochuan", "zichen"],
      outro: "马刀大兴盛，扩于九班；又于七班兴，与六班合流，始成今日之马刀。汝今列席协会，与有荣焉。",
      yueks: "音克思曰：马刀之消，似于高中之时光也。愿汝此刀，永不消。"
    },
    {
      id: "s9", juan: "卷九", title: "皇家曼彻斯特传",
      intro: "郭凯宇者，呱宇也，为二楼最帅之男，嗜水如命，疾如电，三成闪避？非也，二成也；隋奕然者，小蛙也，魔方技艺炉火纯青，每回合首次受伤-1，拍肚皮自得其乐。二人同场，帅与清秀并存。",
      tip: "呱宇闪避不低，用必中技能与马踢取之；小蛙首伤-1，连击方可破防。",
      enemies: ["guayu", "yiran"], allies: [], rule: null, unlocks: ["guayu", "yiran"],
      blocked: [[2, 3], [4, 3]], terrain: "pillar",
      outro: "宇尝四战汶斌，三败而一胜。奕然于班走，捡一发卡，幻想其为梦晨所有。",
      yueks: "音克思曰：呱宇、奕然者，世多其贤。吾考之行事，网罗其闻，知其有奇事也。"
    },
    {
      id: "s9b", juan: "卷九·其二", title: "乒乓球期末",
      intro: "乒乓球期末考试。呱宇与搭档正反手不辨，师长以为其陪考。今日呱宇持拍而立——汝就是那个 unlucky 的搭档。",
      tip: "呱宇疾如电（二成闪避），球拍如刀。补考三度，方能过二十板。",
      enemies: ["guayu", "mob", "mob"], allies: [], rule: null,
      blocked: [[2, 2], [2, 4], [4, 2], [4, 4]], terrain: "table",
      outro: "及至补考，牛逼同学相助，最后一度成二十板，补考乃过。展二人谢牛逼同学而去。",
      yueks: "音克思曰：尔向用反手，吾以为尔陪考也。——师长亦大惊。"
    },

    {
      id: "s10", juan: "卷十", title: "王子琛世家",
      intro: "王子琛者，故六班之班长也，号曰武，号令两班，政由琛出。其'体育课起义'波及全场，夺话筒而令汝不得行动。第三回合，其心腹二人将入场：凡有责任，在吾一人！",
      tip: "第三回合有二路人入场，勿被围殴。班长之威使近身者伤害-1，以技能与马踢远程取之。",
      enemies: ["zichen"], allies: [], rule: { id: "uprising", desc: "第三回合敌人援军二人入场（起义）" },
      blocked: [[1, 1], [1, 5], [5, 1], [5, 5]], terrain: "cabinet",   // 操场四角的器械
      outro: "琛既上书，言于含笑曰：吾师，今事已毕，起义大成。含笑瞪目。琛忙释：非汝之所想也。",
      yueks: "音克思曰：子琛起于六班，续位于七班。号令两班，政由琛出，威震天下。位终，且近古以来未之有也。"
    },
    {
      id: "s11", juan: "卷十一", title: "DDB列传",
      intro: "道德帮者，刘鲁豪、颜小川、顾一也。以顾一有德，鲁豪有道，而小川兼通德艺。三人比邻，DDB同德，伤害+1。皇太子每场不死一次，川受伤越痛反击越狠。汝非孤军——毓润强跟之饭，'三带一'是也。",
      tip: "汝有友军毓润（虽其求战心不坚）。三人相邻伤害+1，先破其阵型。顾一有皇太子庇佑，留后手。",
      enemies: ["luhao", "xiaochuan", "guyin"], allies: ["yurun"], rule: { id: "dyad", desc: "敌人相邻时伤害+1（DDB同德）" }, unlocks: ["yurun", "guyin"],
      blocked: [[3, 2], [3, 4]], terrain: "table",   // 食堂长桌（只因说：吾摆烂矣）
      outro: "川曰：呜呼，高中之人，非有超世之才，未可节外生枝。诚哉川之言也。",
      yueks: "音克思曰：以川之才俊，虽内向，何女不容？才貌如川且若此，况庸碌之人乎？"
    },
    {
      id: "s12", juan: "卷十二", title: "李帆列传",
      intro: "李帆者，山东青岛人，时人号之曰'李疯'。购刀免费，Say You Say Me使汝笑场不能自持。神教会残部二人随其入场——刘毅立神教时，帆为左护法，凡十四人，以骂神为己任。",
      tip: "帆购刀免费，前期即有刀伤。笑场之歌范围二格，能散则散。先清杂兵，再诛李疯。",
      enemies: ["lifan", "mob", "mob"], allies: [], rule: null, unlocks: ["lifan"],
      blocked: [[2, 3], [4, 3]], terrain: "desk",
      outro: "帆任英语课代表之职，誓为同学争权。苹苹怒斥众曰：汝等皆叛徒也！帆窃喜，以苹苹未知其课代表乃叛军之首也。",
      yueks: "音克思曰：予观《李帆传》《头哥传》，越于韩柳之文采。终得一言以评之曰：疯奇。"
    },
    {
      id: "s12b", juan: "卷十二·其二", title: "禁闭室",
      intro: "禁闭室，数学组对面的杂物间。李帆因早读私语被为兵停课，置于此处半日——同押的还有钦法巡行至此的你。帆笑：Q=CU。",
      tip: "禁闭室狭小（中央柜子不可通行）。李帆购刀免费，笑场之歌仍在。",
      enemies: ["lifan", "qinfa"], allies: [], rule: null,
      blocked: [[3, 3]], terrain: "cabinet",
      outro: "帆于禁闭室考英语，勇夺19.9分。苹苹果得C等，帆窃喜。",
      yueks: "音克思曰：帆于禁闭而考19.9，其疯奇如此。"
    },

    {
      id: "s13", juan: "卷十三", title: "李默相东传",
      intro: "李默者，不知其何班也，走路侧翼加速，状如羚羊，一步两格；吴相东者，实验之奇人也，每逢考试必潜携手机——三成闪避，每场一次致命不死。一场游戏一场梦，此战亦然。",
      tip: "二人皆难捉摸：羚羊步大，相东善逃。封锁其走位（利用城墙与马踢），以范围技逼其现形。",
      enemies: ["limo", "xiangdong"], allies: [], rule: null, unlocks: ["limo", "xiangdong"],
      blocked: [[2, 2], [2, 4], [4, 2], [4, 4]], terrain: "pillar",
      outro: "至实验，乘师不备，相东又走。师下令全守卫闭门，卒获之。当时，已十二点矣。",
      yueks: "音克思曰：实验果多神人也。"
    },
    {
      id: "s13b", juan: "卷十三·其二", title: "二楼巡征",
      intro: "李默好重点班，常于二楼徘徊，手提其袋，环视各班。七班过时，辄仰首以观，心向往焉。今日，他巡到了你的面前。",
      tip: "巡征步幅极大（一步两格），且争食自愈。勿与其恋战，游斗为上。",
      enemies: ["limo"], allies: [], rule: null, hpScale: 1.25,
      outro: "默之趋食堂，必先以右足探地，既而狂奔，左右腾挪，状类羚羊。后以此断腿，然仍不改其速。",
      yueks: "音克思曰：吾之高中，多以为一场游戏一场梦。"
    },

    {
      id: "s14", juan: "卷十四", title: "王崇国本纪",
      intro: "王崇国，即墨实验之校长也，貌丑德薄，苛于师而怠于职。钦法为其爪牙，当场抓获，缴械沉默。崇国'弃车保帅'，濒死复起；'评职称'禁汝施技；'种树'召唤随从——树木虽皆死，今日且种之。为兵为其所贬，今来助阵：终焉之战。",
      tip: "先斩钦法，绝其抓获。崇国血厚且有免死，血祭爆发务必一次到位。其召唤之树，一踢即散。",
      enemies: ["qinfa", "chongguo"], allies: ["weibing"], rule: null, hpScale: 0.78,
      blocked: [[2, 3], [4, 3]], terrain: "cabinet",   // 校长室的办公桌与文件柜
      outro: "后崇国走，复入二中，多种树木。树木皆死，时人谓之'种树校长'。为兵亦复其职，未几，再接新班。",
      yueks: "音克思曰：荣国轻师而重生，犹植木于沙，欲其茂而不得其土。嗟乎，苟能推此心以待师，何至于天下共怨也？"
    },
    {
      id: "s15", juan: "卷十五", title: "二中番外·党争",
      intro: "二中二十三班有四人焉：谭晟翔、鲁齐岳、李子烨、岳连奇。四人初以学业相近而相善，后以一言相疑，以一人相争，离合反覆，终至交恶。爱者反为仇，仇者复为友——场上四人，各有二成之机误伤'友军'。乱世用重典，唯一人可终结此局。",
      tip: "敌人内讧（二成机率打错人），但四人围攻仍极险。利用党争，逐个诱杀，勿陷中央。",
      enemies: ["shengxiang", "qiyue", "ziye", "lianqi"], allies: [], rule: { id: "chaos", desc: "敌人二成机率误伤最近的任何人（党争）" }, unlocks: ["shengxiang", "qiyue", "ziye", "lianqi"],
      blocked: [[2, 2], [2, 4], [4, 2], [4, 4]], terrain: "desk",
      outro: "向所谓终身之好者，亦不过一时之心。然当其时也，喜怒皆真，故记之。",
      yueks: "音克思曰：流言可以离友，猜疑可以成仇，而人心之变，虽史家亦不能尽知也。靡不有初，鲜克有终，观于四人，信哉！"
    },
    {
      id: "s15b", juan: "卷十五·其二", title: "烧烤摊",
      intro: "高考后，烧烤摊。齐岳与连奇并肩而坐——三白之后，勉许之；既高考而分，然兄弟仍是兄弟。炭火明灭，如人心难测。",
      tip: "二人相邻仍有『情比金坚』（刀击与马踢伤害+1）。先分后破，老规矩。",
      enemies: ["qiyue", "lianqi"], allies: [], rule: { id: "dyad", desc: "敌人相邻时刀击与马踢伤害+1（兄弟并肩）" },
      blocked: [[3, 2], [3, 4]], terrain: "table",
      outro: "（这结尾我不知道选哪个好了，早晨写了第二个，晚上写了第一个，烧烤中）",
      yueks: "音克思曰：向所谓终身之好者，亦不过一时之心。然当其时也，喜怒皆真。"
    }
  ];

  /* ---------------- 成就 ---------------- */
  const ACHIEVEMENTS = [
    { id: "a_first", name: "初执马刀", desc: "完成第一场战斗的胜利。" },
    { id: "a_tutorial", name: "协会列席", desc: "通关序章·马刀书。" },
    { id: "a_s1", name: "异能者退散", desc: "通关卷一·三异能者列传。" },
    { id: "a_s2", name: "上之意", desc: "通关卷二·含笑本纪。" },
    { id: "a_s5", name: "别叫别叫", desc: "通关卷五·TGO列传。" },
    { id: "a_s14", name: "种树校长", desc: "通关卷十四·王崇国本纪。" },
    { id: "a_all", name: "马刀之神", desc: "通关全部十五卷剧情。" },
    { id: "a_blood", name: "血祭血祭", desc: "使用血祭并赢得该场战斗。" },
    { id: "a_reopen", name: "重开重开", desc: "战败一次。（胜负乃兵家常事）" },
    { id: "a_wall", name: "破败城墙", desc: "全程不离城墙而获胜。（苔藓覆其上，终无尽头）" },
    { id: "a_1hp", name: "高考激励", desc: "曾在仅剩1血时存活，并最终获胜。（此不类高考乎？吾终将尽城墙）" },
    { id: "a_noskill", name: "卫生标兵", desc: "不使用技能获胜。（为兵所授，佯作打扫卫生状）" },
    { id: "a_nohorse", name: "正能量之星", desc: "不买马而获胜。（为兵欢，授之）" },
    { id: "a_1v3", name: "神教会", desc: "以一敌三并获胜。（凡十四人，以骂神为己任）" },
    { id: "a_rush", name: "急击勿失", desc: "单回合造成至少5点伤害。" },
    { id: "a_fast", name: "强基第一", desc: "五回合内获胜。（强基之分轻取第一）" },
    { id: "a_walk", name: "巡征", desc: "累计移动50格。（时手提其袋，时举其水壶）" },
    { id: "a_heal", name: "搬水者气概也", desc: "累计回复10点血。（搬水者，气概也）" },
    { id: "a_surv10", name: "台城", desc: "破败城墙（生存）抵达第10波。（不告而离校，已行至台城矣）" },
    { id: "a_surv20", name: "苔藓不尽", desc: "破败城墙（生存）抵达第20波。（吾走之其上久，终无尽头）" },
    { id: "a_free", name: "乱刀齐发", desc: "在乱斗模式获胜一次。" },
    { id: "a_laugh", name: "Say You", desc: "用李帆获胜一场。（Q=CU）" },
    { id: "a_ngplus", name: "二周目", desc: "在困难强度下取得一场胜利。（重开重开，再来一遍）" },
    { id: "a_ngplus14", name: "铁人", desc: "在困难强度下通关卷十四·王崇国本纪。（与为兵并肩，再战校长）" },
    { id: "a_allchar", name: "人人有传", desc: "以全部可操作角色各取胜一场。（史册之中，人人有传）" },
    { id: "a_extreme", name: "以卵击石", desc: "在极难强度下取胜一场。（明知不可为而为之）" },
    { id: "a_extreme_final", name: "尽城墙", desc: "在极难强度下通关卷十四·王崇国本纪。（苔藓覆其上，其高极大以至于不能尽，吾终将尽之）" }
  ];

  /* ---------------- 生存模式增益 ---------------- */
  const BOONS = [
    { id: "b_hp", name: "奋进新征程", desc: "生命上限+2并回复2血。（八千余字，其志甚坚）" },
    { id: "b_knife", name: "刀锋所向", desc: "刀击伤害+1。（买刀）" },
    { id: "b_horse", name: "马踏连营", desc: "马踢伤害+1。（买马）" },
    { id: "b_regen", name: "吸东来之紫气", desc: "每回合回复1血。（世波气功，序万物之阴阳）" },
    { id: "b_dodge", name: "疾如电", desc: "获得15%闪避。（飞身出班，行如风雨）" },
    { id: "b_blood", name: "马刀之神", desc: "血祭后翻倍两次。（wonder亲传）" },
    { id: "b_cd", name: "秒之", desc: "技能冷却-1。（汶斌秒之）" },
    { id: "b_move", name: "探楼发屋", desc: "移动距离+1。（门把手无不摸，走廊无不走）" },
    { id: "b_ap", name: "下课铃响", desc: "每回合行动点+1。（故走往饭，此自然之理也）" },

    /* ---- 稀有（质变型）：每局最多出现一次 ---- */
    { id: "b_bloodfree", rare: true, name: "以道代血", desc: "血祭不再损血，只耗行动点。（道之所在，血不轻洒）" },
    { id: "b_cleave", rare: true, name: "刀扫一片", desc: "刀击同时波及相邻的另一名敌人。（马刀本是横扫之术）" },
    { id: "b_horsereach", rare: true, name: "长杆马刀", desc: "马踢射程+1（同城四格之内皆可踢）。（加长一寸，强出一分）" },
    { id: "b_killheal", rare: true, name: "庆功之宴", desc: "击破敌人回复4血（原为2）。（大胜而归，理当加餐）" },
    { id: "b_shield", rare: true, name: "班主任的偏爱", desc: "开局获得3点护盾。（含笑素善大哥，此之谓也）" },
    { id: "b_firststrike", rare: true, name: "先手刀", desc: "每回合首次刀击伤害+1。（早读查得严，唯快不破）" }
  ];

  /* ---------------- 乱斗地图名 ---------------- */
  const FREE_MAPS = [
    { id: "standard", name: "实验标准场", desc: "中空地，外城墙，正经马刀场。" }
  ];

  return { CHARACTERS, PLAYABLE, STAGES, ACHIEVEMENTS, BOONS, FREE_MAPS };
})();
