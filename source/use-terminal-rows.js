import process from 'node:process';
import {useEffect, useState} from 'react';

const DEFAULT_ROWS = 24;

/**
 * The terminal height, kept up to date while the window is resized, so the
 * wallet list can be sized to fit the window.
 */
export default function useTerminalRows() {
	const [rows, setRows] = useState(process.stdout.rows || DEFAULT_ROWS);

	useEffect(() => {
		const onResize = () => {
			setRows(process.stdout.rows || DEFAULT_ROWS);
		};

		process.stdout.on('resize', onResize);
		return () => {
			process.stdout.off('resize', onResize);
		};
	}, []);

	return rows;
}
