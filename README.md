<p align="center">
  <img src="assets/banner.svg" alt="txray, see the story behind every Bitcoin transaction" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/keshav0479/txray/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/keshav0479/txray/ci.yml?branch=main&style=for-the-badge&labelColor=0B0E14&color=F7931A&label=CI" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-F7931A?style=for-the-badge&labelColor=0B0E14" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/rust-1.90%2B-F7931A?style=for-the-badge&labelColor=0B0E14&logo=rust&logoColor=F7931A" alt="Rust 1.90+" />
  <img src="https://img.shields.io/badge/next.js-15-FAFAF9?style=for-the-badge&labelColor=0B0E14&logo=nextdotjs&logoColor=FAFAF9" alt="Next.js 15" />
  <a href="https://github.com/keshav0479/txray/pkgs/container/txray"><img src="https://img.shields.io/badge/ghcr-multi--arch-00E5FF?style=for-the-badge&labelColor=0B0E14&logo=docker&logoColor=00E5FF" alt="ghcr image" /></a>
</p>

<br/>

> Bitcoin block explorers tell you **what** happened. txray tells you **the story**: who paid whom, what the script actually does, how private the transaction really is, and how to build a better one yourself. It's a Rust workspace plus a Next.js front end you can run with one command.

<br/>

## Three tools, one journey

<table>
<tr>
<td width="33%" valign="top">

#### 🔵 Lens
<sub>**DECODE**</sub>

Every input, output, script, and byte. The Money Flow graph traces value across the chain.

</td>
<td width="33%" valign="top">

#### 🟡 Sherlock
<sub>**DETECT**</sub>

Privacy scored 1 to 10. Heuristics, Boltzmann entropy, wallet fingerprints, concrete advice.

</td>
<td width="33%" valign="top">

#### 🟢 Smith
<sub>**FORGE**</sub>

Raw transactions with smart coin selection, fee estimation, and a clear walkthrough.

</td>
</tr>
</table>

<p align="center">
  <img src="assets/screenshots/perspectives.png" alt="three perspectives on the same transaction" width="92%" />
</p>

<br/>

## What it looks like

<table align="center">
<tr>
<td width="33%"><img src="assets/screenshots/lens.png" alt="Lens: money flow graph" /></td>
<td width="33%"><img src="assets/screenshots/sherlock.png" alt="Sherlock: privacy score" /></td>
<td width="33%"><img src="assets/screenshots/docs.png" alt="In-app docs" /></td>
</tr>
</table>

<br/>

<p align="center">
  <img src="assets/features.svg" alt="feature matrix" width="92%" />
</p>

<br/>

## Architecture

<p align="center">
  <img src="assets/architecture.svg" alt="txray architecture" width="82%" />
</p>

<sub align="center">A modular Rust workspace fronted by a Next.js app. Every web action shells out to the same <code>txray</code> CLI, so the browser and the terminal share one source of truth.</sub>

<br/>

## Run it

<table>
<tr>
<td width="50%" valign="top">

#### Try it
<sub>One command. Docker does the rest.</sub>

```bash
docker compose up -d --build
```

Then open [localhost:3000](http://localhost:3000).

</td>
<td width="50%" valign="top">

#### Hack on it
<sub>Native build, hot reload.</sub>

```bash
cargo run -p txray-cli -- famous pizza
cd web && npm install && npm run dev
```

Web at [localhost:3000](http://localhost:3000), CLI in your shell.

</td>
</tr>
</table>

<br/>

<details>
<summary><b>CLI reference</b></summary>

<br/>

Install the unified binary:

```bash
cargo install --path crates/txray-cli
```

#### Browse Bitcoin history

```console
$ txray famous genesis
📚 The Genesis Block
   Mined by Satoshi on 2009-01-03. Contains the famous Times headline.

$ txray famous pizza
📚 The Bitcoin Pizza Transaction
   10,000 BTC for two Papa John's pizzas (block 57043).
```

#### Fetch from public APIs

```bash
txray fetch --block 170          # first non-coinbase tx
txray fetch --tx <txid>          # any transaction by id
```

Honors `TXRAY_MEMPOOL_API` and `TXRAY_ESPLORA_API` env vars. Point it at your own Esplora instance if you self-host.

#### Parse, analyze, build, explain

```bash
txray parse tx fixture.json      # decode raw tx → structured JSON
txray analyze blk.dat            # heuristics + privacy score on a block file
txray build fixture.json         # construct PSBT with coin selection
txray explain fixture.json       # plain-English walkthrough
```

#### Privacy suite

```bash
txray fingerprint fixture.json   # which wallet probably built this?
txray entropy fixture.json       # Boltzmann mixing entropy
txray advise fixture.json        # what would have made it more private?
```

#### Low level

```bash
txray debug-script 76a914<hash>88ac --script-sig <hex>
txray inspect <base64-psbt>
```

</details>

<details>
<summary><b>TUI</b></summary>

<br/>

A keyboard-driven five-tab dashboard for when you don't want a browser.

```bash
cargo run -p txray-tui
cargo run -p txray-tui -- path/to/fixture.json
```

Tabs: Dashboard · Tx Detail · Heuristics · Famous Blocks · Script Debugger.
Navigate with `Tab`, `Shift+Tab`, or jump directly with `1`–`5`.

</details>

<details>
<summary><b>Deploying to a fresh Linux VM</b></summary>

<br/>

Once a release tag is pushed, GitHub Actions builds a multi-arch image and publishes it to [GHCR](https://github.com/keshav0479/txray/pkgs/container/txray). On the VM you don't have to compile anything:

```bash
# one-time setup
git clone https://github.com/keshav0479/txray.git
cd txray
cp .env.example .env

# pull the latest image and run it
docker compose pull && docker compose up -d
```

To upgrade later: `docker compose pull && docker compose up -d`. Rollback to a specific version with `IMAGE_TAG=v0.1.2 docker compose up -d`.

</details>

<br/>

## Configuration

Copy [.env.example](.env.example) to `.env`. The relevant knobs:

| Variable | Default | What it does |
|---|---|---|
| `TXRAY_BIN` | `/usr/local/bin/txray` | Path to the CLI used by the web layer. Set automatically inside Docker. |
| `TXRAY_MEMPOOL_API` | `https://mempool.space/api` | Primary Bitcoin data source. Point at your own mempool/Esplora to self-host. |
| `TXRAY_ESPLORA_API` | `https://blockstream.info/api` | Fallback source. txray walks here if the primary fails. |
| `PORT` / `HOSTNAME` | `3000` / `0.0.0.0` | Where the Next.js server binds. |

<br/>

<p align="center">
  <em>Runs entirely on your machine. No telemetry. No keys ever touched.</em>
</p>

<br/>

<div align="center">
<sub><a href="LICENSE">MIT License</a> · <a href="crates/">Crate docs</a> · Built with Rust + Next.js</sub>
</div>
