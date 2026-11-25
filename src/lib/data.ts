import csv from '../../static/data/daily.csv?raw';
import { lastDate, parseDailyCsv, totalReports } from './counts';
import { setDataEnd } from './date-utils';

export const ROWS = parseDailyCsv(csv);
export const DATA_LAST_DATE = lastDate(ROWS);
export const TOTAL_REPORTS = totalReports(ROWS);

setDataEnd(DATA_LAST_DATE);
