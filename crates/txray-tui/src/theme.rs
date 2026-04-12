//! Color theme for the txray TUI, matching the architecture SVG palette.
//!
//! Some constants are defined for future views (commits 4.2+).

use ratatui::style::{Color, Modifier, Style};

// primary accent colors (from architecture.svg)
pub const CYAN: Color = Color::Rgb(0, 229, 255);
pub const PURPLE: Color = Color::Rgb(178, 0, 255);
pub const GREEN: Color = Color::Rgb(0, 255, 136);
pub const ORANGE: Color = Color::Rgb(255, 94, 0);

// softer text variants
pub const CYAN_TEXT: Color = Color::Rgb(0, 229, 255);
pub const PURPLE_TEXT: Color = Color::Rgb(212, 128, 255);
pub const GREEN_TEXT: Color = Color::Rgb(128, 255, 196);
pub const ORANGE_TEXT: Color = Color::Rgb(255, 179, 128);

// background and surface colors
pub const BG: Color = Color::Rgb(11, 14, 20);
pub const SURFACE: Color = Color::Rgb(26, 30, 38);
pub const SURFACE_BRIGHT: Color = Color::Rgb(40, 46, 58);

// text colors
pub const TEXT: Color = Color::Rgb(220, 225, 235);
pub const TEXT_DIM: Color = Color::Rgb(160, 170, 191);
pub const TEXT_MUTED: Color = Color::Rgb(100, 110, 130);

// status colors
pub const WARNING: Color = Color::Rgb(255, 200, 0);
pub const ERROR: Color = Color::Rgb(255, 80, 80);

// -- pre-built styles --

pub fn title() -> Style {
    Style::default().fg(CYAN).add_modifier(Modifier::BOLD)
}

pub fn tab_active() -> Style {
    Style::default()
        .fg(BG)
        .bg(CYAN)
        .add_modifier(Modifier::BOLD)
}

pub fn tab_inactive() -> Style {
    Style::default().fg(TEXT_DIM).bg(SURFACE)
}

pub fn header() -> Style {
    Style::default().fg(CYAN_TEXT).add_modifier(Modifier::BOLD)
}

pub fn key_hint() -> Style {
    Style::default().fg(CYAN)
}

pub fn key_desc() -> Style {
    Style::default().fg(TEXT_DIM)
}

pub fn border_default() -> Style {
    Style::default().fg(SURFACE_BRIGHT)
}

pub fn border_active() -> Style {
    Style::default().fg(CYAN)
}

pub fn status_bar() -> Style {
    Style::default().fg(TEXT_MUTED).bg(SURFACE)
}

pub fn placeholder_text() -> Style {
    Style::default()
        .fg(TEXT_MUTED)
        .add_modifier(Modifier::ITALIC)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn styles_are_constructable() {
        // just make sure none of these panic
        let _ = title();
        let _ = tab_active();
        let _ = tab_inactive();
        let _ = header();
        let _ = key_hint();
        let _ = border_default();
        let _ = status_bar();
        let _ = placeholder_text();
    }
}
