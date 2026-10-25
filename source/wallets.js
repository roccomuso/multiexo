import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// A data folder is considered an Exodus wallet when it contains one of these.
// `exodus.wallet` and `exodus.conf.json` are created by Exodus itself, while
// `.multiexo.json` marks a folder we created but that Exodus never opened yet.
const WALLET_DATA_DIR = 'exodus.wallet';
const WALLET_CONFIG_FILE = 'exodus.conf.json';
const MULTIEXO_MARKER = '.multiexo.json';

export function expandHome(target) {
	if (target === '~') {
		return os.homedir();
	}

	if (target.startsWith('~/')) {
		return path.join(os.homedir(), target.slice(2));
	}

	return target;
}

export function resolveBaseDir(dir) {
	return path.resolve(expandHome(dir || os.homedir()));
}

function readMarker(walletPath) {
	try {
		return JSON.parse(fs.readFileSync(path.join(walletPath, MULTIEXO_MARKER), 'utf8'));
	} catch {
		return undefined;
	}
}

function describeWallet(baseDir, name) {
	const walletPath = path.join(baseDir, name);
	const marker = readMarker(walletPath);
	const dataPath = path.join(walletPath, WALLET_DATA_DIR);
	const hasWalletData = fs.existsSync(dataPath);
	const hasExodusData =
		hasWalletData || fs.existsSync(path.join(walletPath, WALLET_CONFIG_FILE));

	if (!hasExodusData && !marker) {
		return undefined;
	}

	let modifiedAt;
	try {
		// `exodus.wallet` changes on every sync, so it tracks real usage better
		// than the folder itself — but it only exists once Exodus has run here.
		modifiedAt = fs.statSync(hasWalletData ? dataPath : walletPath).mtime;
	} catch {
		modifiedAt = undefined;
	}

	return {
		name,
		path: walletPath,
		initialized: hasExodusData,
		createdByMultiexo: Boolean(marker),
		modifiedAt,
	};
}

export function listWallets(baseDir) {
	let entries;
	try {
		entries = fs.readdirSync(baseDir, {withFileTypes: true});
	} catch (error) {
		throw new Error(`Cannot read ${baseDir}: ${error.message}`);
	}

	return entries
		.filter(entry => entry.isDirectory() || entry.isSymbolicLink())
		.map(entry => describeWallet(baseDir, entry.name))
		.filter(Boolean)
		.sort((a, b) => {
			const left = a.modifiedAt?.getTime() ?? 0;
			const right = b.modifiedAt?.getTime() ?? 0;
			return right - left || a.name.localeCompare(b.name);
		});
}

export function findWallet(baseDir, name) {
	const wallet = describeWallet(baseDir, name);
	if (wallet) {
		return wallet;
	}

	// Allow `multiexo savings` to match a folder named `exodus-savings`.
	return listWallets(baseDir).find(
		candidate =>
			candidate.name.toLowerCase() === name.toLowerCase() ||
			candidate.name.toLowerCase().endsWith(`-${name.toLowerCase()}`),
	);
}

export function validateWalletName(rawName, baseDir) {
	const name = rawName.trim();

	if (!name) {
		return 'Enter a name for the new wallet.';
	}

	if (name !== path.basename(name) || name === '.' || name === '..') {
		return 'The name cannot contain a path separator.';
	}

	if (/[\\:*?"<>|]/.test(name)) {
		return 'The name cannot contain any of \\ : * ? " < > |';
	}

	if (name.startsWith('.')) {
		return 'The name cannot start with a dot.';
	}

	if (fs.existsSync(path.join(baseDir, name))) {
		return `${name} already exists in ${baseDir}`;
	}

	return undefined;
}

export function walletPathFor(baseDir, name) {
	return path.join(baseDir, name.trim());
}

export function createWallet(baseDir, name) {
	const walletPath = walletPathFor(baseDir, name);

	fs.mkdirSync(walletPath, {recursive: false});
	fs.writeFileSync(
		path.join(walletPath, MULTIEXO_MARKER),
		`${JSON.stringify(
			{
				name: path.basename(walletPath),
				createdAt: new Date().toISOString(),
				createdBy: 'multiexo',
			},
			undefined,
			'\t',
		)}\n`,
	);

	return describeWallet(baseDir, path.basename(walletPath));
}
