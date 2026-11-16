import { csvDocument } from './finance-csv.js';

export const reportContentTypes = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
} as const;

type Format = keyof typeof reportContentTypes;
type Cell = string | number | boolean | null;
type Report = { title: string; subtitle: string; headers: string[]; rows: Cell[][] };

async function spreadsheet({ title, subtitle, headers, rows }: Report) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GymOS';
  workbook.title = title;
  const sheet = workbook.addWorksheet('Report', { views: [{ state: 'frozen', ySplit: 3 }] });
  sheet.addRow([title]);
  sheet.addRow([subtitle]);
  const headings = sheet.addRow(headers);
  headings.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headings.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF174E50' } };
  sheet.getRow(1).font = { size: 16, bold: true };
  sheet.mergeCells(1, 1, 1, headers.length);
  sheet.mergeCells(2, 1, 2, headers.length);
  for (const row of rows) sheet.addRow(row.map((value, index) => {
    if (headers[index] !== 'Amount' || typeof value !== 'string' || !/^-?\d+(?:\.\d{1,4})?$/.test(value)) return value;
    // Excel rounds beyond 15 significant digits. Keep those amounts verbatim as text.
    return value.replace(/[^0-9]/g, '').length <= 15 ? Number(value) : value;
  }));
  headers.forEach((header, i) => {
    const column = sheet.getColumn(i + 1);
    column.width = Math.min(46, Math.max(header.length + 3, 16, ...rows.slice(0, 100).map(row => String(row[i] ?? '').length + 2)));
    column.alignment = { vertical: 'top', wrapText: true };
    if (header === 'Amount') column.numFmt = '0.00##';
  });
  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + rows.length, column: headers.length } };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function pdf({ title, subtitle, headers, rows }: Report) {
  const { default: PDFDocument } = await import('pdfkit');
  const document = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 36, autoFirstPage: false, info: { Title: title, Author: 'GymOS' } });
  const output = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    document.on('data', chunk => chunks.push(chunk));
    document.once('end', () => resolve(Buffer.concat(chunks)));
    document.once('error', reject);
  });
  const left = 36;
  const gutter = 8;
  const fontSize = 9;
  const footerInset = 52;
  let top = 0;
  let page = 0;
  let width = 0;
  let column = 0;
  function drawRow(values: Cell[], heading = false) {
    const cells = values.map(value => String(value ?? ''));
    document.font(heading ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
    const height = Math.max(...cells.map(cell => document.heightOfString(cell, { width: column - gutter * 2 })), 11) + 10;
    if (!heading && top + height > document.page.height - footerInset - 6) {
      startPage();
      document.font('Helvetica').fontSize(fontSize);
    }
    if (heading) document.rect(left, top, width, height).fill('#174e50');
    document.fillColor(heading ? '#ffffff' : '#182a2a');
    cells.forEach((cell, i) => document.text(cell, left + i * column + gutter, top + 5, { width: column - gutter * 2 }));
    if (!heading) document.moveTo(left, top + height).lineTo(left + width, top + height).lineWidth(0.4).stroke('#9eb4b3');
    top += height;
  }
  function startPage() {
    document.addPage();
    page++;
    width = document.page.width - left * 2;
    column = width / headers.length;
    document.fillColor('#174e50').font('Helvetica-Bold').fontSize(20).text(title, left, 35, { width });
    document.fillColor('#253838').font('Helvetica').fontSize(9).text(subtitle, left, 62, { width });
    document.text(`Page ${page}`, left, document.page.height - footerInset, { width, align: 'right' });
    top = 83;
    drawRow(headers, true);
  }
  startPage();
  for (const row of rows) drawRow(row);
  if (!rows.length) document.font('Helvetica').fontSize(10).fillColor('#182a2a').text('No records for this report.', left + gutter, top + 12);
  document.end();
  return output;
}

export async function makeReportFile(format: Format, report: Report) {
  if (format === 'csv') return csvDocument(report.headers, report.rows);
  if (format === 'xlsx') return spreadsheet(report);
  return pdf(report);
}
