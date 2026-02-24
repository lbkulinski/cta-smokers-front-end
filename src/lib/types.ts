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

export interface SmokingReportResponse {
	reportId: string;
	line: Line;
	destination: string;
	nextStop: string;
	carNumber: string;
	runNumber?: string;
	reportedAt: string;
}

export interface SmokingReportsResponse {
	reports: SmokingReportResponse[];
	nextCursor?: string;
}

export interface SubmitReportRequest {
	line: Line;
	destination: string;
	nextStop: string;
	carNumber: string;
	runNumber?: string;
}

export interface SubmitReportResponse {
	reportId: string;
	line: Line;
	destination: string;
	nextStop: string;
	carNumber: string;
	runNumber?: string;
	reportedAt: string;
}
