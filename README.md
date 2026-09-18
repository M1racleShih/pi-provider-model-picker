# pi-provider-model-picker

A provider-grouped model picker for the [pi coding agent](https://github.com/earendil-works/pi).

The built-in `/model` selector lists every available model top-to-bottom in one
flat list. If you have several providers configured (Anthropic, Google, OpenAI,
DeepSeek, custom proxies, …), that means a lot of scrolling. This extension
groups models **by provider into tabs**:

```
 Switch model  (grouped by provider)

 Anthropic 2   Google 1   OpenAI 3
──────────────────────────────────────────────
→ GPT-5.2  gpt-5.2  thinking · 400k ✓
  GPT-5.2 Codex  gpt-5.2-codex  thinking · 400k
  GPT-5.1  gpt-5.1  thinking · 400k
──────────────────────────────────────────────
 type to filter
 tab/shift+tab switch provider • ↑↓ move • enter select • esc cancel
```

## Features

- **One tab per provider** — `Tab` / `Shift+Tab` (or `←` / `→`) cycles providers, `↑` / `↓` picks a model, `Enter` switches, `Esc` cancels.
- **Type to filter** within the active provider; `Ctrl+U` clears the filter.
- **Opens on the current model** — the picker starts on the current model's provider tab and marks it with `✓`.
- **Mirrors the built-in picker's model list** — uses your session's scoped models ([`/scoped-models`](https://pi.dev/docs/latest/packages), including pinned thinking levels) when configured, otherwise all models from providers with complete authentication.
- **Zero system-prompt footprint** — registers no tools and no prompt hooks, so it adds no tokens to the model context.
- Works with custom providers registered by other extensions or via `models.json`.

## Install

From npm (also lists the package in the [pi package gallery](https://pi.dev/packages)):

```bash
pi install npm:pi-provider-model-picker
```

From GitHub:

```bash
pi install git:github.com/M1racleShih/pi-provider-model-picker
```

Try it once without installing:

```bash
pi -e npm:pi-provider-model-picker
```

Or copy `extensions/index.ts` to `~/.pi/agent/extensions/provider-model-picker.ts`.

After installing, restart pi (or run `/reload`).

## Usage

| Key | Action |
|-----|--------|
| `Ctrl+L` or `/pm` | Open the picker |
| `Tab` / `Shift+Tab` | Next / previous provider |
| `←` / `→` | Same as Tab / Shift+Tab |
| `↑` / `↓` | Move within the provider's models (wraps) |
| type | Filter models within the active provider |
| `Ctrl+U` | Clear the filter |
| `Enter` | Switch to the selected model |
| `Esc` / `Ctrl+C` | Cancel |

> Extension shortcuts are checked before pi's built-in keybindings, so `Ctrl+L`
> replaces the built-in model selector while this package is enabled. The
> built-in `/model` command keeps working unchanged.

### Changing the shortcut

```bash
# Use Alt+M instead of Ctrl+L
export PI_PROVIDER_MODEL_PICKER_SHORTCUT=alt+m

# Keep the built-in Ctrl+L picker and use /pm only
export PI_PROVIDER_MODEL_PICKER_SHORTCUT=none
```

## How it works

The extension registers a command and a keyboard shortcut (no tools). The
picker is a custom TUI component shown via `ctx.ui.custom()`, the same
mechanism pi's own `/settings` uses. Selecting a model calls
`pi.setModel()`; if a scoped-model pattern pinned a thinking level for that
model (e.g. `anthropic/*:high`), it is applied too.

## Development

```bash
git clone git@github.com:M1racleShih/pi-provider-model-picker.git
cd pi-provider-model-picker
npm install
npm test        # headless render/input tests
npm run typecheck
```

To iterate locally: `pi -e ~/opensource/agents/pi-provider-model-picker` or
install the local path `pi install ~/opensource/agents/pi-provider-model-picker`.

### Publishing

1. Bump `version` in `package.json` and update `CHANGELOG.md`.
2. `npm publish` (requires an npm account; `npm login` first). The
   `pi-package` keyword makes the package appear in the
   [pi package gallery](https://pi.dev/packages) automatically.
3. Tag the release: `git tag v0.1.0 && git push --tags` so git-source users
   can pin `git:github.com/M1racleShih/pi-provider-model-picker@v0.1.0`.

Optional: add a `pi.image` (screenshot) or `pi.video` (MP4 demo) field to the
`pi` manifest for a gallery preview.

## License

[MIT](LICENSE)
