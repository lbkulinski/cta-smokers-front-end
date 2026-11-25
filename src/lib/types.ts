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

export type CountPeriod = 'all-time' | 'year' | 'month' | 'week' | 'day';
