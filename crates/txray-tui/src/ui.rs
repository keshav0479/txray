//! UI rendering for the txray TUI.

use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Clear, Padding, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::{App, Tab};
use crate::theme;

/// Render the full UI.
pub fn draw(frame: &mut Frame, app: &App) {
    let area = frame.area();

    // fill background
    frame.render_widget(Block::default().style(Style::default().bg(theme::BG)), area);

    // main layout: header (3) + body (flex) + footer (1)
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // tab bar
            Constraint::Min(1),    // body
            Constraint::Length(1), // status bar
        ])
        .split(area);

    draw_tab_bar(frame, app, chunks[0]);
    draw_body(frame, app, chunks[1]);
    draw_status_bar(frame, app, chunks[2]);

    if app.show_help {
        draw_help_overlay(frame, area);
    }
}

/// Render the tab bar at the top.
fn draw_tab_bar(frame: &mut Frame, app: &App, area: Rect) {
    let titles: Vec<Span> = Tab::ALL
        .iter()
        .map(|tab| {
            let style = if *tab == app.active_tab {
                theme::tab_active()
            } else {
                theme::tab_inactive()
            };
            Span::styled(format!(" {} {} ", tab.icon(), tab.label()), style)
        })
        .collect();

    let mut spans = Vec::new();
    for (i, title) in titles.into_iter().enumerate() {
        if i > 0 {
            spans.push(Span::styled(" ", Style::default().bg(theme::SURFACE)));
        }
        spans.push(title);
    }

    let header_block = Block::default()
        .title(Span::styled(
            " txray ",
            Style::default()
                .fg(theme::ORANGE)
                .add_modifier(Modifier::BOLD),
        ))
        .borders(Borders::BOTTOM)
        .border_style(theme::border_default())
        .style(Style::default().bg(theme::SURFACE));

    let tabs_line = Paragraph::new(Line::from(spans)).block(header_block);
    frame.render_widget(tabs_line, area);
}

/// Render the active tab body.
fn draw_body(frame: &mut Frame, app: &App, area: Rect) {
    match app.active_tab {
        Tab::Dashboard => draw_dashboard(frame, app, area),
        Tab::TxDetail => draw_placeholder(frame, "Transaction Detail", "Load a block and select a transaction to inspect.\n\nFeatures coming in Commit 4.3:\n  - Input/output flow with addresses\n  - Fee/weight breakdown\n  - Heuristic flags\n  - Wallet fingerprint", area),
        Tab::Heuristics => draw_placeholder(frame, "Chain Analysis Heuristics", "Run heuristics on a loaded block.\n\nFeatures coming in Commit 4.3:\n  - CIOH, change detection, CoinJoin\n  - Privacy score per transaction\n  - Color-coded badges", area),
        Tab::FamousBlocks => draw_famous_blocks(frame, app, area),
        Tab::ScriptDebugger => draw_placeholder(frame, "Script Debugger", "Step through Bitcoin scripts opcode by opcode.\n\nFeatures coming in Commit 4.4:\n  - Stack visualization\n  - Step forward/backward\n  - P2PKH, P2WPKH flows", area),
        Tab::Learn => draw_learn(frame, app, area),
    }
}

/// Dashboard view with placeholder panels.
fn draw_dashboard(frame: &mut Frame, app: &App, area: Rect) {
    // split into 2 rows
    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(area);

    // top row: block info + fee distribution
    let top = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(rows[0]);

    // bottom row: script types + heuristic flags
    let bottom = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(rows[1]);

    // block info panel
    let block_text = if let Some(info) = &app.block_info {
        format!(
            "Height: {}\nHash:   {}\nTxs:    {}\nFees:   {} sats\nWeight: {} WU",
            info.height
                .map(|h| h.to_string())
                .unwrap_or_else(|| "?".to_string()),
            if info.hash.len() > 20 {
                format!("{}...", &info.hash[..20])
            } else {
                info.hash.clone()
            },
            info.tx_count,
            info.total_fees_sats,
            info.total_weight,
        )
    } else {
        "No block loaded.\n\nPress 'f' to fetch a block by height.".to_string()
    };

    let block_panel = Paragraph::new(block_text)
        .style(Style::default().fg(theme::TEXT))
        .block(
            Block::default()
                .title(Span::styled(" Block Info ", theme::header()))
                .borders(Borders::ALL)
                .border_style(theme::border_active())
                .padding(Padding::horizontal(1)),
        );
    frame.render_widget(block_panel, top[0]);

    // fee distribution placeholder
    let fee_panel = Paragraph::new("Fee rate distribution chart\nwill appear here in Commit 4.2")
        .style(theme::placeholder_text())
        .block(
            Block::default()
                .title(Span::styled(" Fee Rates ", theme::header()))
                .borders(Borders::ALL)
                .border_style(theme::border_default())
                .padding(Padding::horizontal(1)),
        );
    frame.render_widget(fee_panel, top[1]);

    // script type breakdown
    let script_panel = Paragraph::new("Script type breakdown\nwill appear here in Commit 4.2")
        .style(theme::placeholder_text())
        .block(
            Block::default()
                .title(Span::styled(" Script Types ", theme::header()))
                .borders(Borders::ALL)
                .border_style(theme::border_default())
                .padding(Padding::horizontal(1)),
        );
    frame.render_widget(script_panel, bottom[0]);

    // heuristic flags
    let heur_panel = Paragraph::new("Heuristic summary\nwill appear here in Commit 4.2")
        .style(theme::placeholder_text())
        .block(
            Block::default()
                .title(Span::styled(" Heuristic Flags ", theme::header()))
                .borders(Borders::ALL)
                .border_style(theme::border_default())
                .padding(Padding::horizontal(1)),
        );
    frame.render_widget(heur_panel, bottom[1]);
}

/// Famous blocks browser with list from txray-corpus.
fn draw_famous_blocks(frame: &mut Frame, app: &App, area: Rect) {
    let blocks = txray_corpus::FAMOUS_BLOCKS;
    let mut lines: Vec<Line> = Vec::new();

    for (i, block) in blocks.iter().enumerate() {
        let marker = if i == app.famous_selected {
            "▸ "
        } else {
            "  "
        };
        let style = if i == app.famous_selected {
            Style::default()
                .fg(theme::CYAN)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(theme::TEXT)
        };

        lines.push(Line::from(vec![
            Span::styled(marker, style),
            Span::styled(format!("{:<20}", block.name), style),
            Span::styled(
                format!("  height {}", block.height),
                Style::default().fg(theme::TEXT_DIM),
            ),
        ]));

        // show description for selected block
        if i == app.famous_selected {
            lines.push(Line::from(Span::styled(
                format!("    {}", block.description),
                Style::default().fg(theme::PURPLE_TEXT),
            )));
            lines.push(Line::from(Span::styled(
                format!("    Look for: {}", block.what_to_look_for.join(", ")),
                Style::default().fg(theme::TEXT_MUTED),
            )));
            lines.push(Line::default());
        }
    }

    let panel = Paragraph::new(lines)
        .block(
            Block::default()
                .title(Span::styled(" Famous Blocks ", theme::header()))
                .borders(Borders::ALL)
                .border_style(theme::border_active())
                .padding(Padding::horizontal(1)),
        )
        .wrap(Wrap { trim: false });
    frame.render_widget(panel, area);
}

/// Learn mode with lesson list.
fn draw_learn(frame: &mut Frame, app: &App, area: Rect) {
    let lessons = [
        ("1", "What's Inside a Block?", "Parse the genesis block"),
        (
            "2",
            "Anatomy of a Transaction",
            "Decode Satoshi to Hal Finney",
        ),
        ("3", "Script Types Explained", "P2PKH to P2TR evolution"),
        ("4", "SegWit & Weight", "Witness discount and savings"),
        ("5", "Privacy Heuristics 101", "Analyze a real CoinJoin"),
        ("6", "Build Your First PSBT", "Step-by-step PSBT creation"),
        (
            "7",
            "Wallet Fingerprinting",
            "Identify wallet software from tx patterns",
        ),
    ];

    let mut lines: Vec<Line> = Vec::new();
    lines.push(Line::from(Span::styled(
        "Interactive Bitcoin Lessons",
        Style::default()
            .fg(theme::ORANGE_TEXT)
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::default());

    for (i, (num, title, desc)) in lessons.iter().enumerate() {
        let marker = if i == app.learn_selected {
            "▸ "
        } else {
            "  "
        };
        let style = if i == app.learn_selected {
            Style::default()
                .fg(theme::CYAN)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(theme::TEXT)
        };

        lines.push(Line::from(vec![
            Span::styled(marker, style),
            Span::styled(
                format!("Lesson {} — ", num),
                Style::default().fg(theme::GREEN_TEXT),
            ),
            Span::styled(*title, style),
        ]));

        if i == app.learn_selected {
            lines.push(Line::from(Span::styled(
                format!("    {}", desc),
                Style::default().fg(theme::TEXT_DIM),
            )));
            lines.push(Line::from(Span::styled(
                "    Press Enter to start (coming in Commit 4.6)",
                Style::default().fg(theme::TEXT_MUTED),
            )));
            lines.push(Line::default());
        }
    }

    let panel = Paragraph::new(lines)
        .block(
            Block::default()
                .title(Span::styled(" Learn ", theme::header()))
                .borders(Borders::ALL)
                .border_style(theme::border_active())
                .padding(Padding::horizontal(1)),
        )
        .wrap(Wrap { trim: false });
    frame.render_widget(panel, area);
}

/// Generic placeholder for tabs not yet implemented.
fn draw_placeholder(frame: &mut Frame, title: &str, message: &str, area: Rect) {
    let panel = Paragraph::new(message)
        .style(theme::placeholder_text())
        .block(
            Block::default()
                .title(Span::styled(format!(" {} ", title), theme::header()))
                .borders(Borders::ALL)
                .border_style(theme::border_default())
                .padding(Padding::horizontal(1)),
        )
        .wrap(Wrap { trim: false });
    frame.render_widget(panel, area);
}

/// Render the status bar at the bottom.
fn draw_status_bar(frame: &mut Frame, app: &App, area: Rect) {
    let hints = vec![
        Span::styled(" q", theme::key_hint()),
        Span::styled(":quit ", theme::key_desc()),
        Span::styled("Tab", theme::key_hint()),
        Span::styled(":switch ", theme::key_desc()),
        Span::styled("j/k", theme::key_hint()),
        Span::styled(":navigate ", theme::key_desc()),
        Span::styled("?", theme::key_hint()),
        Span::styled(":help ", theme::key_desc()),
        Span::styled("1-6", theme::key_hint()),
        Span::styled(":jump ", theme::key_desc()),
        Span::raw("  "),
        Span::styled(&app.status_message, Style::default().fg(theme::TEXT_MUTED)),
    ];

    let bar = Paragraph::new(Line::from(hints)).style(theme::status_bar());
    frame.render_widget(bar, area);
}

/// Render a centered help overlay.
fn draw_help_overlay(frame: &mut Frame, area: Rect) {
    // center a box
    let width = 50.min(area.width.saturating_sub(4));
    let height = 18.min(area.height.saturating_sub(4));
    let x = (area.width.saturating_sub(width)) / 2;
    let y = (area.height.saturating_sub(height)) / 2;
    let popup = Rect::new(x, y, width, height);

    frame.render_widget(Clear, popup);

    let help_lines = vec![
        Line::from(Span::styled(
            "txray — Keyboard Shortcuts",
            Style::default()
                .fg(theme::ORANGE)
                .add_modifier(Modifier::BOLD),
        )),
        Line::default(),
        help_line("q / Esc", "Quit"),
        help_line("Tab / Shift+Tab", "Next / prev tab"),
        help_line("1-6", "Jump to tab"),
        help_line("j / k / ↑ / ↓", "Navigate list"),
        help_line("Enter", "Select / expand"),
        help_line("f", "Fetch block by height"),
        help_line("e", "Export to JSON"),
        help_line("?", "Toggle this help"),
        Line::default(),
        Line::from(Span::styled(
            "Press any key to close",
            Style::default().fg(theme::TEXT_MUTED),
        )),
    ];

    let help = Paragraph::new(help_lines)
        .block(
            Block::default()
                .title(Span::styled(" Help ", theme::title()))
                .borders(Borders::ALL)
                .border_style(Style::default().fg(theme::CYAN))
                .style(Style::default().bg(theme::SURFACE))
                .padding(Padding::horizontal(2)),
        )
        .wrap(Wrap { trim: false });

    frame.render_widget(help, popup);
}

fn help_line<'a>(key: &'a str, action: &'a str) -> Line<'a> {
    Line::from(vec![
        Span::styled(
            format!("{:<22}", key),
            Style::default()
                .fg(theme::CYAN)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(action, Style::default().fg(theme::TEXT)),
    ])
}
