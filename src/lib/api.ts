import type { SmokingReportsResponse, SmokingReportResponse, SubmitReportRequest, SubmitReportResponse } from './types';

const BASE_URL = 'https://api.ctasmokers.com';

export async function fetchReportsForDate(
	date: string,
	nextCursor?: string
): Promise<SmokingReportsResponse> {
	const url = new URL(`${BASE_URL}/api/cta/reports/smoking/${date}`);
	if (nextCursor) {
		url.searchParams.set('nextCursor', nextCursor);
	}
	const res = await fetch(url.toString());
	if (!res.ok) {
		throw new Error(`Failed to fetch reports: ${res.status} ${res.statusText}`);
	}
	return res.json();
}

export async function fetchTop25Today(): Promise<SmokingReportResponse[]> {
	const today = new Date().toISOString().slice(0, 10);
	const collected: SmokingReportResponse[] = [];
	let cursor: string | undefined = undefined;

	while (collected.length < 25) {
		const data = await fetchReportsForDate(today, cursor);
		collected.push(...data.reports);
		if (!data.nextCursor || data.reports.length === 0) break;
		cursor = data.nextCursor;
	}

	return collected.slice(0, 25);
}

export async function submitReport(req: SubmitReportRequest): Promise<SubmitReportResponse> {
	const res = await fetch(`${BASE_URL}/api/cta/reports/smoking`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(req)
	});
	if (!res.ok) {
		throw new Error(`Failed to submit report: ${res.status} ${res.statusText}`);
	}
	return res.json();
}
