import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const directory = fileURLToPath(new URL('./fixtures/v1-baseline/', import.meta.url));
const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
const preservation = JSON.parse(await readFile(join(directory, 'preservation.json'), 'utf8'));
const fixture = JSON.parse(await readFile(join(directory, 'fixture.json'), 'utf8'));
for (const [file, hash] of Object.entries(manifest.harnessHashes)) assert.equal(createHash('sha256').update(await readFile(new URL(`../../../../${file}`, import.meta.url))).digest('hex'), hash, `Executed harness ${file}`);
const required = ['A01', 'A02', 'S01', ...Array.from({ length: 14 }, (_, i) => `O${String(i + 1).padStart(2, '0')}`), ...Array.from({ length: 6 }, (_, i) => `T${String(i + 1).padStart(2, '0')}`), 'M01', 'M02', 'M03'];
assert.equal(manifest.sourceRevision, preservation.before.revision);
assert.equal(manifest.clock, fixture.clock);
assert.deepEqual(manifest.failures, []);
assert.equal(preservation.unchanged, true);
assert.deepEqual(preservation.before, preservation.after);
assert.equal(preservation.cleanup.containerRemoved, true);
assert.equal(preservation.cleanup.manifestRemoved, true);
assert.equal(preservation.disposableCopyRemoved, true);
assert.ok(manifest.assertions.length > 26);
for (const assertion of manifest.assertions) assert.equal(assertion.passed, true, assertion.name);
for (const id of required) for (const width of [1440, 768, 390, 320]) {
  assert.equal(manifest.captures.filter(c => c.id === id && c.state === 'baseline' && c.viewport.width === width).length, 1, `${id}/${width} baseline`);
}
for (const [id, states] of Object.entries({
  A01: ['invalid-credentials', 'rate-limited', 'inactive-account', 'submitting'],
  A02: ['required', 'validation-error', 'submitting', 'updated-confirmation'],
  O03: ['one-time-handoff-redacted', 'duplicate-email-error', 'submitting'],
  O04: ['attendance-history', 'billing-history', 'without-pack', 'pack-validation-error', 'desk-payment-reference'],
  O06: ['one-time-handoff-redacted', 'duplicate-email-error', 'submitting'],
  O07: ['shift-success', 'shift-failure'],
  O08: ['monthly-member-overview', 'monthly-more-overlay', 'missed-filter', 'page-2'],
  O10: ['expense-management', 'deferred-revenue', 'trainer-payroll', 'p-l-report', 'export-data', 'budget-dialog', 'expense-error', 'budget-error', 'payroll-closed', 'payroll-approved'],
  O12: ['membership-plans', 'pt-session-rates', 'trainer-pay-rates', 'cancellation-policy', 'add-plan-inline', 'profile-success', 'rates-error'],
  O13: ['page-2', 'loading', 'empty-filter'],
  T01: ['decline-dialog', 'notes-dialog', 'empty'],
  T03: ['workout-plans', 'meal-plans', 'session-history', 'foreign-client-denied'],
  T04: ['row-added', 'row-removed', 'native-validation'], T05: ['row-added', 'row-removed', 'edited-macro-totals', 'native-validation'],
  T06: ['page-2', 'empty'], M02: ['no-credits', 'missing-trainer', 'no-gym', 'collision-error', 'submitting'],
  M03: ['withdrawal-warning', 'cancellation-warning', 'empty'], X01: ['error'], X02: ['not-found'], X03: ['loading'],
})) for (const state of states) for (const width of [1440, 390]) {
  assert.ok(manifest.captures.some(c => c.id === id && c.state === state && c.viewport.width === width), `${id}/${state}/${width}`);
}
const paths = new Set();
for (const capture of manifest.captures) {
  assert.equal(capture.outcome, 'captured');
  assert.match(capture.image, /^images\/[A-Za-z0-9-]+\.png$/);
  assert.ok(!paths.has(capture.image), `Duplicate ${capture.image}`);
  paths.add(capture.image);
  const bytes = await readFile(join(directory, capture.image));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), capture.sha256, capture.image);
  assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
  if (capture.id === 'O14' || /payment|receipt|billing/.test(capture.state)) assert.equal(capture.referenceOnly, true);
  assert.ok(capture.browser && capture.font && capture.role && capture.clock);
}
assert.deepEqual((await readdir(join(directory, 'images'))).sort(), [...paths].map(p => p.slice(7)).sort(), 'Unmanifested or missing images');
assert.equal(fixture.counts.gym, 2);
assert.ok(fixture.counts.user >= 60 && fixture.counts.auditLog >= 21);
const summary = { capturedImages: manifest.captures.length, baselineScreens: required.length, baselineImages: required.length * 4, states: new Set(manifest.captures.map(c => `${c.id}/${c.state}`)).size, widths: [1440, 768, 390, 320], preservedSourceFiles: Object.keys(preservation.before.hashes).length, horizontalOverflowImages: manifest.captures.filter(c => c.horizontalOverflow).length, assertions: manifest.assertions.length, allChecksPassed: true };
await writeFile(join(directory, 'verification.json'), `${JSON.stringify(summary, null, 2)}\n`);
// Inline metadata allows the review gallery to work directly from a local file.
const data = JSON.stringify(manifest.captures).replaceAll('<', '\\u003c');
await writeFile(join(directory, 'gallery.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>GYMOS-MIG-014 · V1 visual reference</title><style>body{font:15px system-ui;margin:24px;background:#f4f5f7;color:#171b28}header{position:sticky;top:0;background:#f4f5f7;padding:8px 0;z-index:1}input,select{padding:10px;margin:4px;border:1px solid #bbb;border-radius:6px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}article{background:white;border:1px solid #ddd;border-radius:8px;padding:12px}img{width:100%;height:260px;object-fit:contain;object-position:top;background:#eee}small{display:block;margin:6px 0;color:#4a4d58}a{color:#007a35}</style><header><h1>V1 visual reference</h1><p>${summary.baselineScreens} screens · ${summary.capturedImages} actual images · frozen ${manifest.clock}. O14 and payment controls are reference only. V2 parity remains Task 065.</p><input id="search" aria-label="Filter screen or state" placeholder="Filter screen or state"><select id="width" aria-label="Viewport"><option value="">All widths</option><option>1440</option><option>768</option><option>390</option><option>320</option></select><span id="count"></span></header><main id="grid"></main><script>const captures=${data}; const search=document.querySelector('#search'), width=document.querySelector('#width'), grid=document.querySelector('#grid'); function render(){grid.replaceChildren(); const selected=captures.filter(c=>(!width.value||String(c.viewport.width)===width.value)&&((c.id+' '+c.state).toLowerCase().includes(search.value.toLowerCase())));document.querySelector('#count').textContent=selected.length+' images';for(const c of selected){const article=document.createElement('article'),a=document.createElement('a'),img=document.createElement('img'),label=document.createElement('strong'),meta=document.createElement('small');a.href=c.image;img.src=c.image;img.loading='lazy';img.alt=c.id+' '+c.state;label.textContent=c.id+' · '+c.state;meta.textContent=c.viewport.width+'×'+c.viewport.height+' · '+c.role+(c.referenceOnly?' · Reference only':'')+(c.horizontalOverflow?' · V1 horizontal overflow':'');a.append(img);article.append(label,meta,a);grid.append(article);}}search.addEventListener('input',render);width.addEventListener('change',render);render();</script></html>`);
console.log(JSON.stringify(summary, null, 2));
