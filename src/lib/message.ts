export interface ReportDraft {
	lineName: string;
	destinationName: string;
	nextStationName: string;
	carNumber: string;
	runNumber: string;
}

const SMS_NUMBER = '+13123139015';

export function buildMessage(draft: ReportDraft): string {
	const { lineName, destinationName, nextStationName, carNumber, runNumber } = draft;
	if (!lineName) return '';

	const parts = [`Smoking on a CTA ${lineName} train`];
	if (carNumber) parts.push(`car ${carNumber}`);
	if (destinationName) {
		parts.push(`toward ${destinationName === 'Loop' ? 'the Loop' : destinationName}`);
	}
	if (nextStationName) parts.push(`next stop ${nextStationName}`);

	const sentence = `${parts.join(', ')}.`;
	return runNumber ? `${sentence} Run ${runNumber}.` : sentence;
}

export function buildSmsHref(message: string): string {
	return `sms:${SMS_NUMBER}?body=${encodeURIComponent(message)}`;
}
