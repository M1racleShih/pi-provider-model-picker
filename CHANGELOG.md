# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-18

### Added

- Provider-grouped model picker: one tab per provider instead of a flat model list.
- `/pm` command and `Alt+M` shortcut (`Ctrl+L` takeover possible by rebinding the built-in selector, see README).
- `Tab` / `Shift+Tab` / `←` / `→` to switch providers, `↑` / `↓` to pick a model, typing filters within the active provider.
- Mirrors the built-in picker's model list: session-scoped models (with pinned thinking levels) when configured, otherwise all models from authenticated providers.
- `PI_PROVIDER_MODEL_PICKER_SHORTCUT` environment variable to change or disable (`none`) the shortcut.
- Zero system-prompt footprint: no tools, no prompt hooks.
