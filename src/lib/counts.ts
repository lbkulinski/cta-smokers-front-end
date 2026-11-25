import type { CountPeriod, Line } from './types';
import { APP_MIN_DATE, getISOWeekString } from './date-utils.ts';

export interface DailyRow {
	line: Line;
	date: string;
	count: number;
}

const HEADER = 'line,date,report_count';
const ROW = /^(RED|BLUE|BROWN|GREEN|ORANGE|PURPLE|PINK|YELLOW),(\d{4}-\d{2}-\d{2}),(\d+)$/;

export function parseDailyCsv(csv: string): DailyRow[] {
	const [header, ...lines] = csv.trim().split(/\r?\n/);
	if (header !== HEADER) throw new Error(`daily.csv: unexpected header "${header}"`);

	return lines.map((text) => {
		const match = ROW.exec(text);
		if (!match) throw new Error(`daily.csv: malformed row "${text}"`);
		return { line: match[1] as Line, date: match[2], count: Number(match[3]) };
	});
}

/** The day, week, month or year that a YYYY-MM-DD date falls in. */
function periodValue(date: string, period: Exclude<CountPeriod, 'all-time'>): string {
	if (period === 'day') return date;
	if (period === 'month') return date.slice(0, 7);
	if (period === 'year') return date.slice(0, 4);
	const [year, month, day] = date.split('-').map(Number);
	return getISOWeekString(year, month, day);
}

const sum = (rows: DailyRow[]) => rows.reduce((total, row) => total + row.count, 0);

export function countFor(rows: DailyRow[], line: Line, period: CountPeriod, value?: string): number {
	return sum(
		rows.filter(
			(row) => row.line === line && (period === 'all-time' || periodValue(row.date, period) === value)
		)
	);
}

export function totalReports(rows: DailyRow[]): number {
	return sum(rows);
}

export function lastDate(rows: DailyRow[]): string {
	return rows.reduce((last, row) => (row.date > last ? row.date : last), '');
}

const FORMATS: Record<Exclude<CountPeriod, 'all-time'>, RegExp> = {
	day: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
	week: /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/,
	month: /^\d{4}-(0[1-9]|1[0-2])$/,
	year: /^\d{4}$/
};

function isRealDay(value: string): boolean {
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Turns raw /stats query values into a view that exists within the data. */
export function parseStatsParams(
	period: string | null,
	date: string | null,
	last: string
): { period: CountPeriod; date: string } {
	if (period !== 'day' && period !== 'week' && period !== 'month' && period !== 'year') {
		return { period: 'all-time', date: '' };
	}

	const min = periodValue(APP_MIN_DATE, period);
	const max = periodValue(last, period);
	const valid =
		date !== null &&
		FORMATS[period].test(date) &&
		(period !== 'day' || isRealDay(date)) &&
		date >= min &&
		date <= max;

	return { period, date: valid ? date : max };
}
