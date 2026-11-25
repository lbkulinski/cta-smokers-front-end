import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDailyCsv, countFor, totalReports, lastDate, parseStatsParams } from '../src/lib/counts.ts';

const read = (name: string) => readFileSync(new URL(`../static/data/${name}`, import.meta.url), 'utf8');
const rows = parseDailyCsv(read('daily.csv'));
const table = (name: string) => read(name).trim().split(/\r?\n/).slice(1).map((l) => l.split(','));

test('derived totals match every aggregate in the export', () => {
	for (const [line, week, n] of table('weekly.csv')) assert.equal(countFor(rows, line as any, 'week', week), Number(n));
	for (const [line, month, n] of table('monthly.csv')) assert.equal(countFor(rows, line as any, 'month', month), Number(n));
	for (const [line, year, n] of table('yearly.csv')) assert.equal(countFor(rows, line as any, 'year', year), Number(n));
	for (const [line, n] of table('all_time.csv')) assert.equal(countFor(rows, line as any, 'all-time'), Number(n));
	assert.equal(totalReports(rows), table('all_time.csv').reduce((s, [, n]) => s + Number(n), 0));
});
test('single day, and zero when there is no row', () => {
	assert.equal(countFor(rows, 'BLUE' as any, 'day', '2026-03-02'), 5);
	assert.equal(countFor(rows, 'YELLOW' as any, 'day', '2026-03-02'), 0);
});
test('CRLF parses the same; malformed input throws', () => {
	const lf = 'line,date,report_count\nRED,2026-03-01,2\n';
	assert.deepEqual(parseDailyCsv(lf.replaceAll('\n', '\r\n')), parseDailyCsv(lf));
	assert.equal(lastDate(parseDailyCsv(lf)), '2026-03-01');
	assert.throws(() => parseDailyCsv('line,date,report_count\nRED,2026-03-01,x\n'));
	assert.throws(() => parseDailyCsv('line,date,report_count\nTEAL,2026-03-01,1\n'));
	assert.throws(() => parseDailyCsv('a,b,c\n'));
});
test('stats params fall back to a valid view', () => {
	const last = '2026-11-24';
	const p = (a: string | null, b: string | null) => parseStatsParams(a, b, last);
	assert.deepEqual(p(null, null), { period: 'all-time', date: '' });
	assert.deepEqual(p('foo', 'x'), { period: 'all-time', date: '' });
	assert.deepEqual(p('month', null), { period: 'month', date: '2026-11' });
	assert.deepEqual(p('month', 'garbage'), { period: 'month', date: '2026-11' });
	assert.deepEqual(p('month', '2026-13'), { period: 'month', date: '2026-11' });
	assert.deepEqual(p('day', '2027-01-05'), { period: 'day', date: '2026-11-24' });
	assert.deepEqual(p('day', '2026-01-01'), { period: 'day', date: '2026-11-24' });
	assert.deepEqual(p('week', '2026-W09'), { period: 'week', date: '2026-W09' });
	assert.deepEqual(p('year', '2026'), { period: 'year', date: '2026' });
});
