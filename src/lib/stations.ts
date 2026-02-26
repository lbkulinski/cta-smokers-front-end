import { Line } from './types';
import type { Station } from './types';
import rawStops from './cta-stops.json';

interface StopData {
	map_id: string;
	station_name: string;
	red: boolean;
	blue: boolean;
	g: boolean;
	brn: boolean;
	p: boolean;
	y: boolean;
	pnk: boolean;
	o: boolean;
}

const stops = rawStops as unknown as StopData[];

const LINE_FLAG: Record<Line, (s: StopData) => boolean> = {
	[Line.RED]: (s) => s.red,
	[Line.BLUE]: (s) => s.blue,
	[Line.GREEN]: (s) => s.g,
	[Line.BROWN]: (s) => s.brn,
	[Line.PURPLE]: (s) => s.p,
	[Line.YELLOW]: (s) => s.y,
	[Line.PINK]: (s) => s.pnk,
	[Line.ORANGE]: (s) => s.o
};

const LINE_TERMINALS: Record<Line, string[]> = {
	[Line.RED]: ['40900', '40450'],            // Howard, 95th/Dan Ryan
	[Line.BLUE]: ['40890', '40390'],           // O'Hare, Forest Park
	[Line.GREEN]: ['40020', '40720', '40290'], // Harlem/Lake, Cottage Grove, Ashland/63rd
	[Line.BROWN]: ['41290'],                   // Kimball
	[Line.PURPLE]: ['41050', '40900'],         // Linden, Howard
	[Line.ORANGE]: ['40930'],                  // Midway
	[Line.PINK]: ['40580'],                    // 54th/Cermak
	[Line.YELLOW]: ['40140', '40900']          // Dempster-Skokie, Howard
};

// Lines that also serve the Loop as a destination
const LOOP_LINES = new Set([Line.BROWN, Line.ORANGE, Line.PINK, Line.PURPLE]);
const LOOP_STATION: Station = { id: '0', name: 'Loop' };

function dedupeByMapId(filteredStops: StopData[]): Station[] {
	const seen = new Set<string>();
	const result: Station[] = [];
	for (const stop of filteredStops) {
		if (!seen.has(stop.map_id)) {
			seen.add(stop.map_id);
			result.push({ id: stop.map_id, name: stop.station_name });
		}
	}
	return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function getDestinations(line: Line): Station[] {
	const isOnLine = LINE_FLAG[line];
	const terminals = LINE_TERMINALS[line];
	const result = dedupeByMapId(stops.filter((s) => isOnLine(s) && terminals.includes(s.map_id)));
	if (LOOP_LINES.has(line)) {
		result.push(LOOP_STATION);
		result.sort((a, b) => a.name.localeCompare(b.name));
	}
	return result;
}

export function getStations(line: Line): Station[] {
	const isOnLine = LINE_FLAG[line];
	return dedupeByMapId(stops.filter((s) => isOnLine(s)));
}

const stationNameMap = new Map<string, string>(stops.map((s) => [s.map_id, s.station_name]));

export function getStationName(mapId: string): string {
	if (mapId === '0') return 'Loop';
	return stationNameMap.get(mapId) ?? mapId;
}
