import type { AggregatePeriod } from './types';

const APP_LAUNCH_YEAR = 2026;

export function getISOWeekString(date: Date): string {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function isoWeeksInYear(year: number): number {
	const jan1 = new Date(year, 0, 1).getDay();
	const dec31 = new Date(year, 11, 31).getDay();
	return (jan1 === 4 || dec31 === 4) ? 53 : 52;
}

export function getCurrentDate(period: Exclude<AggregatePeriod, 'all-time'>): string {
	const now = new Date();
	if (period === 'month') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	if (period === 'year') return String(now.getFullYear());
	if (period === 'week') return getISOWeekString(now);
	return now.toISOString().slice(0, 10);
}

export function stepPeriod(period: AggregatePeriod, date: string, delta: number): string {
	if (period === 'year') return String(parseInt(date) + delta);
	if (period === 'month') {
		const [year, month] = date.split('-').map(Number);
		const d = new Date(year, month - 1 + delta, 1);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	}
	if (period === 'week') {
		const [yearStr, weekStr] = date.split('-W');
		let year = parseInt(yearStr);
		let week = parseInt(weekStr) + delta;
		if (week < 1) { year--; week = isoWeeksInYear(year); }
		else if (week > isoWeeksInYear(year)) { year++; week = 1; }
		return `${year}-W${String(week).padStart(2, '0')}`;
	}
	if (period === 'day') {
		const d = new Date(date + 'T00:00:00Z');
		d.setUTCDate(d.getUTCDate() + delta);
		return d.toISOString().slice(0, 10);
	}
	return date;
}

export function isAtCurrentPeriod(period: AggregatePeriod, date: string): boolean {
	if (period === 'all-time') return true;
	return date === getCurrentDate(period);
}

export function formatPeriodLabel(period: AggregatePeriod, date: string): string {
	if (period === 'all-time') return 'All Time';
	if (period === 'year') return date;
	if (period === 'month') {
		const [year, month] = date.split('-').map(Number);
		return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}
	if (period === 'week') return date;
	if (period === 'day') {
		const [year, month, day] = date.split('-').map(Number);
		return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
	}
	return date;
}

export function getTrendSubPeriods(
	period: AggregatePeriod,
	date: string
): { subPeriod: AggregatePeriod; value: string }[] {
	const now = new Date();

	if (period === 'all-time') {
		const currentYear = now.getFullYear();
		const result: { subPeriod: AggregatePeriod; value: string }[] = [];
		for (let y = APP_LAUNCH_YEAR; y <= currentYear; y++) {
			result.push({ subPeriod: 'year', value: String(y) });
		}
		return result;
	}

	if (period === 'year') {
		const year = parseInt(date);
		const maxMonth = year < now.getFullYear() ? 12 : now.getMonth() + 1;
		const result: { subPeriod: AggregatePeriod; value: string }[] = [];
		for (let m = 1; m <= maxMonth; m++) {
			result.push({ subPeriod: 'month', value: `${year}-${String(m).padStart(2, '0')}` });
		}
		return result;
	}

	if (period === 'month') {
		const [year, month] = date.split('-').map(Number);
		const daysInMonth = new Date(year, month, 0).getDate();
		const result: { subPeriod: AggregatePeriod; value: string }[] = [];
		for (let d = 1; d <= daysInMonth; d++) {
			const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			if (dayStr <= now.toISOString().slice(0, 10)) {
				result.push({ subPeriod: 'day', value: dayStr });
			}
		}
		return result;
	}

	if (period === 'week') {
		const [yearStr, weekStr] = date.split('-W');
		const year = parseInt(yearStr);
		const week = parseInt(weekStr);
		const jan4 = new Date(Date.UTC(year, 0, 4));
		const monday = new Date(jan4);
		monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (week - 1) * 7);
		const result: { subPeriod: AggregatePeriod; value: string }[] = [];
		for (let d = 0; d < 7; d++) {
			const day = new Date(monday);
			day.setUTCDate(monday.getUTCDate() + d);
			result.push({ subPeriod: 'day', value: day.toISOString().slice(0, 10) });
		}
		return result;
	}

	return [];
}

export function formatTrendLabel(
	parentPeriod: AggregatePeriod,
	subPeriod: AggregatePeriod,
	value: string
): string {
	if (subPeriod === 'year') return value;
	if (subPeriod === 'month') {
		const [year, month] = value.split('-').map(Number);
		return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' });
	}
	if (subPeriod === 'day') {
		const [year, month, day] = value.split('-').map(Number);
		const d = new Date(year, month - 1, day);
		if (parentPeriod === 'week') return d.toLocaleDateString('en-US', { weekday: 'short' });
		if (parentPeriod === 'month') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		return String(day);
	}
	return value;
}
