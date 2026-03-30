//! App state and tab management for the txray TUI.

use crate::data::{AnalysisData, TxAnalysis};

/// Active tab in the TUI.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tab {
    Dashboard,
    TxDetail,
    Heuristics,
    FamousBlocks,
    ScriptDebugger,
    Learn,
}

impl Tab {
    pub const ALL: [Tab; 6] = [
        Tab::Dashboard,
        Tab::TxDetail,
        Tab::Heuristics,
        Tab::FamousBlocks,
        Tab::ScriptDebugger,
        Tab::Learn,
    ];

    pub fn label(&self) -> &'static str {
        match self {
            Tab::Dashboard => "Dashboard",
            Tab::TxDetail => "Tx Detail",
            Tab::Heuristics => "Heuristics",
            Tab::FamousBlocks => "Famous Blocks",
            Tab::ScriptDebugger => "Script Debugger",
            Tab::Learn => "Learn",
        }
    }

    pub fn icon(&self) -> &'static str {
        match self {
            Tab::Dashboard => "◈",
            Tab::TxDetail => "⟐",
            Tab::Heuristics => "⊙",
            Tab::FamousBlocks => "★",
            Tab::ScriptDebugger => "▶",
            Tab::Learn => "◆",
        }
    }

    /// Next tab (wraps around).
    pub fn next(&self) -> Tab {
        let all = Tab::ALL;
        let idx = all.iter().position(|t| t == self).unwrap_or(0);
        all[(idx + 1) % all.len()]
    }

    /// Previous tab (wraps around).
    pub fn prev(&self) -> Tab {
        let all = Tab::ALL;
        let idx = all.iter().position(|t| t == self).unwrap_or(0);
        if idx == 0 {
            all[all.len() - 1]
        } else {
            all[idx - 1]
        }
    }
}

/// Input mode for text entry (e.g., fixture path).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InputMode {
    Normal,
    /// Typing a fixture path to load.
    FixturePath(String),
}

/// Top-level application state.
pub struct App {
    pub active_tab: Tab,
    pub should_quit: bool,
    pub show_help: bool,
    pub status_message: String,
    pub input_mode: InputMode,

    // loaded analysis data
    pub analysis: Option<AnalysisData>,

    // dashboard scroll
    pub tx_list_offset: usize,
    pub tx_list_selected: usize,

    // famous blocks state
    pub famous_selected: usize,

    // learn mode state
    pub learn_selected: usize,
}

impl App {
    pub fn new() -> Self {
        Self {
            active_tab: Tab::Dashboard,
            should_quit: false,
            show_help: false,
            status_message: "Press ? for help, Tab to switch views, q to quit".to_string(),
            input_mode: InputMode::Normal,
            analysis: None,
            tx_list_offset: 0,
            tx_list_selected: 0,
            famous_selected: 0,
            learn_selected: 0,
        }
    }

    pub fn next_tab(&mut self) {
        self.active_tab = self.active_tab.next();
    }

    pub fn prev_tab(&mut self) {
        self.active_tab = self.active_tab.prev();
    }

    pub fn toggle_help(&mut self) {
        self.show_help = !self.show_help;
    }

    /// Load a transaction fixture file and analyze it.
    pub fn load_fixture(&mut self, path: &str) {
        match txray_lens::analyze_transaction(path) {
            Ok(json_str) => match crate::data::parse_tx_json(&json_str) {
                Ok(tx) => {
                    self.status_message = format!("Loaded: {} ({})", tx.txid, path);
                    self.analysis = Some(AnalysisData::SingleTx(tx));
                }
                Err(e) => {
                    self.status_message = format!("Parse error: {}", e);
                }
            },
            Err(e) => {
                self.status_message = format!("Analysis error: {}", e);
            }
        }
    }

    /// Get the loaded tx analysis, if any.
    pub fn tx_analysis(&self) -> Option<&TxAnalysis> {
        match &self.analysis {
            Some(AnalysisData::SingleTx(tx)) => Some(tx),
            None => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tab_cycle_forward() {
        let tab = Tab::Dashboard;
        assert_eq!(tab.next(), Tab::TxDetail);
        assert_eq!(Tab::Learn.next(), Tab::Dashboard); // wraps
    }

    #[test]
    fn tab_cycle_backward() {
        let tab = Tab::Dashboard;
        assert_eq!(tab.prev(), Tab::Learn); // wraps
        assert_eq!(Tab::TxDetail.prev(), Tab::Dashboard);
    }

    #[test]
    fn all_tabs_have_labels() {
        for tab in Tab::ALL {
            assert!(!tab.label().is_empty());
            assert!(!tab.icon().is_empty());
        }
    }

    #[test]
    fn app_initial_state() {
        let app = App::new();
        assert_eq!(app.active_tab, Tab::Dashboard);
        assert!(!app.should_quit);
        assert!(!app.show_help);
        assert!(app.analysis.is_none());
        assert_eq!(app.input_mode, InputMode::Normal);
    }

    #[test]
    fn app_tab_navigation() {
        let mut app = App::new();
        app.next_tab();
        assert_eq!(app.active_tab, Tab::TxDetail);
        app.prev_tab();
        assert_eq!(app.active_tab, Tab::Dashboard);
    }

    #[test]
    fn load_missing_fixture() {
        let mut app = App::new();
        app.load_fixture("/nonexistent/path.json");
        assert!(app.analysis.is_none());
        assert!(app.status_message.contains("error"));
    }
}
