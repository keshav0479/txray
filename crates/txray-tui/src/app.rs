//! App state and tab management for the txray TUI.

use crate::data::{AnalysisData, TxAnalysis};
use txray_core::tx::script_exec::{ScriptStep, StepStatus};

/// Fetched metadata for a famous block selected in the TUI.
pub struct FamousBlockData {
    pub name: String,
    pub height: u64,
    pub expected_hash: String,
    pub fetched_hash: String,
    pub tx_count: usize,
    pub timestamp: u32,
    pub size_bytes: usize,
    pub hash_matches: bool,
}

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

/// Script debugger state.
pub struct DebuggerState {
    /// All execution steps from script_exec
    pub steps: Vec<ScriptStep>,
    /// Current step cursor (0-indexed, pointing at the step being viewed)
    pub cursor: usize,
    /// Auto-run mode (advance one step per tick)
    pub auto_run: bool,
    /// Which input index we're debugging
    pub input_index: usize,
    /// Script type description
    pub script_label: String,
}

impl DebuggerState {
    pub fn current_step(&self) -> Option<&ScriptStep> {
        self.steps.get(self.cursor)
    }

    pub fn is_finished(&self) -> bool {
        self.cursor >= self.steps.len().saturating_sub(1)
    }

    pub fn step_forward(&mut self) {
        if self.cursor < self.steps.len().saturating_sub(1) {
            self.cursor += 1;
        }
    }

    pub fn step_backward(&mut self) {
        self.cursor = self.cursor.saturating_sub(1);
    }

    pub fn result_status(&self) -> Option<&StepStatus> {
        self.steps.last().map(|s| &s.status)
    }
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
    pub famous_block_data: Option<FamousBlockData>,

    // learn mode state
    pub learn_selected: usize,

    // script debugger state
    pub debugger: Option<DebuggerState>,
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
            famous_block_data: None,
            learn_selected: 0,
            debugger: None,
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

    /// Load a transaction fixture file, run lens + sherlock analysis + script debugger.
    pub fn load_fixture(&mut self, path: &str) {
        match txray_lens::analyze_transaction(path) {
            Ok(json_str) => match crate::data::parse_tx_json(&json_str) {
                Ok(mut tx) => {
                    // run sherlock analysis on the same fixture
                    tx.sherlock = crate::data::run_sherlock_analysis(path);

                    // build script debugger for the first input
                    self.debugger = self.build_debugger(path, 0);

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

    /// Build a debugger state for a specific input of the loaded fixture.
    fn build_debugger(&self, path: &str, input_index: usize) -> Option<DebuggerState> {
        let debug_inputs = crate::data::extract_debug_inputs(path);
        let di = debug_inputs.into_iter().nth(input_index)?;

        let steps = txray_core::tx::script_exec::execute_script(
            &di.script_pubkey,
            &di.script_sig,
            &di.witness,
        );

        if steps.is_empty() {
            return None;
        }

        Some(DebuggerState {
            steps,
            cursor: 0,
            auto_run: false,
            input_index: di.input_index,
            script_label: di.script_type,
        })
    }

    /// Switch the debugger to a different input.
    pub fn debug_input(&mut self, fixture_path: &str, input_index: usize) {
        self.debugger = self.build_debugger(fixture_path, input_index);
        if self.debugger.is_some() {
            self.status_message = format!("Debugging vin[{}]", input_index);
        } else {
            self.status_message = format!("Cannot debug vin[{}]", input_index);
        }
    }

    /// Export current analysis to JSON. Returns the path written, or an error message.
    pub fn export_json(&self) -> Result<String, String> {
        let tx = self.tx_analysis().ok_or("No transaction loaded")?;

        let mut export = serde_json::Map::new();
        export.insert("txid".into(), serde_json::Value::String(tx.txid.clone()));
        export.insert(
            "network".into(),
            serde_json::Value::String(tx.network.clone()),
        );
        export.insert("segwit".into(), serde_json::Value::Bool(tx.segwit));
        export.insert("fee_sats".into(), serde_json::json!(tx.fee_sats));
        export.insert(
            "fee_rate_sat_vb".into(),
            serde_json::json!(tx.fee_rate_sat_vb),
        );
        export.insert("weight".into(), serde_json::json!(tx.weight));
        export.insert("vbytes".into(), serde_json::json!(tx.vbytes));

        if let Some(ref fp) = tx.sherlock.fingerprint {
            export.insert(
                "fingerprint".into(),
                serde_json::to_value(fp).unwrap_or_default(),
            );
        }
        if let Some(ref ent) = tx.sherlock.entropy {
            export.insert(
                "entropy".into(),
                serde_json::to_value(ent).unwrap_or_default(),
            );
        }
        if let Some(ref adv) = tx.sherlock.advice {
            export.insert(
                "advice".into(),
                serde_json::to_value(adv).unwrap_or_default(),
            );
        }

        let json = serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?;
        let filename = format!("txray-export-{}.json", &tx.txid[..8.min(tx.txid.len())]);
        std::fs::write(&filename, &json).map_err(|e| e.to_string())?;
        Ok(filename)
    }

    /// Get the loaded tx analysis, if any.
    pub fn tx_analysis(&self) -> Option<&TxAnalysis> {
        match &self.analysis {
            Some(AnalysisData::SingleTx(tx)) => Some(tx),
            None => None,
        }
    }

    /// Fetch metadata for the currently selected famous block from mempool.space.
    pub fn fetch_selected_famous_block(&mut self) {
        let block = match txray_corpus::FAMOUS_BLOCKS.get(self.famous_selected) {
            Some(b) => b,
            None => {
                self.status_message = "Invalid famous block selection".to_string();
                return;
            }
        };

        self.status_message = format!("Fetching block {} from mempool.space...", block.height);

        let runtime = match tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
        {
            Ok(rt) => rt,
            Err(e) => {
                self.status_message = format!("Fetch setup failed: {}", e);
                return;
            }
        };

        let raw_block_result = runtime.block_on(async {
            txray_net::fetch_raw_block(
                &txray_net::ApiSource::MempoolSpace,
                &txray_net::BlockId::Height(block.height),
            )
            .await
        });

        let raw_block = match raw_block_result {
            Ok(bytes) => bytes,
            Err(e) => {
                self.status_message = format!("Fetch failed: {}", e);
                return;
            }
        };

        let parsed = match txray_core::block::parser::parse_raw_block(&raw_block) {
            Ok(p) => p,
            Err(e) => {
                self.status_message = format!("Block parse failed: {}", e);
                return;
            }
        };

        let tx_count = match txray_core::block::parser::extract_raw_transactions(&parsed.payload) {
            Ok(txs) => txs.len(),
            Err(e) => {
                self.status_message = format!("Transaction extract failed: {}", e);
                return;
            }
        };

        let fetched_hash = txray_core::block::parser::reversed_hex(&parsed.header.block_hash);
        let hash_matches = fetched_hash == block.hash;

        self.famous_block_data = Some(FamousBlockData {
            name: block.name.to_string(),
            height: block.height,
            expected_hash: block.hash.to_string(),
            fetched_hash,
            tx_count,
            timestamp: parsed.header.timestamp,
            size_bytes: parsed.payload.len(),
            hash_matches,
        });

        self.status_message = format!(
            "Fetched {} (height {}, {} txs)",
            block.name, block.height, tx_count
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write_temp_fixture() -> std::path::PathBuf {
        let raw_tx = "02000000000101a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a10000000000fdffffff0110270000000000001600141313131313131313131313131313131313131313024730440220deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef0220deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef012103aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa00000000";
        let fixture_json = serde_json::json!({
            "network": "mainnet",
            "raw_tx": raw_tx,
            "prevouts": [{
                "txid": "a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1",
                "vout": 0,
                "value_sats": 20000,
                "script_pubkey_hex": "00141515151515151515151515151515151515151515"
            }]
        });

        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let path = std::env::temp_dir().join(format!("txray_tui_app_test_{unique}.json"));
        std::fs::write(&path, fixture_json.to_string()).unwrap();
        path
    }

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
        assert!(app.famous_block_data.is_none());
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

    #[test]
    fn export_json_no_tx_loaded() {
        let app = App::new();
        let result = app.export_json();
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "No transaction loaded");
    }

    #[test]
    fn load_real_fixture_has_sherlock() {
        let fixture = write_temp_fixture();
        let mut app = App::new();
        app.load_fixture(fixture.to_str().unwrap());
        let tx = app.tx_analysis().expect("should have loaded tx");
        assert!(tx.sherlock.fingerprint.is_some());
        assert!(tx.sherlock.advice.is_some());
        std::fs::remove_file(fixture).ok();
    }

    #[test]
    fn debugger_state_step_forward_backward() {
        let step = |n: usize, op: &str| ScriptStep {
            step_number: n,
            opcode: op.to_string(),
            main_stack: vec![],
            alt_stack: vec![],
            status: StepStatus::Ok,
        };
        let mut dbg = DebuggerState {
            steps: vec![step(1, "OP_DUP"), step(2, "OP_HASH160"), step(3, "VERIFY")],
            cursor: 0,
            auto_run: false,
            input_index: 0,
            script_label: "p2wpkh".to_string(),
        };

        assert_eq!(dbg.cursor, 0);
        dbg.step_forward();
        assert_eq!(dbg.cursor, 1);
        dbg.step_forward();
        assert_eq!(dbg.cursor, 2);
        dbg.step_forward(); // should clamp at end
        assert_eq!(dbg.cursor, 2);
        assert!(dbg.is_finished());

        dbg.step_backward();
        assert_eq!(dbg.cursor, 1);
        dbg.step_backward();
        assert_eq!(dbg.cursor, 0);
        dbg.step_backward(); // should clamp at 0
        assert_eq!(dbg.cursor, 0);
    }

    #[test]
    fn load_real_fixture_has_debugger() {
        let fixture = write_temp_fixture();
        let mut app = App::new();
        app.load_fixture(fixture.to_str().unwrap());
        let dbg = app.debugger.as_ref().expect("should have debugger");
        assert!(!dbg.steps.is_empty());
        assert_eq!(dbg.cursor, 0);
        assert_eq!(dbg.input_index, 0);
        std::fs::remove_file(fixture).ok();
    }

    #[test]
    fn debugger_no_fixture_is_none() {
        let app = App::new();
        assert!(app.debugger.is_none());
    }
}
