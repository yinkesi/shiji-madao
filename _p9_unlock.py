# -*- coding: utf-8 -*-
"""角色随剧情解锁：击败即立传，立传后可调用"""
import io

# ---------------- data.js ----------------
p = 'js/data.js'
s = io.open(p, encoding='utf-8').read()
def rep(old, new, tag):
    global s
    assert old in s, "MISS: " + tag
    s = s.replace(old, new, 1)
    print("ok:", tag)

# 万震成为可操作角色（序章通关的奖励）
rep('''      quote: "万震者，六班数学之首也，潜心至学，无多事。",
      bio: "TGO成员。wonder每有新题辄曰：wonder震，来不来。后入哈尔滨工业大学。",
      playable: false, aggr: 0.5''',
'''      quote: "万震者，六班数学之首也，潜心至学，无多事。",
      bio: "TGO成员。wonder每有新题辄曰：wonder震，来不来。后入哈尔滨工业大学。",
      playable: true, aggr: 0.5''', "万震可操作")

rep('''  const PLAYABLE = ["dage","shenren","xiannv","touge","lifan","wonder","wenbin","yurun","luhao","xiaochuan","guyin","zichen","shaoming","xinhui","guayu","yiran","dazhan"];''',
'''  /* 初始可用：第一卷从大哥写起（见原书《序》）。其余角色随剧情"立传"解锁。 */
  const STARTERS = ["dage"];
  const PLAYABLE = ["dage","shenren","xiannv","touge","lifan","wonder","wenbin","yurun","luhao","xiaochuan","guyin","zichen","shaoming","xinhui","guayu","yiran","dazhan","wanzhen"];''', "PLAYABLE 18 人")

# 各关解锁表
for sid, chars in [
    ('s0', '["wanzhen"]'),
    ('s1', '["shenren", "xiannv"]'),
    ('s3', '["shaoming", "xinhui"]'),
    ('s4', '["wenbin"]'),
    ('s5', '["wonder"]'),
    ('s6', '["dazhan"]'),
    ('s7', '["touge"]'),
    ('s8', '["luhao", "xiaochuan", "zichen"]'),
    ('s9', '["guayu", "yiran"]'),
    ('s11', '["yurun", "guyin"]'),
    ('s12', '["lifan"]'),
    ('s13', '["limo", "xiangdong"]'),
    ('s15', '["shengxiang", "qiyue", "ziye", "lianqi"]'),
]:
    anchor = 'id: "%s", juan' % sid
    i = s.index(anchor)
    j = s.index('enemies:', i)
    # 在 enemies 行之前插入 unlocks（贴着各关的 enemies 字段）
    insert_at = s.rfind('      ', i, j)
    line_end = s.index('\n', j)
    # 找到该关 enemies: [...] 行尾并追加 unlocks 字段
    k = s.index('enemies:', i)
    line_start = s.rfind('\n', i, k) + 1
    line = s[line_start:s.index('\n', line_start)]
    new_line = line.rstrip()
    assert new_line.endswith(','), sid
    s = s[:line_start] + new_line + ' unlocks: %s,\n' % chars + s[s.index('\n', line_start) + 1:]
    print("ok: %s 解锁 %s" % (sid, chars))

# 成就更名（解锁制下人数会到 18，不再写死"十七"）
rep('{ id: "a_allchar", name: "十七人皆执刀", desc: "以全部十七位可操作角色各取胜一场。（史册之中，人人有传）" },',
    '{ id: "a_allchar", name: "人人有传", desc: "以全部可操作角色各取胜一场。（史册之中，人人有传）" },', "成就更名")

io.open(p, 'w', encoding='utf-8').write(s)

# ---------------- save.js ----------------
p = 'js/save.js'
s = io.open(p, encoding='utf-8').read()
rep('''    progress: {},          // stageId -> true''',
'''    progress: {},          // stageId -> true
    unlocked: { dage: true },  // 已立传（可操作）角色''', "默认解锁")

rep('''    markPrologue() { data.prologueSeen = true; persist(); },''',
'''    markPrologue() { data.prologueSeen = true; persist(); },

    /* ---- 角色解锁：击败谁就为谁立传 ---- */
    isUnlocked(cid) {
      if (SAVE.settings.ngPlus) return true;          // 二周目全解锁
      if (!data.unlocked) data.unlocked = { dage: true };
      return !!data.unlocked[cid];
    },
    unlockChars(list) {
      if (!data.unlocked) data.unlocked = { dage: true };
      let fresh = [];
      for (const cid of list || []) {
        if (!data.unlocked[cid]) { data.unlocked[cid] = true; fresh.push(cid); }
      }
      if (fresh.length) persist();
      return fresh;
    },
    /* 旧存档迁移：按已通关关卡补算解锁（不含初始角色之外的无主角色） */
    migrateUnlocks() {
      if (data.unlocked) return;
      data.unlocked = { dage: true };
      const D = window.SJI_DATA;
      for (const st of D.STAGES) {
        if (data.progress[st.id] && st.unlocks) for (const cid of st.unlocks) data.unlocked[cid] = true;
      }
      persist();
    },''', "解锁接口")

io.open(p, 'w', encoding='utf-8').write(s)
print('save 完成')
