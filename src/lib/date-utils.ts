import type { AggregatePeriod } from './types';

export const APP_LAUNCH_YEAR = 2026;
export const APP_MIN_DATE = '2026-02-28';

export function getChicagoParts(): { year: number; month: number; day: number } {
	const s = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
	const [year, month, day] = s.split('-').map(Number);
	return { year, month, day };
}

export function getISOWeekString(year: number, month: number, day: number): string {
	const d = new Date(Date.UTC(year, month - 1, day));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export const APP_MIN_WEEK = getISOWeekString(2026, 2, 28);

export function isoWeeksInYear(year: number): number {
	const jan1 = new Date(year, 0, 1).getDay();
	const dec31 = new Date(year, 11, 31).getDay();
	return (jan1 === 4 || dec31 === 4) ? 53 : 52;
}

export function getCurrentDate(period: Exclude<AggregatePeriod, 'all-time'>): string {
	const { year, month, day } = getChicagoParts();
	if (period === 'month') return `${year}-${String(month).padStart(2, '0')}`;
	if (period === 'year') return String(year);
	if (period === 'week') return getISOWeekString(year, month, day);
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

export function isAtMinPeriod(period: AggregatePeriod, date: string): boolean {
	if (period === 'all-time') return true;
	if (period === 'day') return date <= APP_MIN_DATE;
	if (period === 'week') return date <= APP_MIN_WEEK;
	if (period === 'month') return date <= '2026-02';
	if (period === 'year') return parseInt(date) <= APP_LAUNCH_YEAR;
	return false;
}

export function formatWeekRange(date: string): string {
	const [yearStr, weekStr] = date.split('-W');
	const year = parseInt(yearStr);
	const week = parseInt(weekStr);
	const jan4 = new Date(Date.UTC(year, 0, 4));
	const monday = new Date(jan4);
	monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (week - 1) * 7);
	const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));
	const monthOpts: Intl.DateTimeFormatOptions = { month: 'short', timeZone: 'UTC' };
	const startMonth = monday.toLocaleDateString('en-US', monthOpts);
	const endMonth = sunday.toLocaleDateString('en-US', monthOpts);
	const startDay = String(monday.getUTCDate()).padStart(2, '0');
	const endDay = String(sunday.getUTCDate()).padStart(2, '0');
	return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

export function formatPeriodLabel(period: AggregatePeriod, date: string): string {
	if (period === 'all-time') return 'All Time';
	if (period === 'year') return date;
	if (period === 'month') {
		const [year, month] = date.split('-').map(Number);
		return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	}
	if (period === 'week') return formatWeekRange(date);
	if (period === 'day') {
		const [year, month, day] = date.split('-').map(Number);
		return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
	}
	return date;
}

export function getTrendSubPeriods(
	period: AggregatePeriod,
	date: string
): { subPeriod: Exclude<AggregatePeriod, 'all-time'>; value: string }[] {
	const { year: chicagoYear, month: chicagoMonth, day: chicagoDay } = getChicagoParts();
	const todayStr = `${chicagoYear}-${String(chicagoMonth).padStart(2, '0')}-${String(chicagoDay).padStart(2, '0')}`;

	if (period === 'all-time') {
		const result: { subPeriod: Exclude<AggregatePeriod, 'all-time'>; value: string }[] = [];
		for (let y = APP_LAUNCH_YEAR; y <= chicagoYear; y++) {
			result.push({ subPeriod: 'year', value: String(y) });
		}
		return result;
	}

	if (period === 'year') {
		const year = parseInt(date);
		const maxMonth = year < chicagoYear ? 12 : chicagoMonth;
		const result: { subPeriod: Exclude<AggregatePeriod, 'all-time'>; value: string }[] = [];
		for (let m = 1; m <= maxMonth; m++) {
			result.push({ subPeriod: 'month', value: `${year}-${String(m).padStart(2, '0')}` });
		}
		return result;
	}

	if (period === 'month') {
		const [year, month] = date.split('-').map(Number);
		const daysInMonth = new Date(year, month, 0).getDate();
		const result: { subPeriod: Exclude<AggregatePeriod, 'all-time'>; value: string }[] = [];
		for (let d = 1; d <= daysInMonth; d++) {
			const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			if (dayStr > todayStr) break;
			result.push({ subPeriod: 'day', value: dayStr });
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
		const result: { subPeriod: Exclude<AggregatePeriod, 'all-time'>; value: string }[] = [];
		for (let d = 0; d < 7; d++) {
			const day = new Date(monday);
			day.setUTCDate(monday.getUTCDate() + d);
			const dayStr = day.toISOString().slice(0, 10);
			if (dayStr > todayStr) break;
			result.push({ subPeriod: 'day', value: dayStr });
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
		return String(day);
	}
	return value;
}
