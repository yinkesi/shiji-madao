#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""实验史记·马刀风云 —— 单文件打包
把 index.html + css/style.css + js/*.js 内联成一个可直接双击运行的 HTML。
用法: python build.py
"""
import io, os, re, hashlib

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_HTML = os.path.join(ROOT, 'index.html')
OUT = os.path.join(ROOT, '实验史记·马刀风云.html')

SCRIPT_RE = re.compile(r'<script src="([^"]+)"></script>')
CSS_RE = re.compile(r'<link rel="stylesheet" href="([^"]+)">')


def read(path):
    with io.open(path, encoding='utf-8') as f:
        return f.read()


def build():
    html = read(SRC_HTML)

    def css_repl(m):
        return '<style>\n' + read(os.path.join(ROOT, m.group(1))) + '\n</style>'

    def js_repl(m):
        return '<script>\n' + read(os.path.join(ROOT, m.group(1))) + '\n</script>'

    html = CSS_RE.sub(css_repl, html)
    html = SCRIPT_RE.sub(js_repl, html)

    body = html.split('<body>', 1)[1]
    leftovers = SCRIPT_RE.findall(html) + CSS_RE.findall(html)
    if 'src=' in body or leftovers:
        raise SystemExit('打包失败：仍有外部引用 %r' % leftovers)

    # newline 固定为 LF，保证跨平台产物一致
    with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)

    for key in ('SJI_DATA', 'SJI_SCENES', 'SJI_ENGINE', 'SJI_UI', 'SJI_SAVE', 'SJI_AUDIO'):
        if key not in html:
            raise SystemExit('打包自检失败：缺少 ' + key)

    with io.open(OUT, 'rb') as f:
        raw = f.read()
    print('已生成 %s（%.0f KB, md5 %s）' % (
        os.path.basename(OUT), len(raw) / 1024.0, hashlib.md5(raw).hexdigest()))


if __name__ == '__main__':
    build()
