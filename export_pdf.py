# -*- coding: utf-8 -*-
"""用 Word 把 docx 导出为 PDF（后台、不可见、不弹窗）"""
import sys, os, time
sys.stdout.reconfigure(encoding='utf-8')
import win32com.client as win32

docx = os.path.abspath(sys.argv[1])
pdf = os.path.abspath(sys.argv[2])
word = win32.DispatchEx('Word.Application')
word.Visible = False
word.DisplayAlerts = 0
try:
    doc = word.Documents.Open(docx, ReadOnly=True, AddToRecentFiles=False)
    doc.SaveAs(pdf, FileFormat=17)   # wdFormatPDF
    pages = doc.ComputeStatistics(2)  # wdStatisticPages
    doc.Close(False)
    print('PDF 已导出：%s（%d 页）' % (os.path.basename(pdf), pages))
finally:
    word.Quit()
