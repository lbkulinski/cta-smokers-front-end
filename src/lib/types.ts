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
	date: string;
	reportId: string;
	reportedAt: string;
	expiresAt: string;
	line: Line;
	destinationId: string;
	nextStationId: string;
	carNumber: string;
	runNumber?: string;
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

export interface SubmitReportResponse {
	date: string;
	reportId: string;
	reportedAt: string;
	expiresAt: string;
	line: Line;
	destinationId: string;
	nextStationId: string;
	carNumber: string;
	runNumber?: string;
}
