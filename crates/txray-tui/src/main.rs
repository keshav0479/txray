//! txray TUI - interactive Bitcoin analysis dashboard.

mod app;
mod data;
mod event;
mod theme;
mod ui;

use std::io;

use ratatui::crossterm::execute;
use ratatui::crossterm::terminal::{
    disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen,
};
use ratatui::prelude::CrosstermBackend;
use ratatui::Terminal;

fn main() -> anyhow::Result<()> {
    let fixture_path = std::env::args().nth(1);

    // set up terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;
    terminal.clear()?;

    let mut app = app::App::new();

    // if a fixture was passed on the command line, load it
    if let Some(path) = fixture_path {
        app.load_fixture(&path);
    }

    // main loop
    let result = run_loop(&mut terminal, &mut app);

    // restore terminal
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;

    result
}

fn run_loop(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    app: &mut app::App,
) -> anyhow::Result<()> {
    loop {
        terminal.draw(|frame| ui::draw(frame, app))?;

        if !event::handle_events(app)? {
            break;
        }
    }
    Ok(())
}
