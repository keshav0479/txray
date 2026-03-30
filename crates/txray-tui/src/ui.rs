//! UI rendering for the txray TUI.

use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Modifier, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Bar, BarChart, BarGroup, Block, Borders, Clear, Padding, Paragraph, Wrap};
use ratatui::Frame;

use crate::app::{App, InputMode, Tab};
use crate::theme;

/// Render the full UI.
pub fn draw(frame: &mut Frame, app: &App) {
    let area = frame.area();

    // fill background
    frame.render_widget(Block::default().style(Style::default().bg(theme::BG)), area);

    // main layout: header (3) + body (flex) + footer (1) + optional input (3)
    let has_input = matches!(app.input_mode, InputMode::FixturePath(_));
    let constraints = if has_input {
        vec![
            Constraint::Length(3),
            Constraint::Min(1),
            Constraint::Length(3),
            Constraint::Length(1),
        ]
    } else {
        vec![
            Constraint::Length(3),
            Constraint::Min(1),
            Constraint::Length(1),
        ]
    };

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints(constraints)
        .split(area);

    draw_tab_bar(frame, app, chunks[0]);
    draw_body(frame, app, chunks[1]);

    if has_input {
        draw_input_bar(frame, app, chunks[2]);
        draw_status_bar(frame, app, chunks[3]);
    } else {
        draw_status_bar(frame, app, chunks[2]);
    }

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
        Tab::TxDetail => draw_tx_detail(frame, app, area),
        Tab::Heuristics => draw_heuristics(frame, app, area),
        Tab::FamousBlocks => draw_famous_blocks(frame, app, area),
        Tab::ScriptDebugger => draw_placeholder(
            frame,
            "Script Debugger",
            "Step through Bitcoin scripts opcode by opcode.\n\n\
             Features coming in Commit 4.4:\n\
             - Stack visualization\n\
             - Step forward/backward\n\
             - P2PKH, P2WPKH flows",
            area,
        ),
        Tab::Learn => draw_learn(frame, app, area),
    }
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

fn draw_dashboard(frame: &mut Frame, app: &App, area: Rect) {
    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Percentage(45), Constraint::Percentage(55)])
        .split(area);

    let top = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(40), Constraint::Percentage(60)])
        .split(rows[0]);

    let bottom = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(35), Constraint::Percentage(65)])
        .split(rows[1]);

    draw_tx_info_panel(frame, app, top[0]);
    draw_script_type_panel(frame, app, top[1]);
    draw_warnings_panel(frame, app, bottom[0]);
    draw_io_list_panel(frame, app, bottom[1]);
}

/// Transaction info panel (top-left).
fn draw_tx_info_panel(frame: &mut Frame, app: &App, area: Rect) {
    let text = if let Some(tx) = app.tx_analysis() {
        let txid_short = if tx.txid.len() > 16 {
            format!("{}...", &tx.txid[..16])
        } else {
            tx.txid.clone()
        };
        vec![
            Line::from(vec![
                Span::styled("TxID:  ", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(txid_short, Style::default().fg(theme::CYAN)),
            ]),
            Line::from(vec![
                Span::styled("Net:   ", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(&tx.network, Style::default().fg(theme::TEXT)),
            ]),
            Line::from(vec![
                Span::styled("SegWit:", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(
                    if tx.segwit { " yes" } else { " no" },
                    Style::default().fg(if tx.segwit {
                        theme::GREEN_TEXT
                    } else {
                        theme::TEXT
                    }),
                ),
            ]),
            Line::default(),
            Line::from(vec![
                Span::styled("Fee:   ", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(
                    format!("{} sats", tx.fee_sats),
                    Style::default().fg(theme::ORANGE_TEXT),
                ),
            ]),
            Line::from(vec![
                Span::styled("Rate:  ", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(
                    format!("{:.1} sat/vB", tx.fee_rate_sat_vb),
                    Style::default().fg(theme::ORANGE_TEXT),
                ),
            ]),
            Line::from(vec![
                Span::styled("Weight:", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(
                    format!(" {} WU ({} vB)", tx.weight, tx.vbytes),
                    Style::default().fg(theme::TEXT),
                ),
            ]),
            Line::from(vec![
                Span::styled("RBF:   ", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(
                    if tx.rbf_signaling { " yes" } else { " no" },
                    Style::default().fg(if tx.rbf_signaling {
                        theme::WARNING
                    } else {
                        theme::TEXT
                    }),
                ),
            ]),
        ]
    } else {
        vec![
            Line::from(Span::styled(
                "No transaction loaded.",
                Style::default().fg(theme::TEXT_MUTED),
            )),
            Line::default(),
            Line::from(Span::styled(
                "Press 'f' to load a fixture file.",
                Style::default().fg(theme::TEXT_DIM),
            )),
            Line::from(Span::styled(
                "Or: txray-tui <fixture.json>",
                Style::default().fg(theme::TEXT_DIM),
            )),
        ]
    };

    let panel = Paragraph::new(text).block(
        Block::default()
            .title(Span::styled(" Transaction ", theme::header()))
            .borders(Borders::ALL)
            .border_style(if app.tx_analysis().is_some() {
                theme::border_active()
            } else {
                theme::border_default()
            })
            .padding(Padding::horizontal(1)),
    );
    frame.render_widget(panel, area);
}

/// Script type breakdown panel (top-right).
fn draw_script_type_panel(frame: &mut Frame, app: &App, area: Rect) {
    if let Some(tx) = app.tx_analysis() {
        // sort by count descending
        let mut types: Vec<(&String, &u64)> = tx.script_type_counts.iter().collect();
        types.sort_by(|a, b| b.1.cmp(a.1));

        let total: u64 = types.iter().map(|(_, c)| **c).sum();

        let bars: Vec<Bar> = types
            .iter()
            .map(|(name, count)| {
                let color = script_type_color(name);
                Bar::default()
                    .label(Line::from(name.as_str()))
                    .value(**count)
                    .style(Style::default().fg(color))
                    .text_value(format!(
                        "{} ({:.0}%)",
                        count,
                        **count as f64 / total as f64 * 100.0
                    ))
            })
            .collect();

        let group = BarGroup::default().bars(&bars);

        let chart = BarChart::default()
            .block(
                Block::default()
                    .title(Span::styled(" Script Types ", theme::header()))
                    .borders(Borders::ALL)
                    .border_style(theme::border_active())
                    .padding(Padding::horizontal(1)),
            )
            .data(group)
            .bar_width(((area.width.saturating_sub(4)) / (types.len() as u16).max(1)).clamp(3, 12))
            .bar_gap(1)
            .bar_style(Style::default().fg(theme::CYAN))
            .value_style(Style::default().fg(theme::TEXT_DIM));

        frame.render_widget(chart, area);
    } else {
        draw_placeholder(
            frame,
            "Script Types",
            "Load a fixture to see script type breakdown.",
            area,
        );
    }
}

/// Warnings panel (bottom-left).
fn draw_warnings_panel(frame: &mut Frame, app: &App, area: Rect) {
    if let Some(tx) = app.tx_analysis() {
        let mut lines: Vec<Line> = Vec::new();

        if tx.warnings.is_empty() {
            lines.push(Line::from(Span::styled(
                "No warnings.",
                Style::default().fg(theme::GREEN_TEXT),
            )));
        } else {
            for w in &tx.warnings {
                let icon = match w.code.as_str() {
                    "HIGH_FEE" => "!",
                    "DUST_OUTPUT" => "!",
                    "RBF_SIGNALING" => "~",
                    _ => "?",
                };
                let color = match w.code.as_str() {
                    "HIGH_FEE" | "DUST_OUTPUT" => theme::ERROR,
                    "RBF_SIGNALING" => theme::WARNING,
                    _ => theme::TEXT_DIM,
                };
                lines.push(Line::from(vec![
                    Span::styled(
                        format!(" {} ", icon),
                        Style::default().fg(color).add_modifier(Modifier::BOLD),
                    ),
                    Span::styled(&w.message, Style::default().fg(theme::TEXT)),
                ]));
            }
        }

        // add summary stats
        lines.push(Line::default());
        lines.push(Line::from(vec![
            Span::styled("Inputs:  ", Style::default().fg(theme::TEXT_DIM)),
            Span::styled(
                format!("{}", tx.input_count),
                Style::default().fg(theme::CYAN),
            ),
        ]));
        lines.push(Line::from(vec![
            Span::styled("Outputs: ", Style::default().fg(theme::TEXT_DIM)),
            Span::styled(
                format!("{}", tx.output_count),
                Style::default().fg(theme::CYAN),
            ),
        ]));
        lines.push(Line::from(vec![
            Span::styled("In:  ", Style::default().fg(theme::TEXT_DIM)),
            Span::styled(
                format!("{} sats", tx.total_input_sats),
                Style::default().fg(theme::GREEN_TEXT),
            ),
        ]));
        lines.push(Line::from(vec![
            Span::styled("Out: ", Style::default().fg(theme::TEXT_DIM)),
            Span::styled(
                format!("{} sats", tx.total_output_sats),
                Style::default().fg(theme::ORANGE_TEXT),
            ),
        ]));

        let panel = Paragraph::new(lines)
            .block(
                Block::default()
                    .title(Span::styled(" Warnings & Stats ", theme::header()))
                    .borders(Borders::ALL)
                    .border_style(theme::border_active())
                    .padding(Padding::horizontal(1)),
            )
            .wrap(Wrap { trim: false });
        frame.render_widget(panel, area);
    } else {
        draw_placeholder(frame, "Warnings", "Load a fixture to see warnings.", area);
    }
}

/// Input/output list panel (bottom-right).
fn draw_io_list_panel(frame: &mut Frame, app: &App, area: Rect) {
    if let Some(tx) = app.tx_analysis() {
        let mut lines: Vec<Line> = Vec::new();

        // inputs
        lines.push(Line::from(Span::styled(
            "INPUTS",
            Style::default()
                .fg(theme::CYAN)
                .add_modifier(Modifier::BOLD),
        )));

        for (i, inp) in tx.inputs.iter().enumerate() {
            let selected = i == app.tx_list_selected;
            let marker = if selected { ">" } else { " " };
            let addr_short = if inp.address.len() > 20 {
                format!("{}...", &inp.address[..20])
            } else if inp.address.is_empty() {
                "n/a".to_string()
            } else {
                inp.address.clone()
            };

            let style = if selected {
                Style::default()
                    .fg(theme::CYAN)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme::TEXT)
            };

            lines.push(Line::from(vec![
                Span::styled(format!("{} vin[{}] ", marker, i), style),
                Span::styled(
                    format!("{:<8}", inp.script_type),
                    Style::default().fg(script_type_color(&inp.script_type)),
                ),
                Span::styled(
                    format!(" {} ", addr_short),
                    Style::default().fg(theme::TEXT_DIM),
                ),
                Span::styled(
                    format!("{} sats", inp.value_sats),
                    Style::default().fg(theme::GREEN_TEXT),
                ),
            ]));
        }

        lines.push(Line::default());
        lines.push(Line::from(Span::styled(
            "OUTPUTS",
            Style::default()
                .fg(theme::ORANGE)
                .add_modifier(Modifier::BOLD),
        )));

        for (i, out) in tx.outputs.iter().enumerate() {
            let list_idx = tx.input_count + i;
            let selected = list_idx == app.tx_list_selected;
            let marker = if selected { ">" } else { " " };
            let addr_short = if out.address.len() > 20 {
                format!("{}...", &out.address[..20])
            } else if out.address.is_empty() {
                "n/a".to_string()
            } else {
                out.address.clone()
            };

            let style = if selected {
                Style::default()
                    .fg(theme::CYAN)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme::TEXT)
            };

            lines.push(Line::from(vec![
                Span::styled(format!("{} vout[{}]", marker, i), style),
                Span::styled(
                    format!(" {:<8}", out.script_type),
                    Style::default().fg(script_type_color(&out.script_type)),
                ),
                Span::styled(
                    format!(" {} ", addr_short),
                    Style::default().fg(theme::TEXT_DIM),
                ),
                Span::styled(
                    format!("{} sats", out.value_sats),
                    Style::default().fg(theme::ORANGE_TEXT),
                ),
            ]));
        }

        let panel = Paragraph::new(lines)
            .block(
                Block::default()
                    .title(Span::styled(" Inputs / Outputs ", theme::header()))
                    .borders(Borders::ALL)
                    .border_style(theme::border_active())
                    .padding(Padding::horizontal(1)),
            )
            .wrap(Wrap { trim: false });
        frame.render_widget(panel, area);
    } else {
        draw_placeholder(
            frame,
            "Inputs / Outputs",
            "Load a fixture to see input/output flow.",
            area,
        );
    }
}

// ─── Tx Detail view ─────────────────────────────────────────────────────────

fn draw_tx_detail(frame: &mut Frame, app: &App, area: Rect) {
    if let Some(tx) = app.tx_analysis() {
        let mut lines = vec![
            Line::from(vec![
                Span::styled("TxID: ", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(&tx.txid, Style::default().fg(theme::CYAN)),
            ]),
            Line::from(vec![
                Span::styled("Version: ", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(format!("{}", tx.version), Style::default().fg(theme::TEXT)),
                Span::styled("  Locktime: ", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(format!("{}", tx.locktime), Style::default().fg(theme::TEXT)),
            ]),
            Line::from(vec![
                Span::styled("Size: ", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(
                    format!("{} bytes", tx.size_bytes),
                    Style::default().fg(theme::TEXT),
                ),
                Span::styled("  Weight: ", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(
                    format!("{} WU", tx.weight),
                    Style::default().fg(theme::TEXT),
                ),
                Span::styled("  vBytes: ", Style::default().fg(theme::TEXT_DIM)),
                Span::styled(format!("{}", tx.vbytes), Style::default().fg(theme::TEXT)),
            ]),
            Line::default(),
        ];

        // full input/output details
        for (i, inp) in tx.inputs.iter().enumerate() {
            lines.push(Line::from(vec![
                Span::styled(
                    format!("vin[{}]  ", i),
                    Style::default()
                        .fg(theme::CYAN)
                        .add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    &inp.script_type,
                    Style::default().fg(script_type_color(&inp.script_type)),
                ),
                Span::styled(
                    format!("  {}:{}", &inp.txid[..8.min(inp.txid.len())], inp.vout),
                    Style::default().fg(theme::TEXT_DIM),
                ),
            ]));
            lines.push(Line::from(vec![
                Span::styled("        ", Style::default()),
                Span::styled(&inp.address, Style::default().fg(theme::TEXT)),
                Span::styled(
                    format!("  {} sats", inp.value_sats),
                    Style::default().fg(theme::GREEN_TEXT),
                ),
            ]));
        }

        lines.push(Line::default());

        for (i, out) in tx.outputs.iter().enumerate() {
            lines.push(Line::from(vec![
                Span::styled(
                    format!("vout[{}] ", i),
                    Style::default()
                        .fg(theme::ORANGE)
                        .add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    &out.script_type,
                    Style::default().fg(script_type_color(&out.script_type)),
                ),
            ]));
            lines.push(Line::from(vec![
                Span::styled("        ", Style::default()),
                Span::styled(&out.address, Style::default().fg(theme::TEXT)),
                Span::styled(
                    format!("  {} sats", out.value_sats),
                    Style::default().fg(theme::ORANGE_TEXT),
                ),
            ]));
        }

        let panel = Paragraph::new(lines)
            .block(
                Block::default()
                    .title(Span::styled(" Transaction Detail ", theme::header()))
                    .borders(Borders::ALL)
                    .border_style(theme::border_active())
                    .padding(Padding::horizontal(1)),
            )
            .wrap(Wrap { trim: false });
        frame.render_widget(panel, area);
    } else {
        draw_placeholder(
            frame,
            "Transaction Detail",
            "Load a fixture to see full transaction details.\n\nPress 'f' to load a fixture file.",
            area,
        );
    }
}

// ─── Heuristics view ────────────────────────────────────────────────────────

fn draw_heuristics(frame: &mut Frame, app: &App, area: Rect) {
    if let Some(tx) = app.tx_analysis() {
        // split into left (heuristics + fingerprint) and right (entropy + privacy)
        let cols = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
            .split(area);

        draw_heuristics_left(frame, tx, cols[0]);
        draw_heuristics_right(frame, tx, cols[1]);
    } else {
        draw_placeholder(
            frame,
            "Heuristics",
            "Load a fixture to see heuristic analysis.\n\nPress 'f' to load a fixture file.",
            area,
        );
    }
}

/// Left column: basic heuristics + wallet fingerprint.
fn draw_heuristics_left(frame: &mut Frame, tx: &crate::data::TxAnalysis, area: Rect) {
    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Percentage(45), Constraint::Percentage(55)])
        .split(area);

    // top-left: basic heuristics
    {
        let mut lines = vec![
            Line::from(Span::styled(
                "Transaction Heuristics",
                Style::default()
                    .fg(theme::PURPLE_TEXT)
                    .add_modifier(Modifier::BOLD),
            )),
            Line::default(),
        ];

        let all_same_type = tx
            .input_script_types
            .iter()
            .all(|t| t == tx.input_script_types.first().unwrap_or(&String::new()))
            && tx
                .output_script_types
                .iter()
                .all(|t| t == tx.output_script_types.first().unwrap_or(&String::new()));

        lines.push(heuristic_line(
            "Script uniformity",
            if all_same_type { "Uniform" } else { "Mixed" },
            if all_same_type {
                theme::GREEN_TEXT
            } else {
                theme::WARNING
            },
        ));
        lines.push(heuristic_line(
            "RBF signaling",
            if tx.rbf_signaling { "Yes" } else { "No" },
            if tx.rbf_signaling {
                theme::WARNING
            } else {
                theme::TEXT
            },
        ));
        lines.push(heuristic_line(
            "SegWit",
            if tx.segwit { "Yes" } else { "Legacy" },
            if tx.segwit {
                theme::GREEN_TEXT
            } else {
                theme::TEXT_DIM
            },
        ));

        let fee_label = if tx.fee_rate_sat_vb > 100.0 {
            "Very high"
        } else if tx.fee_rate_sat_vb > 30.0 {
            "High"
        } else if tx.fee_rate_sat_vb > 10.0 {
            "Normal"
        } else {
            "Low"
        };
        let fee_color = if tx.fee_rate_sat_vb > 100.0 {
            theme::ERROR
        } else if tx.fee_rate_sat_vb > 30.0 {
            theme::WARNING
        } else {
            theme::GREEN_TEXT
        };
        let fee_text = format!("{:.1} sat/vB ({})", tx.fee_rate_sat_vb, fee_label);
        lines.push(heuristic_line("Fee rate", &fee_text, fee_color));

        if !tx.warnings.is_empty() {
            lines.push(Line::default());
            for w in &tx.warnings {
                lines.push(Line::from(vec![
                    Span::styled("  ! ", Style::default().fg(theme::ERROR)),
                    Span::styled(
                        format!("{}: {}", w.code, w.message),
                        Style::default().fg(theme::TEXT),
                    ),
                ]));
            }
        }

        let panel = Paragraph::new(lines)
            .block(
                Block::default()
                    .title(Span::styled(" Heuristics ", theme::header()))
                    .borders(Borders::ALL)
                    .border_style(theme::border_active())
                    .padding(Padding::horizontal(1)),
            )
            .wrap(Wrap { trim: false });
        frame.render_widget(panel, rows[0]);
    }

    // bottom-left: wallet fingerprint
    {
        let mut lines = Vec::new();

        if let Some(ref fp) = tx.sherlock.fingerprint {
            lines.push(heuristic_line(
                "BIP69 ordering",
                if fp.bip69_compliant { "Yes" } else { "No" },
                if fp.bip69_compliant {
                    theme::CYAN
                } else {
                    theme::TEXT_DIM
                },
            ));
            lines.push(heuristic_line(
                "Low-R signatures",
                match fp.low_r_signatures {
                    Some(true) => "Yes (grinding)",
                    Some(false) => "No",
                    None => "N/A",
                },
                match fp.low_r_signatures {
                    Some(true) => theme::CYAN,
                    _ => theme::TEXT_DIM,
                },
            ));
            lines.push(heuristic_line(
                "Anti-fee-sniping",
                if fp.anti_fee_sniping { "Yes" } else { "No" },
                if fp.anti_fee_sniping {
                    theme::GREEN_TEXT
                } else {
                    theme::TEXT_DIM
                },
            ));
            lines.push(heuristic_line(
                "RBF signal",
                if fp.rbf_signaling { "Yes" } else { "No" },
                if fp.rbf_signaling {
                    theme::WARNING
                } else {
                    theme::TEXT
                },
            ));
            let change_text = format!("{:?}", fp.change_position);
            lines.push(heuristic_line("Change position", &change_text, theme::TEXT));
            lines.push(heuristic_line(
                "Input type uniform",
                if fp.input_type_consistency {
                    "Yes"
                } else {
                    "No"
                },
                if fp.input_type_consistency {
                    theme::GREEN_TEXT
                } else {
                    theme::WARNING
                },
            ));
            lines.push(Line::default());
            if let Some(ref wallet) = fp.likely_wallet {
                lines.push(Line::from(vec![
                    Span::styled(
                        "  Wallet:  ",
                        Style::default()
                            .fg(theme::CYAN)
                            .add_modifier(Modifier::BOLD),
                    ),
                    Span::styled(wallet, Style::default().fg(theme::ORANGE_TEXT)),
                    Span::styled(
                        format!("  ({:?})", fp.confidence),
                        Style::default().fg(theme::TEXT_DIM),
                    ),
                ]));
            } else {
                lines.push(heuristic_line("Wallet", "Unknown", theme::TEXT_MUTED));
            }
        } else {
            lines.push(Line::from(Span::styled(
                "No fingerprint data.",
                Style::default().fg(theme::TEXT_MUTED),
            )));
        }

        let panel = Paragraph::new(lines)
            .block(
                Block::default()
                    .title(Span::styled(" Wallet Fingerprint ", theme::header()))
                    .borders(Borders::ALL)
                    .border_style(theme::border_active())
                    .padding(Padding::horizontal(1)),
            )
            .wrap(Wrap { trim: false });
        frame.render_widget(panel, rows[1]);
    }
}

/// Right column: entropy + privacy advisor.
fn draw_heuristics_right(frame: &mut Frame, tx: &crate::data::TxAnalysis, area: Rect) {
    let rows = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Percentage(45), Constraint::Percentage(55)])
        .split(area);

    // top-right: Boltzmann entropy
    {
        let mut lines = Vec::new();

        if let Some(ref ent) = tx.sherlock.entropy {
            if ent.too_complex {
                lines.push(Line::from(Span::styled(
                    "Too complex (capped)",
                    Style::default().fg(theme::WARNING),
                )));
            } else {
                let interp_text = format!("{}", ent.interpretations);
                let entropy_text = format!("{:.2} bits", ent.entropy_bits);
                let max_text = format!("{:.2} bits", ent.max_entropy);
                let density_text = format!("{:.1}%", ent.entropy_density * 100.0);

                lines.push(heuristic_line("Interpretations", &interp_text, theme::CYAN));
                lines.push(heuristic_line("Entropy", &entropy_text, theme::CYAN));
                lines.push(heuristic_line("Max entropy", &max_text, theme::TEXT_DIM));
                lines.push(heuristic_line(
                    "Density",
                    &density_text,
                    if ent.entropy_density > 0.5 {
                        theme::GREEN_TEXT
                    } else {
                        theme::WARNING
                    },
                ));

                let grade_color = match ent.privacy_grade {
                    'A' => theme::GREEN_TEXT,
                    'B' => theme::GREEN,
                    'C' => theme::WARNING,
                    'D' => theme::ORANGE_TEXT,
                    _ => theme::ERROR,
                };
                lines.push(Line::default());
                lines.push(Line::from(vec![
                    Span::styled(
                        "  Grade:  ",
                        Style::default()
                            .fg(theme::TEXT_DIM)
                            .add_modifier(Modifier::BOLD),
                    ),
                    Span::styled(
                        format!("{}", ent.privacy_grade),
                        Style::default()
                            .fg(grade_color)
                            .add_modifier(Modifier::BOLD),
                    ),
                ]));

                if !ent.deterministic_links.is_empty() {
                    lines.push(Line::default());
                    lines.push(Line::from(Span::styled(
                        format!("  {} deterministic links", ent.deterministic_links.len()),
                        Style::default().fg(theme::WARNING),
                    )));
                }
            }
        } else {
            lines.push(Line::from(Span::styled(
                "No entropy data.",
                Style::default().fg(theme::TEXT_MUTED),
            )));
        }

        let panel = Paragraph::new(lines)
            .block(
                Block::default()
                    .title(Span::styled(" Boltzmann Entropy ", theme::header()))
                    .borders(Borders::ALL)
                    .border_style(theme::border_active())
                    .padding(Padding::horizontal(1)),
            )
            .wrap(Wrap { trim: false });
        frame.render_widget(panel, rows[0]);
    }

    // bottom-right: privacy advisor
    {
        let mut lines = Vec::new();

        if let Some(ref adv) = tx.sherlock.advice {
            // score bar
            let bar_filled = adv.score as usize;
            let bar_empty = 10_usize.saturating_sub(bar_filled);
            let score_color = if adv.score >= 7 {
                theme::GREEN_TEXT
            } else if adv.score >= 4 {
                theme::WARNING
            } else {
                theme::ERROR
            };

            lines.push(Line::from(vec![
                Span::styled(
                    "  Score:  ",
                    Style::default()
                        .fg(theme::TEXT_DIM)
                        .add_modifier(Modifier::BOLD),
                ),
                Span::styled("#".repeat(bar_filled), Style::default().fg(score_color)),
                Span::styled(
                    ".".repeat(bar_empty),
                    Style::default().fg(theme::TEXT_MUTED),
                ),
                Span::styled(
                    format!("  {}/10 ({})", adv.score, adv.grade),
                    Style::default()
                        .fg(score_color)
                        .add_modifier(Modifier::BOLD),
                ),
            ]));

            if !adv.issues.is_empty() {
                lines.push(Line::default());
                lines.push(Line::from(Span::styled(
                    "Issues",
                    Style::default()
                        .fg(theme::ORANGE)
                        .add_modifier(Modifier::BOLD),
                )));
                for issue in &adv.issues {
                    lines.push(Line::from(vec![
                        Span::styled("  - ", Style::default().fg(theme::ERROR)),
                        Span::styled(format!("{:?}", issue), Style::default().fg(theme::TEXT)),
                    ]));
                }
            }

            if !adv.recommendations.is_empty() {
                lines.push(Line::default());
                lines.push(Line::from(Span::styled(
                    "Recommendations",
                    Style::default()
                        .fg(theme::GREEN_TEXT)
                        .add_modifier(Modifier::BOLD),
                )));
                for rec in &adv.recommendations {
                    lines.push(Line::from(vec![
                        Span::styled("  * ", Style::default().fg(theme::CYAN)),
                        Span::styled(rec.as_str(), Style::default().fg(theme::TEXT)),
                    ]));
                }
            }
        } else {
            lines.push(Line::from(Span::styled(
                "No privacy advice.",
                Style::default().fg(theme::TEXT_MUTED),
            )));
        }

        let panel = Paragraph::new(lines)
            .block(
                Block::default()
                    .title(Span::styled(" Privacy Advisor ", theme::header()))
                    .borders(Borders::ALL)
                    .border_style(theme::border_active())
                    .padding(Padding::horizontal(1)),
            )
            .wrap(Wrap { trim: false });
        frame.render_widget(panel, rows[1]);
    }
}

fn heuristic_line(label: &str, value: &str, color: ratatui::style::Color) -> Line<'static> {
    Line::from(vec![
        Span::styled(
            format!("  {:<22}", label),
            Style::default().fg(theme::TEXT_DIM),
        ),
        Span::styled(value.to_string(), Style::default().fg(color)),
    ])
}

// ─── Famous Blocks ──────────────────────────────────────────────────────────

fn draw_famous_blocks(frame: &mut Frame, app: &App, area: Rect) {
    let blocks = txray_corpus::FAMOUS_BLOCKS;
    let mut lines: Vec<Line> = Vec::new();

    for (i, block) in blocks.iter().enumerate() {
        let marker = if i == app.famous_selected { ">" } else { " " };
        let style = if i == app.famous_selected {
            Style::default()
                .fg(theme::CYAN)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(theme::TEXT)
        };

        lines.push(Line::from(vec![
            Span::styled(format!("{} ", marker), style),
            Span::styled(format!("{:<20}", block.name), style),
            Span::styled(
                format!("  height {}", block.height),
                Style::default().fg(theme::TEXT_DIM),
            ),
        ]));

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

// ─── Learn Mode ─────────────────────────────────────────────────────────────

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
        ("7", "Wallet Fingerprinting", "Identify wallet software"),
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
        let marker = if i == app.learn_selected { ">" } else { " " };
        let style = if i == app.learn_selected {
            Style::default()
                .fg(theme::CYAN)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(theme::TEXT)
        };

        lines.push(Line::from(vec![
            Span::styled(format!("{} ", marker), style),
            Span::styled(
                format!("Lesson {} - ", num),
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

// ─── Common widgets ─────────────────────────────────────────────────────────

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

fn draw_input_bar(frame: &mut Frame, app: &App, area: Rect) {
    let buf = match &app.input_mode {
        InputMode::FixturePath(b) => b.as_str(),
        _ => "",
    };

    let input = Paragraph::new(Line::from(vec![
        Span::styled(
            " Path: ",
            Style::default()
                .fg(theme::CYAN)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(buf, Style::default().fg(theme::TEXT)),
        Span::styled("_", Style::default().fg(theme::CYAN)),
    ]))
    .block(
        Block::default()
            .title(Span::styled(" Load Fixture ", theme::title()))
            .borders(Borders::ALL)
            .border_style(Style::default().fg(theme::PURPLE))
            .style(Style::default().bg(theme::SURFACE)),
    );
    frame.render_widget(input, area);
}

fn draw_status_bar(frame: &mut Frame, app: &App, area: Rect) {
    let hints = vec![
        Span::styled(" q", theme::key_hint()),
        Span::styled(":quit ", theme::key_desc()),
        Span::styled("Tab", theme::key_hint()),
        Span::styled(":switch ", theme::key_desc()),
        Span::styled("j/k", theme::key_hint()),
        Span::styled(":nav ", theme::key_desc()),
        Span::styled("f", theme::key_hint()),
        Span::styled(":load ", theme::key_desc()),
        Span::styled("e", theme::key_hint()),
        Span::styled(":export ", theme::key_desc()),
        Span::styled("?", theme::key_hint()),
        Span::styled(":help ", theme::key_desc()),
        Span::raw("  "),
        Span::styled(&app.status_message, Style::default().fg(theme::TEXT_MUTED)),
    ];

    let bar = Paragraph::new(Line::from(hints)).style(theme::status_bar());
    frame.render_widget(bar, area);
}

fn draw_help_overlay(frame: &mut Frame, area: Rect) {
    let width = 50.min(area.width.saturating_sub(4));
    let height = 18.min(area.height.saturating_sub(4));
    let x = (area.width.saturating_sub(width)) / 2;
    let y = (area.height.saturating_sub(height)) / 2;
    let popup = Rect::new(x, y, width, height);

    frame.render_widget(Clear, popup);

    let help_lines = vec![
        Line::from(Span::styled(
            "txray - Keyboard Shortcuts",
            Style::default()
                .fg(theme::ORANGE)
                .add_modifier(Modifier::BOLD),
        )),
        Line::default(),
        help_line("q / Esc", "Quit"),
        help_line("Tab / Shift+Tab", "Next / prev tab"),
        help_line("1-6", "Jump to tab"),
        help_line("j / k", "Navigate list"),
        help_line("f", "Load fixture file"),
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

/// Color for each script type.
fn script_type_color(st: &str) -> ratatui::style::Color {
    match st {
        "p2wpkh" => theme::CYAN,
        "p2tr" => theme::PURPLE,
        "p2pkh" => theme::ORANGE,
        "p2sh" => theme::GREEN,
        "p2wsh" | "p2sh-p2wsh" => theme::GREEN_TEXT,
        "op_return" => theme::TEXT_MUTED,
        _ => theme::TEXT_DIM,
    }
}
