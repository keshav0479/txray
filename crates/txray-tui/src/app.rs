//! App state and tab management for the txray TUI.

use crate::data::{AnalysisData, TxAnalysis};
use std::sync::mpsc::{self, Receiver, TryRecvError};
use std::thread;
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

/// Interactive lesson content model for Learn mode.
pub struct LearnLesson {
    pub title: &'static str,
    pub subtitle: &'static str,
    pub block_height: Option<u64>,
    pub steps: &'static [&'static str],
    pub quiz_question: &'static str,
    pub quiz_options: [&'static str; 3],
    pub quiz_answer: usize,
    pub quiz_explanation: &'static str,
}

const LEARN_LESSONS: [LearnLesson; 7] = [
    LearnLesson {
        title: "What's Inside a Block?",
        subtitle: "Parse the genesis block",
        block_height: Some(0),
        steps: &[
            "A block has an 80-byte header plus transactions payload.",
            "Key header fields: version, prev hash, merkle root, timestamp, bits, nonce.",
            "Genesis block is special: prev hash is all zeros and has exactly one coinbase tx.",
        ],
        quiz_question: "Which field links a block to the previous block?",
        quiz_options: ["Merkle root", "Previous block hash", "Nonce"],
        quiz_answer: 1,
        quiz_explanation: "Previous block hash creates the chain link between blocks.",
    },
    LearnLesson {
        title: "Anatomy of a Transaction",
        subtitle: "Decode Satoshi to Hal Finney",
        block_height: Some(170),
        steps: &[
            "Transactions consume inputs and create outputs.",
            "Input references a previous outpoint (txid:vout).",
            "Output defines value plus locking script (scriptPubKey).",
        ],
        quiz_question: "What identifies a spent output uniquely?",
        quiz_options: ["Address only", "txid + vout", "Script type"],
        quiz_answer: 1,
        quiz_explanation: "Bitcoin spends are keyed by txid and output index (vout).",
    },
    LearnLesson {
        title: "Script Types Explained",
        subtitle: "P2PKH to P2TR evolution",
        block_height: Some(709635),
        steps: &[
            "Common script types: p2pkh, p2sh, p2wpkh, p2wsh, p2tr.",
            "Witness programs reduce weight and separate signatures from base data.",
            "Taproot (p2tr) enables key-path spends and better privacy/efficiency.",
        ],
        quiz_question: "Which script type corresponds to Taproot outputs?",
        quiz_options: ["p2wpkh", "p2sh", "p2tr"],
        quiz_answer: 2,
        quiz_explanation: "Taproot outputs are p2tr (OP_1 + 32-byte key).",
    },
    LearnLesson {
        title: "SegWit & Weight",
        subtitle: "Witness discount and savings",
        block_height: Some(481824),
        steps: &[
            "Block weight combines base bytes (x4) and witness bytes (x1).",
            "vbytes = ceil(weight / 4), fee rates are usually sat/vB.",
            "SegWit made malleability fixes possible and enabled Lightning growth.",
        ],
        quiz_question: "How is vbytes derived from weight?",
        quiz_options: ["weight / 2", "weight / 4", "base size only"],
        quiz_answer: 1,
        quiz_explanation: "Virtual bytes are computed from weight divided by 4.",
    },
    LearnLesson {
        title: "Privacy Heuristics 101",
        subtitle: "Analyze a real CoinJoin",
        block_height: Some(530484),
        steps: &[
            "Heuristics are signals, not proofs. Combine multiple indicators.",
            "Equal-value outputs and many inputs can indicate CoinJoin behavior.",
            "Entropy and deterministic links help estimate privacy quality.",
        ],
        quiz_question: "What usually increases transaction privacy score?",
        quiz_options: [
            "Higher deterministic links",
            "Higher entropy",
            "Single output only",
        ],
        quiz_answer: 1,
        quiz_explanation: "Higher entropy means more plausible input-output mappings.",
    },
    LearnLesson {
        title: "Build Your First PSBT",
        subtitle: "Step-by-step PSBT creation",
        block_height: Some(57043),
        steps: &[
            "PSBT separates construction/signing/finalization into clean stages.",
            "Collect UTXOs and outputs first, then compute target fee and change.",
            "Inspector checks missing signatures and spending readiness.",
        ],
        quiz_question: "What is PSBT best used for?",
        quiz_options: [
            "Mempool querying",
            "Collaborative transaction signing",
            "Block hashing",
        ],
        quiz_answer: 1,
        quiz_explanation: "PSBT is designed for safe, portable multi-stage signing workflows.",
    },
    LearnLesson {
        title: "Wallet Fingerprinting",
        subtitle: "Identify wallet software",
        block_height: Some(709635),
        steps: &[
            "Fingerprinting combines ordering, locktime, change and script behavior.",
            "Signals like BIP69 ordering or anti-fee-sniping can suggest wallet family.",
            "Confidence is probabilistic, not guaranteed identification.",
        ],
        quiz_question: "What does fingerprint confidence represent?",
        quiz_options: [
            "Certainty of identity",
            "Probability based on observed heuristics",
            "Fee certainty",
        ],
        quiz_answer: 1,
        quiz_explanation:
            "Wallet confidence estimates likelihood from observed transaction patterns.",
    },
];

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
    pub ui_tick: u64,
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
    pub learn_active: bool,
    pub learn_step: usize,
    pub learn_quiz_choice: Option<usize>,
    pub learn_quiz_feedback: Option<String>,
    pub learn_completed: [bool; 7],
    pub learn_block_data: Option<FamousBlockData>,
    pub learn_fetch_in_progress: bool,
    learn_fetch_rx: Option<Receiver<Result<FamousBlockData, String>>>,
    tab_transition_from: Tab,
    tab_transition_ticks: u8,

    // script debugger state
    pub debugger: Option<DebuggerState>,
}

impl App {
    pub fn new() -> Self {
        Self {
            active_tab: Tab::Dashboard,
            ui_tick: 0,
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
            learn_active: false,
            learn_step: 0,
            learn_quiz_choice: None,
            learn_quiz_feedback: None,
            learn_completed: [false; 7],
            learn_block_data: None,
            learn_fetch_in_progress: false,
            learn_fetch_rx: None,
            tab_transition_from: Tab::Dashboard,
            tab_transition_ticks: 0,
            debugger: None,
        }
    }

    pub fn tick(&mut self) {
        self.ui_tick = self.ui_tick.wrapping_add(1);
        if self.tab_transition_ticks > 0 {
            self.tab_transition_ticks -= 1;
        }
    }

    pub fn set_active_tab(&mut self, tab: Tab) {
        if tab != self.active_tab {
            self.tab_transition_from = self.active_tab;
            self.active_tab = tab;
            self.tab_transition_ticks = 4;
        }
    }

    pub fn tab_transition(&self) -> Option<(Tab, Tab, u8)> {
        if self.tab_transition_ticks > 0 {
            Some((
                self.tab_transition_from,
                self.active_tab,
                self.tab_transition_ticks,
            ))
        } else {
            None
        }
    }

    pub fn next_tab(&mut self) {
        self.set_active_tab(self.active_tab.next());
    }

    pub fn prev_tab(&mut self) {
        self.set_active_tab(self.active_tab.prev());
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

    pub fn learn_lessons() -> &'static [LearnLesson] {
        &LEARN_LESSONS
    }

    pub fn current_lesson(&self) -> &'static LearnLesson {
        &LEARN_LESSONS[self
            .learn_selected
            .min(LEARN_LESSONS.len().saturating_sub(1))]
    }

    pub fn start_selected_lesson(&mut self) {
        self.learn_active = true;
        self.learn_step = 0;
        self.learn_quiz_choice = None;
        self.learn_quiz_feedback = None;
        self.learn_fetch_in_progress = false;
        self.learn_fetch_rx = None;

        let lesson = self.current_lesson();
        self.learn_block_data = None;
        if let Some(height) = lesson.block_height {
            if cfg!(test) {
                self.status_message = format!(
                    "Started lesson: {} (test mode: fetch skipped)",
                    lesson.title
                );
            } else {
                let expected = txray_corpus::find_by_height(height).map(|b| b.hash.to_string());
                self.start_learn_block_fetch(lesson.title.to_string(), height, expected);
                self.status_message = format!(
                    "Started lesson: {} (fetching block {}...)",
                    lesson.title, height
                );
            }
        } else {
            self.status_message = format!("Started lesson: {}", lesson.title);
        }
    }

    pub fn exit_learn_lesson(&mut self) {
        self.learn_active = false;
        self.learn_step = 0;
        self.learn_quiz_choice = None;
        self.learn_quiz_feedback = None;
        self.learn_block_data = None;
        self.learn_fetch_in_progress = false;
        self.learn_fetch_rx = None;
        self.status_message = "Exited lesson view".to_string();
    }

    pub fn poll_background_tasks(&mut self) {
        if !self.learn_fetch_in_progress {
            return;
        }

        let result = match self.learn_fetch_rx.as_ref() {
            Some(rx) => match rx.try_recv() {
                Ok(result) => Some(result),
                Err(TryRecvError::Empty) => None,
                Err(TryRecvError::Disconnected) => {
                    Some(Err("lesson fetch worker disconnected".to_string()))
                }
            },
            None => Some(Err("lesson fetch channel missing".to_string())),
        };

        if let Some(result) = result {
            self.learn_fetch_in_progress = false;
            self.learn_fetch_rx = None;
            let lesson_title = self.current_lesson().title.to_string();

            match result {
                Ok(data) => {
                    let height = data.height;
                    self.learn_block_data = Some(data);
                    self.status_message = format!(
                        "Started lesson: {} (block {} fetched)",
                        lesson_title, height
                    );
                }
                Err(e) => {
                    self.status_message = format!("Started lesson: {} ({})", lesson_title, e);
                }
            }
        }
    }

    fn start_learn_block_fetch(
        &mut self,
        lesson_title: String,
        height: u64,
        expected_hash: Option<String>,
    ) {
        let (tx, rx) = mpsc::channel();
        self.learn_fetch_in_progress = true;
        self.learn_fetch_rx = Some(rx);

        thread::spawn(move || {
            let result = App::fetch_block_snapshot(&lesson_title, height, expected_hash.as_deref());
            let _ = tx.send(result);
        });
    }

    pub fn next_learn_step(&mut self) {
        let max_step = self.current_lesson().steps.len().saturating_sub(1);
        if self.learn_step < max_step {
            self.learn_step += 1;
        }
    }

    pub fn prev_learn_step(&mut self) {
        self.learn_step = self.learn_step.saturating_sub(1);
    }

    pub fn answer_learn_quiz(&mut self, choice: usize) {
        let lesson = self.current_lesson();
        self.learn_quiz_choice = Some(choice);

        if choice == lesson.quiz_answer {
            self.learn_completed[self.learn_selected] = true;
            self.learn_quiz_feedback = Some(format!("Correct. {}", lesson.quiz_explanation));
            self.status_message = format!("Lesson complete: {}", lesson.title);
        } else {
            self.learn_quiz_feedback = Some(format!("Not quite. {}", lesson.quiz_explanation));
            self.status_message = "Quiz answer submitted".to_string();
        }
    }

    pub fn learn_progress(&self) -> (usize, usize) {
        let completed = self.learn_completed.iter().filter(|done| **done).count();
        (completed, self.learn_completed.len())
    }

    fn fetch_block_snapshot(
        name: &str,
        height: u64,
        expected_hash: Option<&str>,
    ) -> Result<FamousBlockData, String> {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .map_err(|e| format!("fetch setup failed: {}", e))?;

        let raw_block = runtime
            .block_on(async {
                txray_net::fetch_raw_block(
                    &txray_net::ApiSource::MempoolSpace,
                    &txray_net::BlockId::Height(height),
                )
                .await
            })
            .map_err(|e| format!("fetch failed: {}", e))?;

        let parsed = txray_core::block::parser::parse_raw_block(&raw_block)
            .map_err(|e| format!("block parse failed: {}", e))?;

        let tx_count = txray_core::block::parser::extract_raw_transactions(&parsed.payload)
            .map_err(|e| format!("transaction extract failed: {}", e))?
            .len();

        let fetched_hash = txray_core::block::parser::reversed_hex(&parsed.header.block_hash);
        let expected_hash = expected_hash.unwrap_or(&fetched_hash).to_string();
        let hash_matches = fetched_hash == expected_hash;

        Ok(FamousBlockData {
            name: name.to_string(),
            height,
            expected_hash,
            fetched_hash,
            tx_count,
            timestamp: parsed.header.timestamp,
            size_bytes: parsed.payload.len(),
            hash_matches,
        })
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

        match App::fetch_block_snapshot(block.name, block.height, Some(block.hash)) {
            Ok(data) => {
                let tx_count = data.tx_count;
                self.famous_block_data = Some(data);
                self.status_message = format!(
                    "Fetched {} (height {}, {} txs)",
                    block.name, block.height, tx_count
                );
            }
            Err(e) => {
                self.status_message = e;
            }
        }
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
        assert!(!app.learn_active);
        assert_eq!(app.learn_step, 0);
        assert!(app.learn_quiz_choice.is_none());
        assert!(app.learn_quiz_feedback.is_none());
        assert!(app.learn_block_data.is_none());
        assert_eq!(app.learn_progress(), (0, 7));
        assert_eq!(app.input_mode, InputMode::Normal);
    }

    #[test]
    fn learn_quiz_completion_tracking() {
        let mut app = App::new();
        app.learn_selected = 0;
        app.start_selected_lesson();
        let answer = app.current_lesson().quiz_answer;
        app.answer_learn_quiz(answer);

        assert!(app.learn_completed[0]);
        assert!(app.learn_quiz_feedback.is_some());
        assert_eq!(app.learn_progress().0, 1);
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
