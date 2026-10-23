# multiexo

User-friendly CLI application designed to manage multiple Exodus Wallet.

`multiexo` lists the Exodus data folders you keep in your home directory and
lets you pick the one to start, so every wallet stays in its own folder instead
of sharing the default profile.

```
multiexo · wallets in /Users/you

11 wallets found, most recently used first:

❯ exodus-savings · 2 hours ago
  exodus-daily · 3 days ago
  exodus-testing (empty) · just now
  + Create a new wallet
  Quit

↑↓ to move · enter to start · q to quit
```

## Install

```sh
npm install
npm link        # optional, puts `multiexo` on your PATH
```

There is no build step: `source/cli.js` is what runs. Without `npm link`, start
it with `npm start` or `node source/cli.js`.

Requires Node 22 or newer (tested on 26).

## Usage

```sh
multiexo                      # pick a wallet interactively
multiexo exodus-savings       # start that wallet straight away
multiexo --dir ~/wallets      # look for wallets somewhere else
```

Selecting a wallet runs Exodus against that folder and leaves it running after
multiexo exits:

```sh
/Applications/Exodus.app/Contents/MacOS/Exodus --datadir /Users/you/exodus-savings
```

### Creating a wallet

Choose **+ Create a new wallet**, type a name, and multiexo shows the absolute
path it is about to create and asks for confirmation before writing anything.
The folder is created inside the same directory it lists (your home directory,
or whatever `--dir` points at). Exodus sets the wallet up — new seed or restore
from a recovery phrase — the first time it starts.

### Options

| Option | Description |
| --- | --- |
| `--dir`, `-d` | Directory holding the Exodus data folders. Default: `$HOME` |
| `--exodus`, `-e` | Path to the Exodus executable, if it is not in the usual place |
| `--version` | Print the version |
| `--help` | Print the help |

`--exodus` also accepts an `.app` bundle on macOS, and the `MULTIEXO_EXODUS`
environment variable does the same job.

## How wallets are detected

Only directories that look like Exodus data folders are listed: those holding
an `exodus.wallet` folder or an `exodus.conf.json` file, plus folders multiexo
created itself (marked with a `.multiexo.json` file, so a wallet appears in the
list even before Exodus has run in it — those show up as `(empty)`). Everything
else in the directory is ignored. The list is ordered by last use.

## Development

Edit a file and run it — nothing to compile:

```sh
node source/cli.js --dir /tmp/some-test-dir
```

The CLI is built with [Ink](https://github.com/vadimdemedes/ink):
`source/app.js` holds the interface, `source/wallets.js` the folder discovery,
and `source/exodus.js` locates and starts Exodus.

The interface is written with `createElement` rather than JSX, because JSX is
the one thing Node cannot run on its own — keeping it out means the published
package is the source, with no build step and no transpiler dependencies.
