import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {expandHome} from './wallets.js';

const CANDIDATES = {
	darwin: [
		'/Applications/Exodus.app/Contents/MacOS/Exodus',
		path.join(os.homedir(), 'Applications/Exodus.app/Contents/MacOS/Exodus'),
	],
	linux: [
		'/opt/Exodus/Exodus',
		'/usr/share/exodus/Exodus',
		'/usr/bin/exodus',
		'/usr/local/bin/exodus',
	],
	win32: [
		path.join(
			process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData/Local'),
			'exodus/Exodus.exe',
		),
		'C:\\Program Files\\Exodus\\Exodus.exe',
	],
};

export function exodusCandidates() {
	return CANDIDATES[process.platform] ?? [];
}

/**
 * Returns the absolute path of the Exodus executable, or undefined when it
 * cannot be found. An explicit path (CLI flag or env var) always wins.
 */
export function resolveExodusBinary(explicit) {
	const preferred = explicit ?? process.env.MULTIEXO_EXODUS;

	if (preferred) {
		let candidate = path.resolve(expandHome(preferred));

		// Be forgiving when someone points at the .app bundle on macOS.
		if (candidate.endsWith('.app')) {
			candidate = path.join(candidate, 'Contents/MacOS/Exodus');
		}

		return fs.existsSync(candidate) ? candidate : undefined;
	}

	return exodusCandidates().find(candidate => fs.existsSync(candidate));
}

/** Explains where Exodus was looked for, for error messages. */
export function missingBinaryMessage(explicit) {
	const preferred = explicit ?? process.env.MULTIEXO_EXODUS;

	if (preferred) {
		return `No Exodus executable at ${preferred}`;
	}

	return [
		'Exodus executable not found. Looked in:',
		...exodusCandidates().map(candidate => `  ${candidate}`),
		'Pass --exodus <path> to point multiexo at it.',
	].join('\n');
}

function quote(value) {
	return /[\s"']/.test(value) ? JSON.stringify(value) : value;
}

export function formatCommand(binary, datadir) {
	return `${quote(binary)} --datadir ${quote(datadir)}`;
}

/**
 * Starts Exodus against the given data folder and detaches it, so the wallet
 * keeps running after multiexo exits.
 */
export function launchWallet(binary, datadir) {
	const child = spawn(binary, ['--datadir', datadir], {
		detached: true,
		stdio: 'ignore',
	});

	return new Promise((resolve, reject) => {
		child.once('error', reject);
		child.once('spawn', () => {
			child.unref();
			resolve(child.pid);
		});
	});
}
