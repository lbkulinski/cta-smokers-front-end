import { Line } from './types';

export const LINE_COLORS: Record<Line, string> = {
	[Line.RED]: '#c60c30',
	[Line.BLUE]: '#00a1de',
	[Line.BROWN]: '#62361b',
	[Line.GREEN]: '#009b3a',
	[Line.ORANGE]: '#f9461c',
	[Line.PURPLE]: '#522398',
	[Line.PINK]: '#e27ea6',
	[Line.YELLOW]: '#f9e300'
};

export const LINE_TEXT_COLORS: Record<Line, 'white' | 'black'> = {
	[Line.RED]: 'white',
	[Line.BLUE]: 'white',
	[Line.BROWN]: 'white',
	[Line.GREEN]: 'white',
	[Line.ORANGE]: 'white',
	[Line.PURPLE]: 'white',
	[Line.PINK]: 'white',
	[Line.YELLOW]: 'black'
};

export const LINE_DISPLAY_NAMES: Record<Line, string> = {
	[Line.RED]: 'Red Line',
	[Line.BLUE]: 'Blue Line',
	[Line.BROWN]: 'Brown Line',
	[Line.GREEN]: 'Green Line',
	[Line.ORANGE]: 'Orange Line',
	[Line.PURPLE]: 'Purple Line',
	[Line.PINK]: 'Pink Line',
	[Line.YELLOW]: 'Yellow Line'
};
