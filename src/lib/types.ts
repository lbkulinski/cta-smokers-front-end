export enum Line {
	RED = 'RED',
	BLUE = 'BLUE',
	BROWN = 'BROWN',
	GREEN = 'GREEN',
	ORANGE = 'ORANGE',
	PURPLE = 'PURPLE',
	PINK = 'PINK',
	YELLOW = 'YELLOW'
}

export interface Station {
	id: string;
	name: string;
}

export interface SmokingReportResponse {
	reportedAt: string;
	expiresAt: string;
	line: Line;
	destinationId: string;
	nextStationId: string;
	carNumber: string;
	runNumber: string | null;
}

export interface SmokingReportsResponse {
	reports: SmokingReportResponse[];
	nextCursor: string | null;
}

export interface SubmitReportRequest {
	line: Line;
	destinationId: string;
	nextStationId: string;
	carNumber: string;
	runNumber?: string;
}

export type AggregatePeriod = 'all-time' | 'year' | 'month' | 'week' | 'day';

export interface SmokingReportAggregateResponse {
	reportCount: number;
}

export interface SmokingReportDailyCount {
	date: string;
	reportCount: number;
}

export interface SmokingReportDailyCountsResponse {
	days: SmokingReportDailyCount[];
}
