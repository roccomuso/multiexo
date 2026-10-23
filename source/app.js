import path from 'node:path';
import {
	createElement as h,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import Gradient from 'ink-gradient';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import {formatCommand, launchWallet} from './exodus.js';
import relativeTime from './relative-time.js';
import useTerminalRows from './use-terminal-rows.js';
import {
	createWallet,
	listWallets,
	validateWalletName,
	walletPathFor,
} from './wallets.js';

const CREATE_ACTION = Symbol('create');
const QUIT_ACTION = Symbol('quit');

function Header({baseDir, binary}) {
	return h(
		Box,
		{flexDirection: 'column', marginBottom: 1},
		h(
			Text,
			null,
			h(Gradient, {name: 'morning'}, 'multiexo'),
			h(Text, {dimColor: true}, ' · wallets in '),
			h(Text, {color: 'cyan'}, baseDir),
		),
		binary
			? undefined
			: h(
					Text,
					{color: 'yellow'},
					'! Exodus executable not found. Pass --exodus <path> to launch a wallet.',
				),
	);
}

function Hint({children}) {
	return h(Box, {marginTop: 1}, h(Text, {dimColor: true}, children));
}

function WalletItem({isSelected, label, value}) {
	const isWallet = value !== CREATE_ACTION && value !== QUIT_ACTION;

	return h(
		Text,
		{color: isSelected ? 'cyan' : undefined},
		label,
		isWallet
			? h(Text, {dimColor: true}, ` · ${relativeTime(value.modifiedAt)}`)
			: undefined,
	);
}

export default function App({baseDir, binary, binaryError}) {
	const {exit} = useApp();
	const rows = useTerminalRows();
	const [screen, setScreen] = useState('menu');
	const [wallets, setWallets] = useState(() => listWallets(baseDir));
	const [draftName, setDraftName] = useState('');
	const [nameError, setNameError] = useState(undefined);
	const [pending, setPending] = useState(undefined);
	const [error, setError] = useState(undefined);

	const start = useCallback(
		async wallet => {
			setPending(wallet);
			setScreen('launching');

			try {
				await launchWallet(binary, wallet.path);
				setScreen('launched');
			} catch (launchError) {
				setError(launchError.message);
				setScreen('error');
			}
		},
		[binary],
	);

	// Both of these are terminal screens: render them, then hand the terminal
	// back. Exiting from the handlers instead would unmount before React commits
	// the frame, leaving the last thing on screen as "Starting…".
	useEffect(() => {
		if (screen === 'launched' || screen === 'error') {
			exit();
		}
	}, [screen, exit]);

	// Keep the whole frame inside the window: a list taller than the terminal
	// would scroll the header and the hint out of view. The subtracted lines are
	// the header, the counter, the margins, the two actions and the hint.
	const listLimit = Math.max(3, rows - 9);

	const items = useMemo(() => {
		const walletItems = wallets.map(wallet => ({
			key: wallet.path,
			label: wallet.initialized ? wallet.name : `${wallet.name} (empty)`,
			value: wallet,
		}));

		return [
			...walletItems,
			{key: 'create', label: '+ Create a new wallet', value: CREATE_ACTION},
			{key: 'quit', label: 'Quit', value: QUIT_ACTION},
		];
	}, [wallets]);

	useInput((input, key) => {
		if (screen === 'menu' && (input === 'q' || key.escape)) {
			exit();
			return;
		}

		if ((screen === 'name' || screen === 'confirm') && key.escape) {
			setNameError(undefined);
			setScreen(screen === 'confirm' ? 'name' : 'menu');
		}
	});

	const handleMenuSelect = useCallback(
		item => {
			if (item.value === QUIT_ACTION) {
				exit();
				return;
			}

			if (item.value === CREATE_ACTION) {
				setDraftName('');
				setNameError(undefined);
				setScreen('name');
				return;
			}

			if (!binary) {
				setError(binaryError);
				setScreen('error');
				return;
			}

			void start(item.value);
		},
		[binary, binaryError, exit, start],
	);

	const handleNameSubmit = useCallback(
		value => {
			const problem = validateWalletName(value, baseDir);
			if (problem) {
				setNameError(problem);
				return;
			}

			setNameError(undefined);
			setScreen('confirm');
		},
		[baseDir],
	);

	const handleConfirm = useCallback(
		item => {
			if (item.value === 'cancel') {
				setScreen('name');
				return;
			}

			let wallet;
			try {
				wallet = createWallet(baseDir, draftName);
			} catch (createError) {
				setError(`Could not create the wallet: ${createError.message}`);
				setScreen('error');
				return;
			}

			if (item.value === 'launch' && binary) {
				void start(wallet);
				return;
			}

			setWallets(listWallets(baseDir));
			setDraftName('');
			setScreen('menu');
		},
		[baseDir, binary, draftName, start],
	);

	if (screen === 'launching' || screen === 'launched') {
		const launching = screen === 'launching';

		return h(
			Box,
			{flexDirection: 'column', marginY: 1},
			h(
				Text,
				null,
				launching
					? h(Text, {color: 'cyan'}, h(Spinner, {type: 'dots'}))
					: h(Text, {color: 'green'}, '✔'),
				launching ? ' Starting ' : ' Started ',
				h(Text, {bold: true}, pending.name),
			),
			h(
				Box,
				{marginTop: 1},
				h(Text, {dimColor: true}, formatCommand(binary, pending.path)),
			),
		);
	}

	if (screen === 'error') {
		return h(
			Box,
			{flexDirection: 'column', marginY: 1},
			h(Text, {color: 'red'}, `✖ ${error}`),
		);
	}

	if (screen === 'confirm') {
		const target = walletPathFor(baseDir, draftName);
		const choices = [
			{key: 'launch', label: 'Create and start it now', value: 'launch'},
			{key: 'create', label: 'Create it only', value: 'create'},
			{key: 'cancel', label: 'Cancel', value: 'cancel'},
		].filter(choice => choice.value !== 'launch' || binary);

		return h(
			Box,
			{flexDirection: 'column'},
			h(Header, {baseDir, binary}),
			h(
				Box,
				{
					flexDirection: 'column',
					borderStyle: 'round',
					borderColor: 'yellow',
					paddingX: 1,
				},
				h(
					Text,
					null,
					'A new wallet named ',
					h(Text, {bold: true}, path.basename(target)),
					' will be created in:',
				),
				h(Text, {color: 'cyan'}, target),
			),
			h(
				Box,
				{marginTop: 1},
				h(SelectInput, {items: choices, onSelect: handleConfirm}),
			),
			h(Hint, null, 'Exodus will set the wallet up the first time it starts.'),
		);
	}

	if (screen === 'name') {
		return h(
			Box,
			{flexDirection: 'column'},
			h(Header, {baseDir, binary}),
			h(
				Box,
				null,
				h(Text, null, 'Name of the new wallet: '),
				h(TextInput, {
					value: draftName,
					placeholder: 'exodus-savings',
					onChange(value) {
						setDraftName(value);
						setNameError(undefined);
					},
					onSubmit: handleNameSubmit,
				}),
			),
			nameError
				? h(Box, {marginTop: 1}, h(Text, {color: 'red'}, nameError))
				: undefined,
			h(Hint, null, 'enter to continue · esc to go back'),
		);
	}

	return h(
		Box,
		{flexDirection: 'column'},
		h(Header, {baseDir, binary}),
		wallets.length === 0
			? h(
					Text,
					{dimColor: true},
					'No wallet found here yet — create your first one.',
				)
			: h(
					Text,
					{dimColor: true},
					`${wallets.length} wallet${wallets.length === 1 ? '' : 's'} found, most recently used first:`,
				),
		h(
			Box,
			{marginTop: 1},
			h(SelectInput, {
				items,
				limit: listLimit,
				onSelect: handleMenuSelect,
				itemComponent: WalletItem,
			}),
		),
		h(Hint, null, '↑↓ to move · enter to start · q to quit'),
	);
}
