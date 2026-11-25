import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = (name: string) => fileURLToPath(new URL(`../static/data/${name}`, import.meta.url));
const zip = path('cta-smokers-report-counts.zip');
const FILES = ['README.txt', 'all_time.csv', 'daily.csv', 'monthly.csv', 'weekly.csv', 'yearly.csv'];

test('the download zip holds exactly the published data files', () => {
	const names = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n');
	assert.deepEqual(names.sort(), [...FILES].sort());
	for (const name of FILES) {
		assert.ok(execFileSync('unzip', ['-p', zip, name]).equals(readFileSync(path(name))), `${name} differs`);
	}
});
