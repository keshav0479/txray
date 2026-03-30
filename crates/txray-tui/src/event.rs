//! Terminal event handling for the TUI.

use ratatui::crossterm::event::{self, Event, KeyCode, KeyEvent, KeyModifiers};
use std::time::Duration;

use crate::app::App;

/// Poll for a key event with a timeout. Returns true if the app should keep running.
pub fn handle_events(app: &mut App) -> anyhow::Result<bool> {
    if event::poll(Duration::from_millis(16))? {
        if let Event::Key(key) = event::read()? {
            // ignore key release events on Windows
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

    // help overlay intercepts all keys
    if app.show_help {
        match key.code {
            KeyCode::Char('?') | KeyCode::Esc | KeyCode::Enter => app.show_help = false,
            _ => {}
        }
        return true;
    }

    match key.code {
        KeyCode::Char('q') | KeyCode::Esc => {
            app.should_quit = true;
            return false;
        }
        KeyCode::Char('?') => app.toggle_help(),
        KeyCode::Tab => app.next_tab(),
        KeyCode::BackTab => app.prev_tab(),

        // vim-style navigation for lists
        KeyCode::Char('j') | KeyCode::Down => handle_scroll_down(app),
        KeyCode::Char('k') | KeyCode::Up => handle_scroll_up(app),

        // number keys switch tabs directly
        KeyCode::Char('1') => app.active_tab = crate::app::Tab::Dashboard,
        KeyCode::Char('2') => app.active_tab = crate::app::Tab::TxDetail,
        KeyCode::Char('3') => app.active_tab = crate::app::Tab::Heuristics,
        KeyCode::Char('4') => app.active_tab = crate::app::Tab::FamousBlocks,
        KeyCode::Char('5') => app.active_tab = crate::app::Tab::ScriptDebugger,
        KeyCode::Char('6') => app.active_tab = crate::app::Tab::Learn,

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
            if app.learn_selected < 6 {
                app.learn_selected += 1;
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
            app.learn_selected = app.learn_selected.saturating_sub(1);
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
        // pressing ? again closes it
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
}
