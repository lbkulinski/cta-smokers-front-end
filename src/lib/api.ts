import type { SmokingReportsResponse, SmokingReportResponse, SubmitReportRequest, SubmitReportResponse } from './types';

const SMOKERS_BASE_URL = import.meta.env.VITE_SMOKERS_API_BASE_URL ?? 'https://api.ctasmokers.com';

function checkResponse(res: Response, context: string): void {
	if (res.status === 429) {
		throw new Error('Rate limit exceeded. Please wait 10 seconds before trying again.');
	}
	if (!res.ok) {
		throw new Error(`${context}: ${res.status} ${res.statusText}`);
	}
}

export async function fetchReportsForDate(
	date: string,
	nextCursor?: string
): Promise<SmokingReportsResponse> {
	const url = new URL(`${SMOKERS_BASE_URL}/api/cta/reports/smoking/${date}`);
	if (nextCursor) {
		url.searchParams.set('nextCursor', nextCursor);
	}
	const res = await fetch(url.toString());
	checkResponse(res, 'Failed to fetch reports');
	return res.json();
}

export async function fetchReportById(date: string, reportId: string): Promise<SmokingReportResponse> {
	const res = await fetch(`${SMOKERS_BASE_URL}/api/cta/reports/smoking/${date}/${reportId}`);
	checkResponse(res, 'Failed to fetch report');
	return res.json();
}

export async function submitReport(req: SubmitReportRequest): Promise<SubmitReportResponse> {
	const res = await fetch(`${SMOKERS_BASE_URL}/api/cta/reports/smoking`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(req)
	});
	checkResponse(res, 'Failed to submit report');
	return res.json();
}
