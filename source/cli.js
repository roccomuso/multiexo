#!/usr/bin/env node
import process from 'node:process';
import {createElement as h} from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';
import {
	formatCommand,
	launchWallet,
	missingBinaryMessage,
	resolveExodusBinary,
} from './exodus.js';
import {findWallet, resolveBaseDir} from './wallets.js';

const cli = meow(
	`
	Usage
	  $ multiexo [wallet-name]

	Options
	  --dir, -d     Directory holding the Exodus data folders (default: $HOME)
	  --exodus, -e  Path to the Exodus executable
	  --version     Print the version
	  --help        Print this help

	Examples
	  $ multiexo
	  $ multiexo exodus-savings
	  $ multiexo --dir ~/wallets
`,
	{
		importMeta: import.meta,
		flags: {
			dir: {type: 'string', shortFlag: 'd'},
			exodus: {type: 'string', shortFlag: 'e'},
		},
	},
);

function fail(message) {
	console.error(message);
	process.exit(1);
}

const baseDir = resolveBaseDir(cli.flags.dir);
const binary = resolveExodusBinary(cli.flags.exodus);
const requested = cli.input[0];

if (requested) {
	let wallet;
	try {
		wallet = findWallet(baseDir, requested);
	} catch (error) {
		fail(error.message);
	}

	if (!wallet) {
		fail(`No wallet named "${requested}" in ${baseDir}`);
	}

	if (!binary) {
		fail(missingBinaryMessage(cli.flags.exodus));
	}

	try {
		await launchWallet(binary, wallet.path);
	} catch (error) {
		fail(`Could not start Exodus: ${error.message}`);
	}

	console.log(`Started ${wallet.name}`);
	console.log(formatCommand(binary, wallet.path));
} else {
	try {
		render(
			h(App, {
				baseDir,
				binary,
				binaryError: binary
					? undefined
					: missingBinaryMessage(cli.flags.exodus),
			}),
		);
	} catch (error) {
		fail(error.message);
	}
}
