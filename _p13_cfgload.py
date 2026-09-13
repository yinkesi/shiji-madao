# -*- coding: utf-8 -*-
"""为所有引擎测试脚本注入 config.js 加载"""
import io, glob

# index.html
p = 'index.html'
s = io.open(p, encoding='utf-8').read()
old = '<script src="js/data.js"></script>'
new = '<script src="js/config.js"></script>\n<script src="js/data.js"></script>'
assert old in s, "index anchor"
s = s.replace(old, new, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('index ok')

# mjs 测试脚本
for p in ['stress.mjs', 'test_features.mjs', 'test_status.mjs', 'test_bugfix.mjs',
          'test_review.mjs', 'test_extreme.mjs', 'test_versus.mjs', 'test_balance.mjs',
          'test_duel.mjs', 'test_fuzz.mjs', 'winrate4.mjs', 'diag_s8.mjs']:
    try:
        s = io.open(p, encoding='utf-8').read()
    except FileNotFoundError:
        print('skip(不存在):', p); continue
    if "require('./js/config.js')" in s:
        print('skip(已有):', p); continue
    old = "require('./js/data.js');"
    assert old in s, p + " 缺 data.js 引用"
    s = s.replace(old, "require('./js/config.js');\nrequire('./js/data.js');", 1)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('cfg 注入:', p)
print('done')
