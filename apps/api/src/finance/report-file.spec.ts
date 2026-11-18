import { expect, it } from 'vitest';
import { makeReportFile } from './report-file.js';

it('keeps a short PDF report and its footer on one page', async () => {
  const data = await makeReportFile('pdf', {
    title: 'GymOS Expenses',
    subtitle: 'November 2026',
    headers: ['Expense', 'Amount'],
    rows: [['Utilities', '100.00']],
  });

  // PDFKit writes the page tree dictionary uncompressed.
  expect(Buffer.from(data).toString('latin1')).toMatch(/^\/Count 1\r?$/m);
});
