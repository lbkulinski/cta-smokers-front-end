import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMessage, buildSmsHref } from '../src/lib/message.ts';

const full = { lineName: 'Red Line', destinationName: '95th/Dan Ryan', nextStationName: 'Fullerton', carNumber: '5432', runNumber: '' };

test('full draft', () => {
	assert.equal(buildMessage(full), 'Smoking on a CTA Red Line train, car 5432, toward 95th/Dan Ryan, next stop Fullerton.');
});
test('run number is appended', () => {
	assert.ok(buildMessage({ ...full, runNumber: '101' }).endsWith('next stop Fullerton. Run 101.'));
});
test('Loop takes an article', () => {
	assert.match(buildMessage({ ...full, destinationName: 'Loop' }), /toward the Loop,/);
});
test('empty parts are omitted', () => {
	assert.equal(buildMessage({ lineName: 'Red Line', destinationName: '', nextStationName: '', carNumber: '', runNumber: '' }), 'Smoking on a CTA Red Line train.');
	assert.equal(buildMessage({ ...full, lineName: '' }), '');
});
test('sms href round-trips awkward names', () => {
	const message = "toward O'Hare, next stop Clark/Lake & 95th.";
	const href = buildSmsHref(message);
	assert.ok(href.startsWith('sms:+13123139015?body='));
	assert.ok(!href.includes(' ') && !href.includes('&'));
	assert.equal(decodeURIComponent(href.split('?body=')[1]), message);
});
