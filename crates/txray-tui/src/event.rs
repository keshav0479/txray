//! Terminal event handling for the TUI.

use ratatui::crossterm::event::{self, Event, KeyCode, KeyEvent, KeyModifiers};
use std::time::Duration;

use crate::app::{App, InputMode};

/// Poll for a key event with a timeout. Returns true if the app should keep running.
pub fn handle_events(app: &mut App) -> anyhow::Result<bool> {
    app.tick();

    // auto-run: advance debugger one step per tick
    if let Some(ref mut dbg) = app.debugger {
        if dbg.auto_run && !dbg.is_finished() {
            dbg.step_forward();
        } else if dbg.auto_run && dbg.is_finished() {
            dbg.auto_run = false;
        }
    }

    // poll async/background work
    app.poll_background_tasks();

    if event::poll(Duration::from_millis(100))? {
        if let Event::Key(key) = event::read()? {
            if key.kind != event::KeyEventKind::Press {
                return Ok(true);
            }
            return Ok(handle_key(app, key));
        }
    }
    Ok(true)
}

/// Process a key press. Returns false if the app should quit.
fn handle_key(app: &mut App, key: KeyEvent) -> bool {
    // Ctrl+C always quits
    if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c') {
        return false;
    }

    // input mode handles its own keys
    if let InputMode::FixturePath(ref _buf) = app.input_mode {
        return handle_input_mode(app, key);
    }

    // help overlay intercepts all keys
    if app.show_help {
        match key.code {
            KeyCode::Char('?') | KeyCode::Esc | KeyCode::Enter => app.show_help = false,
            _ => {}
        }
        return true;
    }

    // learn mode controls
    if app.active_tab == crate::app::Tab::Learn {
        match key.code {
            KeyCode::Enter => {
                if app.learn_active {
                    app.next_learn_step();
                } else {
                    app.start_selected_lesson();
                }
                return true;
            }
            KeyCode::Esc if app.learn_active => {
                app.exit_learn_lesson();
                return true;
            }
            KeyCode::Char('n') if app.learn_active => {
                app.next_learn_step();
                return true;
            }
            KeyCode::Char('p') if app.learn_active => {
                app.prev_learn_step();
                return true;
            }
            KeyCode::Char('a') | KeyCode::Char('A') | KeyCode::Char('1') if app.learn_active => {
                app.answer_learn_quiz(0);
                return true;
            }
            KeyCode::Char('b') | KeyCode::Char('B') | KeyCode::Char('2') if app.learn_active => {
                app.answer_learn_quiz(1);
                return true;
            }
            KeyCode::Char('c') | KeyCode::Char('C') | KeyCode::Char('3') if app.learn_active => {
                app.answer_learn_quiz(2);
                return true;
            }
            _ => {}
        }
    }

    match key.code {
        KeyCode::Char('q') | KeyCode::Esc => {
            app.should_quit = true;
            return false;
        }
        KeyCode::Char('?') => app.toggle_help(),
        KeyCode::Tab => app.next_tab(),
        KeyCode::BackTab => app.prev_tab(),

        // script debugger controls (only on that tab)
        KeyCode::Char('n') if app.active_tab == crate::app::Tab::ScriptDebugger => {
            if let Some(ref mut dbg) = app.debugger {
                dbg.step_forward();
            }
        }
        KeyCode::Char('p') if app.active_tab == crate::app::Tab::ScriptDebugger => {
            if let Some(ref mut dbg) = app.debugger {
                dbg.step_backward();
            }
        }
        KeyCode::Char(' ') if app.active_tab == crate::app::Tab::ScriptDebugger => {
            if let Some(ref mut dbg) = app.debugger {
                dbg.auto_run = !dbg.auto_run;
            }
        }

        // vim-style navigation
        KeyCode::Char('j') | KeyCode::Down => handle_scroll_down(app),
        KeyCode::Char('k') | KeyCode::Up => handle_scroll_up(app),

        // export to JSON
        KeyCode::Char('e') => match app.export_json() {
            Ok(path) => app.status_message = format!("Exported to {}", path),
            Err(e) => app.status_message = format!("Export failed: {}", e),
        },

        // load fixture
        KeyCode::Char('f') => {
            app.input_mode = InputMode::FixturePath(String::new());
            app.status_message = "Enter fixture path (Enter to confirm, Esc to cancel)".to_string();
        }

        // famous blocks: fetch selected block from mempool
        KeyCode::Enter if app.active_tab == crate::app::Tab::FamousBlocks => {
            app.fetch_selected_famous_block();
        }

        // number keys switch tabs
        KeyCode::Char('1') => app.set_active_tab(crate::app::Tab::Dashboard),
        KeyCode::Char('2') => app.set_active_tab(crate::app::Tab::TxDetail),
        KeyCode::Char('3') => app.set_active_tab(crate::app::Tab::Heuristics),
        KeyCode::Char('4') => app.set_active_tab(crate::app::Tab::FamousBlocks),
        KeyCode::Char('5') => app.set_active_tab(crate::app::Tab::ScriptDebugger),
        KeyCode::Char('6') => app.set_active_tab(crate::app::Tab::Learn),

        _ => {}
    }

    true
}

/// Handle keys in fixture path input mode.
fn handle_input_mode(app: &mut App, key: KeyEvent) -> bool {
    let buf = match &mut app.input_mode {
        InputMode::FixturePath(b) => b,
        _ => return true,
    };

    match key.code {
        KeyCode::Esc => {
            app.input_mode = InputMode::Normal;
            app.status_message = "Cancelled.".to_string();
        }
        KeyCode::Enter => {
            let path = buf.clone();
            app.input_mode = InputMode::Normal;
            if path.is_empty() {
                app.status_message = "No path entered.".to_string();
            } else {
                app.load_fixture(&path);
            }
        }
        KeyCode::Backspace => {
            buf.pop();
        }
        KeyCode::Char(c) => {
            buf.push(c);
        }
        _ => {}
    }

    true
}

fn handle_scroll_down(app: &mut App) {
    match app.active_tab {
        crate::app::Tab::FamousBlocks => {
            let max = txray_corpus::FAMOUS_BLOCKS.len().saturating_sub(1);
            if app.famous_selected < max {
                app.famous_selected += 1;
            }
        }
        crate::app::Tab::Learn => {
            if app.learn_active {
                app.next_learn_step();
            } else if app.learn_selected < 6 {
                app.learn_selected += 1;
            }
        }
        crate::app::Tab::Dashboard => {
            if let Some(tx) = app.tx_analysis() {
                let max_items = tx.input_count + tx.output_count;
                if app.tx_list_selected < max_items.saturating_sub(1) {
                    app.tx_list_selected += 1;
                }
            }
        }
        _ => {
            app.tx_list_offset = app.tx_list_offset.saturating_add(1);
        }
    }
}

fn handle_scroll_up(app: &mut App) {
    match app.active_tab {
        crate::app::Tab::FamousBlocks => {
            app.famous_selected = app.famous_selected.saturating_sub(1);
        }
        crate::app::Tab::Learn => {
            if app.learn_active {
                app.prev_learn_step();
            } else {
                app.learn_selected = app.learn_selected.saturating_sub(1);
            }
        }
        crate::app::Tab::Dashboard => {
            app.tx_list_selected = app.tx_list_selected.saturating_sub(1);
        }
        _ => {
            app.tx_list_offset = app.tx_list_offset.saturating_sub(1);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app::Tab;

    #[test]
    fn quit_on_q() {
        let mut app = App::new();
        let key = KeyEvent::new(KeyCode::Char('q'), KeyModifiers::NONE);
        let keep_running = handle_key(&mut app, key);
        assert!(!keep_running);
        assert!(app.should_quit);
    }

    #[test]
    fn quit_on_ctrl_c() {
        let mut app = App::new();
        let key = KeyEvent::new(KeyCode::Char('c'), KeyModifiers::CONTROL);
        let keep_running = handle_key(&mut app, key);
        assert!(!keep_running);
    }

    #[test]
    fn tab_switches_to_next() {
        let mut app = App::new();
        let key = KeyEvent::new(KeyCode::Tab, KeyModifiers::NONE);
        handle_key(&mut app, key);
        assert_eq!(app.active_tab, Tab::TxDetail);
    }

    #[test]
    fn number_keys_switch_tabs() {
        let mut app = App::new();
        let key = KeyEvent::new(KeyCode::Char('4'), KeyModifiers::NONE);
        handle_key(&mut app, key);
        assert_eq!(app.active_tab, Tab::FamousBlocks);
    }

    #[test]
    fn help_toggle() {
        let mut app = App::new();
        assert!(!app.show_help);
        let key = KeyEvent::new(KeyCode::Char('?'), KeyModifiers::NONE);
        handle_key(&mut app, key);
        assert!(app.show_help);
        handle_key(&mut app, key);
        assert!(!app.show_help);
    }

    #[test]
    fn scroll_famous_blocks() {
        let mut app = App::new();
        app.active_tab = Tab::FamousBlocks;
        assert_eq!(app.famous_selected, 0);
        let down = KeyEvent::new(KeyCode::Char('j'), KeyModifiers::NONE);
        handle_key(&mut app, down);
        assert_eq!(app.famous_selected, 1);
        let up = KeyEvent::new(KeyCode::Char('k'), KeyModifiers::NONE);
        handle_key(&mut app, up);
        assert_eq!(app.famous_selected, 0);
    }

    #[test]
    fn f_key_enters_input_mode() {
        let mut app = App::new();
        let key = KeyEvent::new(KeyCode::Char('f'), KeyModifiers::NONE);
        handle_key(&mut app, key);
        assert_eq!(app.input_mode, InputMode::FixturePath(String::new()));
    }

    #[test]
    fn e_key_export_no_tx() {
        let mut app = App::new();
        let key = KeyEvent::new(KeyCode::Char('e'), KeyModifiers::NONE);
        handle_key(&mut app, key);
        assert!(
            app.status_message.contains("failed") || app.status_message.contains("No transaction")
        );
    }

    #[test]
    fn input_mode_typing() {
        let mut app = App::new();
        app.input_mode = InputMode::FixturePath(String::new());

        // type "ab"
        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char('a'), KeyModifiers::NONE),
        );
        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char('b'), KeyModifiers::NONE),
        );
        assert_eq!(app.input_mode, InputMode::FixturePath("ab".to_string()));

        // backspace
        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Backspace, KeyModifiers::NONE),
        );
        assert_eq!(app.input_mode, InputMode::FixturePath("a".to_string()));

        // escape cancels
        handle_key(&mut app, KeyEvent::new(KeyCode::Esc, KeyModifiers::NONE));
        assert_eq!(app.input_mode, InputMode::Normal);
    }

    #[test]
    fn debugger_n_p_keys() {
        use crate::app::DebuggerState;
        use txray_core::tx::script_exec::{ScriptStep, StepStatus};

        let mut app = App::new();
        app.active_tab = Tab::ScriptDebugger;
        app.debugger = Some(DebuggerState {
            steps: vec![
                ScriptStep {
                    step_number: 1,
                    opcode: "OP_DUP".into(),
                    main_stack: vec![],
                    alt_stack: vec![],
                    status: StepStatus::Ok,
                },
                ScriptStep {
                    step_number: 2,
                    opcode: "OP_HASH160".into(),
                    main_stack: vec![],
                    alt_stack: vec![],
                    status: StepStatus::Ok,
                },
                ScriptStep {
                    step_number: 3,
                    opcode: "VERIFY".into(),
                    main_stack: vec![],
                    alt_stack: vec![],
                    status: StepStatus::Finished,
                },
            ],
            cursor: 0,
            auto_run: false,
            input_index: 0,
            script_label: "p2pkh".into(),
        });

        // n steps forward
        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char('n'), KeyModifiers::NONE),
        );
        assert_eq!(app.debugger.as_ref().unwrap().cursor, 1);

        // p steps backward
        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char('p'), KeyModifiers::NONE),
        );
        assert_eq!(app.debugger.as_ref().unwrap().cursor, 0);

        // space toggles auto-run
        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char(' '), KeyModifiers::NONE),
        );
        assert!(app.debugger.as_ref().unwrap().auto_run);
        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char(' '), KeyModifiers::NONE),
        );
        assert!(!app.debugger.as_ref().unwrap().auto_run);
    }

    #[test]
    fn n_key_ignored_on_other_tabs() {
        let mut app = App::new();
        app.active_tab = Tab::Dashboard; // not script debugger
                                         // n key should not crash even without debugger
        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char('n'), KeyModifiers::NONE),
        );
        // no panic = pass
    }

    #[test]
    fn learn_enter_starts_lesson() {
        let mut app = App::new();
        app.active_tab = Tab::Learn;
        app.learn_selected = 0;

        handle_key(&mut app, KeyEvent::new(KeyCode::Enter, KeyModifiers::NONE));
        assert!(app.learn_active);
    }

    #[test]
    fn learn_keys_advance_and_answer_quiz() {
        let mut app = App::new();
        app.active_tab = Tab::Learn;
        app.learn_selected = 0;
        app.start_selected_lesson();

        let before = app.learn_step;
        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char('n'), KeyModifiers::NONE),
        );
        assert!(app.learn_step >= before);

        let answer = app.current_lesson().quiz_answer;
        let key = match answer {
            0 => KeyCode::Char('a'),
            1 => KeyCode::Char('b'),
            _ => KeyCode::Char('c'),
        };
        handle_key(&mut app, KeyEvent::new(key, KeyModifiers::NONE));
        assert!(app.learn_quiz_feedback.is_some());
    }

    #[test]
    fn learn_quiz_accepts_uppercase_and_numeric_keys() {
        let mut app = App::new();
        app.active_tab = Tab::Learn;
        app.learn_selected = 0;
        app.start_selected_lesson();

        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char('A'), KeyModifiers::SHIFT),
        );
        assert_eq!(app.learn_quiz_choice, Some(0));

        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char('2'), KeyModifiers::NONE),
        );
        assert_eq!(app.learn_quiz_choice, Some(1));

        handle_key(
            &mut app,
            KeyEvent::new(KeyCode::Char('3'), KeyModifiers::NONE),
        );
        assert_eq!(app.learn_quiz_choice, Some(2));
    }

    #[test]
    fn esc_exits_learn_session_not_app() {
        let mut app = App::new();
        app.active_tab = Tab::Learn;
        app.start_selected_lesson();
        assert!(app.learn_active);

        let keep_running = handle_key(&mut app, KeyEvent::new(KeyCode::Esc, KeyModifiers::NONE));
        assert!(keep_running);
        assert!(!app.learn_active);
        assert!(!app.should_quit);
    }
}
