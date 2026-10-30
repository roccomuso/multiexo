# multiexo

User-friendly CLI application designed to manage multiple Exodus Wallet.

`multiexo` lists the Exodus data folders you keep in your home directory and
lets you pick the one to start, so every wallet stays in its own folder instead
of sharing the default profile.

```
multiexo · wallets in /Users/you

11 wallets, most recently used first:

❯ exodus-savings · 2 hours ago
  exodus-daily · 3 days ago
  exodus-testing (empty) · created just now
  …

↑↓ move   ⏎ start   1-9 start by number   n new wallet   q quit
```

The list holds wallets and nothing else; the commands live in the footer:

| Key | Does |
| --- | --- |
| `↑` `↓` | Move through the wallets |
| `⏎` | Start the highlighted wallet |
| `1`…`9` | Start the wallet on that row, without moving first |
| `n` | Create a new wallet |
| `q` or `esc` | Quit |

The digits count rows on screen, so when the list is long enough to scroll they
follow what you can see rather than the wallet's position in the full list. The
footer shows the range that is actually live (`1-3` with three wallets), and
drops it when there is only one wallet.

## Install

multiexo starts Exodus but does not ship it. First install Exodus from the
official website, [exodus.com](https://www.exodus.com/download/), and only from
there: wallet software from anywhere else may be a fake built to steal your
funds.

Then install multiexo:

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

Press `n`, type a name, and multiexo shows the absolute path it is about to
create and asks for confirmation before writing anything.
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

## Your keys stay with Exodus

multiexo never reads your private keys, seed phrase or wallet contents, and it
never connects to the network. It only lists folder names and timestamps, and
starts Exodus with `--datadir` pointing at the folder you pick. Everything
inside the wallet is handled by Exodus itself. The only file multiexo writes is
the `.multiexo.json` marker in the folders it creates, which holds the folder
name and creation date.

## How wallets are detected

Only directories that look like Exodus data folders are listed: those holding
an `exodus.wallet` folder or an `exodus.conf.json` file, plus folders multiexo
created itself (marked with a `.multiexo.json` file, so a wallet appears in the
list even before Exodus has run in it — those show up as `(empty)`). Everything
else in the directory is ignored.

The list is ordered by last use, taken from the `exodus.wallet` folder's
timestamp, which Exodus rewrites on every sync.

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
