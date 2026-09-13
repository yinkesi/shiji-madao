/* 技术报告 Markdown → DOCX
 * 用法: NODE_PATH=<npm root -g> node md2docx.js 技术报告.md 输出.docx
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, PageBreak
} = require('docx');

const src = process.argv[2] || '技术报告.md';
const out = process.argv[3] || '技术报告.docx';
const md = fs.readFileSync(src, 'utf8').split(/\r?\n/);

const FONT = '微软雅黑';
const MONO = 'Consolas';
const CONTENT_W = 9360;

const CODE_SHADE = { type: ShadingType.CLEAR, fill: 'F2F2F2' };
const plainRun = t => new TextRun({ text: t, font: FONT, size: 21 });
const boldRun = t => new TextRun({ text: t, bold: true, font: FONT, size: 21 });
const codeRun = (t, bold) => new TextRun({ text: t, bold: !!bold, font: MONO, size: 19, shading: CODE_SHADE });

// 处理 **粗体**（其内可再嵌 `行内代码`）与 `行内代码`
function runs(text) {
  const out = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(plainRun(text.slice(last, m.index)));
    if (m[2] !== undefined) {
      const inner = m[2], ire = /`([^`]+)`/g;
      let l2 = 0, m2;
      while ((m2 = ire.exec(inner))) {
        if (m2.index > l2) out.push(boldRun(inner.slice(l2, m2.index)));
        out.push(codeRun(m2[1], true));
        l2 = m2.index + m2[0].length;
      }
      if (l2 < inner.length) out.push(boldRun(inner.slice(l2)));
    } else {
      out.push(codeRun(m[3]));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(plainRun(text.slice(last)));
  return out.length ? out : [plainRun('')];
}

function cellPara(text, opts = {}) {
  return new Paragraph({
    children: runs(text),
    spacing: { before: 20, after: 20 },
    alignment: opts.align || AlignmentType.LEFT
  });
}

// 按未转义的竖线切分单元格（markdown 中 \| 表示字面竖线）
function splitRow(row) {
  const body = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    const BS = String.fromCharCode(92);   // 反斜杠，避免源码里出现转义字符
    if (body[i] === BS && body[i + 1] === '|') { cur += '|'; i++; continue; }
    if (body[i] === '|') { cells.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  cells.push(cur);
  return cells.map(c => c.trim());
}

function makeTable(rows) {
  const cols = rows[0].length;
  const w = Math.floor(CONTENT_W / cols);
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' };
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: new Array(cols).fill(w),
    rows: rows.map((cells, i) => new TableRow({
      tableHeader: i === 0,
      cantSplit: true,          // 禁止单行跨页撕断
      children: cells.map(c => new TableCell({
        borders: { top: border, bottom: border, left: border, right: border },
        width: { size: w, type: WidthType.DXA },
        shading: i === 0 ? { type: ShadingType.CLEAR, fill: 'EDE4C8' } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({
          children: runs(c).map(r => { if (i === 0) { r.bold = true; } return r; }),
          spacing: { before: 20, after: 20 }
        })]
      }))
    }))
  });
}

const children = [];
let i = 0, inCode = false, codeBuf = [], tableBuf = null;

function flushTable() {
  if (tableBuf && tableBuf.length) {
    // 去掉 markdown 分隔行 |---|
    const rows = tableBuf.filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
    const parsed = rows.map(splitRow).filter(r => r.length === rows.length || r.length > 0);
    if (parsed.length) children.push(makeTable(parsed), new Paragraph({ text: '', spacing: { after: 120 } }));
  }
  tableBuf = null;
}

function flushCode() {
  if (codeBuf.length) {
    codeBuf.forEach((line, idx) => {
      children.push(new Paragraph({
        children: [new TextRun({ text: line || ' ', font: MONO, size: 18 })],
        spacing: { before: 0, after: 0 },
        shading: { type: ShadingType.CLEAR, fill: 'F5F3EC' },
        indent: { left: 200 },
        keepLines: true,
        keepNext: idx < codeBuf.length - 1   // 整块代码不被分页切开
      }));
    });
    children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
    codeBuf = [];
  }
}

for (; i < md.length; i++) {
  const line = md[i];

  if (/^```/.test(line.trim())) {
    if (inCode) { inCode = false; flushCode(); } else { flushTable(); inCode = true; }
    continue;
  }
  if (inCode) { codeBuf.push(line); continue; }

  if (/^\s*\|/.test(line)) { tableBuf = tableBuf || []; tableBuf.push(line); continue; }
  else flushTable();

  const t = line.trim();
  if (!t) continue;

  if (/^---+$/.test(t)) {
    children.push(new Paragraph({ text: '', border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } }, spacing: { before: 80, after: 160 } }));
    continue;
  }
  let m;
  if ((m = t.match(/^(#{1,4})\s+(.*)$/))) {
    const lvl = m[1].length;
    const headings = [HeadingLevel.TITLE, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];
    children.push(new Paragraph({
      heading: headings[lvl - 1],
      children: runs(m[2]).map(r => { r.bold = true; r.size = lvl === 1 ? 36 : (lvl === 2 ? 28 : 24); return r; }),
      spacing: { before: lvl <= 2 ? 320 : 220, after: 140 },
      keepNext: true,          // 标题不与其后内容分页隔开（避免孤行标题）
      keepLines: true,
      pageBreakBefore: false
    }));
    continue;
  }
  if ((m = t.match(/^[-*]\s+(.*)$/))) {
    children.push(new Paragraph({
      children: runs(m[1]), bullet: { level: 0 }, spacing: { before: 20, after: 20 }
    }));
    continue;
  }
  if ((m = t.match(/^(\d+)\.\s+(.*)$/))) {
    // 保留有序编号（Word 项目符号会丢失数字，故直接写入文本前缀）
    const num = new TextRun({ text: m[1] + '. ', bold: true, font: FONT, size: 21 });
    children.push(new Paragraph({
      children: [num].concat(runs(m[2])),
      indent: { left: 360, hanging: 360 },
      spacing: { before: 20, after: 20 }
    }));
    continue;
  }
  if ((m = t.match(/^>\s?(.*)$/))) {
    children.push(new Paragraph({
      children: runs(m[1]), indent: { left: 400 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'A63A2B' } },
      spacing: { before: 80, after: 80 }
    }));
    continue;
  }
  if (/^\*[^*]+\*$/.test(t)) {
    children.push(new Paragraph({ children: [new TextRun({ text: t.replace(/\*/g, ''), italics: true, font: FONT, size: 20, color: '777777' })], alignment: AlignmentType.RIGHT, spacing: { before: 400 } }));
    continue;
  }
  children.push(new Paragraph({ children: runs(t), spacing: { before: 40, after: 40 } }));
}
flushTable(); flushCode();

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 21 } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(out, buf);
  console.log('已生成 ' + out + '（' + (buf.length / 1024).toFixed(0) + ' KB, 段落 ' + children.length + '）');
});
