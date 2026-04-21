# txray-tui

> Interactive TUI dashboard for the txray Bitcoin toolkit.

A keyboard-driven, five-tab terminal dashboard built on `ratatui` + `crossterm`. Same data model as the web UI; runs over SSH, in tmux, or in any plain terminal.

## What it does

- Five tabs: Dashboard · Tx Detail · Heuristics · Famous Blocks · Script Debugger
- Loads a fixture file from `argv` or browses the txray-corpus interactively
- Shells out to the same `txray-core` / `txray-lens` / `txray-sherlock` code paths the CLI and web app use, so output stays consistent across surfaces
- Mouse-free navigation: `Tab` / `Shift+Tab` / `1` to `5` jump between tabs

## Run

```bash
cargo run -p txray-tui
cargo run -p txray-tui -- path/to/fixture.json
```

## Used by

End users only. Nothing else in the workspace depends on `txray-tui` - it's a leaf binary.
