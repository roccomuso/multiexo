const UNITS = [
	[31_536_000_000, 'year'],
	[2_592_000_000, 'month'],
	[604_800_000, 'week'],
	[86_400_000, 'day'],
	[3_600_000, 'hour'],
	[60_000, 'minute'],
];

export default function relativeTime(date) {
	if (!date) {
		return 'never opened';
	}

	const elapsed = Date.now() - date.getTime();

	if (elapsed < 60_000) {
		return 'just now';
	}

	for (const [size, label] of UNITS) {
		if (elapsed >= size) {
			const amount = Math.floor(elapsed / size);
			return `${amount} ${label}${amount === 1 ? '' : 's'} ago`;
		}
	}

	return 'just now';
}
