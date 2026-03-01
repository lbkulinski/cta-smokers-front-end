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

// Stations in actual route order (terminal-to-terminal) for each line.
// Used to sort the "Next Station" dropdown by stop order instead of alphabetically.
const LINE_STOP_ORDER: Record<Line, string[]> = {
	// Howard → 95th/Dan Ryan (north → south)
	[Line.RED]: ['40900','41190','40100','41300','40760','40880','41380','40340','41200','40770','40540','40080','41420','41320','41220','40650','40630','41450','40330','41660','41090','40560','41490','41400','41000','40190','41230','41170','40910','40990','40240','41430','40450'],
	// O'Hare → Forest Park (west → east)
	[Line.BLUE]: ['40890','40820','40230','40750','41280','41330','40550','41240','40060','41020','40570','40220','40590','40320','41410','40490','40380','40370','40790','40070','41340','40430','40350','40470','40810','40670','40250','40920','40970','40010','40180','40980','40390'],
	// Harlem/Lake → Cottage Grove / Ashland/63rd (west → east → south)
	[Line.GREEN]: ['40020','41350','40610','41260','40280','40700','40480','40030','41670','41070','41360','41710','40170','41510','41160','40380','40260','41700','40680','41400','41690','41120','40300','41270','41080','40130','40510','41140','40720','40940','40290'],
	// Kimball → Loop counterclockwise (northwest → downtown)
	[Line.BROWN]: ['41290','41180','40870','41010','41480','40090','41500','41460','41440','41310','40360','41320','41210','40530','41220','40660','40800','40710','40460','40730','40040','40160','40850','40680','41700','40260','40380'],
	// Linden → Howard → Loop clockwise (north → downtown)
	[Line.PURPLE]: ['41050','41250','40400','40520','40050','40690','40270','40840','40900','40540','41320','41210','40530','41220','40660','40800','40710','40460','40380','40260','41700','40680','40850','40160','40040','40730'],
	// Midway → Loop (southwest → downtown)
	[Line.ORANGE]: ['40930','40960','41150','40310','40120','41060','41130','41400','40850','40160','40040','40730','40380','40260','41700','40680'],
	// 54th/Cermak → Loop (west → downtown)
	[Line.PINK]: ['40580','40420','40600','40150','40780','41040','40440','40740','40210','40830','41030','40170','41510','41160','40380','40260','41700','40680','40850','40160','40040','40730'],
	// Dempster-Skokie → Howard (north → south)
	[Line.YELLOW]: ['40140','41680','40900'],
};

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
	const order = LINE_STOP_ORDER[line];
	const indexMap = new Map(order.map((id, i) => [id, i]));
	const seen = new Set<string>();
	const result: Station[] = [];
	for (const stop of stops.filter((s) => isOnLine(s))) {
		if (!seen.has(stop.map_id)) {
			seen.add(stop.map_id);
			result.push({ id: stop.map_id, name: stop.station_name });
		}
	}
	result.sort((a, b) => {
		const ai = indexMap.get(a.id) ?? Infinity;
		const bi = indexMap.get(b.id) ?? Infinity;
		return ai !== bi ? ai - bi : a.name.localeCompare(b.name);
	});
	return result;
}

const stationNameMap = new Map<string, string>(stops.map((s) => [s.map_id, s.station_name]));

export function getStationName(mapId: string): string {
	if (mapId === '0') return 'Loop';
	return stationNameMap.get(mapId) ?? mapId;
}
