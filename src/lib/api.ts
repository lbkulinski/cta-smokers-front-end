import { Line } from './types';
import type { SmokingReportsResponse, SmokingReportResponse, SubmitReportRequest, SmokingReportCountResponse, SmokingReportDailyCountsResponse, CountPeriod } from './types';

const SMOKERS_BASE_URL = import.meta.env.VITE_SMOKERS_API_BASE_URL ?? 'https://api.ctasmokers.com';

export class RateLimitError extends Error {}
export class DuplicateReportError extends Error {}

function checkResponse(res: Response, context: string): void {
	if (res.status === 429) {
		throw new RateLimitError('Too many requests. Please wait and try again.');
	}
	if (!res.ok) {
		throw new Error(`${context}: ${res.status} ${res.statusText}`);
	}
}

export async function fetchActiveReports(
	nextCursor?: string,
	limit = 100
): Promise<SmokingReportsResponse> {
	const url = new URL(`${SMOKERS_BASE_URL}/api/cta/reports/smoking/active`);
	url.searchParams.set('limit', String(limit));
	if (nextCursor) {
		url.searchParams.set('cursor', nextCursor);
	}
	const res = await fetch(url.toString());
	checkResponse(res, 'Failed to fetch reports');
	return res.json();
}

export async function submitReport(req: SubmitReportRequest): Promise<SmokingReportResponse> {
	const res = await fetch(`${SMOKERS_BASE_URL}/api/cta/reports/smoking`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(req)
	});
	if (res.status === 409) {
		throw new DuplicateReportError('This car has already been reported and is still active.');
	}
	checkResponse(res, 'Failed to submit report');
	return res.json();
}

export async function fetchDailyCounts(
	line: Line,
	yearMonth: string
): Promise<SmokingReportDailyCountsResponse> {
	const url = `${SMOKERS_BASE_URL}/api/cta/reports/smoking/counts/${line}/month/${yearMonth}/days`;
	const res = await fetch(url);
	checkResponse(res, 'Failed to fetch daily counts');
	return res.json();
}

export async function fetchCount(
	line: Line,
	period: 'all-time'
): Promise<SmokingReportCountResponse>;
export async function fetchCount(
	line: Line,
	period: Exclude<CountPeriod, 'all-time'>,
	value: string
): Promise<SmokingReportCountResponse>;
export async function fetchCount(
	line: Line,
	period: CountPeriod,
	value?: string
): Promise<SmokingReportCountResponse> {
	const base = `${SMOKERS_BASE_URL}/api/cta/reports/smoking/counts/${line}`;
	const url = period === 'all-time' ? `${base}/all-time` : `${base}/${period}/${value}`;
	const res = await fetch(url);
	checkResponse(res, 'Failed to fetch count');
	return res.json();
}
