/**
 * pi-provider-model-picker
 *
 * A provider-grouped model picker for the pi coding agent.
 *
 * The built-in `/model` selector lists every available model top-to-bottom in
 * one flat list. With many providers configured, finding a model means a lot
 * of scrolling. This extension groups models by provider into tabs:
 *
 *   - Tab / Shift+Tab (or ←/→)  switch provider
 *   - ↑/↓                        move within the provider's models
 *   - type                       fuzzy filter within the current provider
 *   - Enter                      switch to the selected model
 *   - Esc                        cancel
 *
 * Opens via the `/pm` command and (by default) the Ctrl+L shortcut, which
 * takes precedence over the built-in model selector. Set
 * `PI_PROVIDER_MODEL_PICKER_SHORTCUT=none` to keep the built-in Ctrl+L and
 * use `/pm` only, or set it to any other key combination.
 *
 * The model list mirrors the built-in picker: it prefers the session's
 * scoped models (`/scoped-models`, including pinned thinking levels) and
 * falls back to all models from providers with complete authentication.
 *
 * This extension registers no tools and no prompt hooks, so it adds zero
 * tokens to the system prompt / model context.
 *
 * MIT License. See LICENSE.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { Api, Model } from "@earendil-works/pi-ai";
import { Key, type KeyId, matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

/** Thinking levels understood by pi.setThinkingLevel(). */
type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

interface ThemeLike {
  fg(color: string, text: string): string;
  bg(color: string, text: string): string;
  bold(text: string): string;
}

interface ProviderTab {
  provider: string;
  label: string;
  models: Model<Api>[];
}

const MAX_VISIBLE_ROWS = 12;

/** Default shortcut that opens the picker. Override with PI_PROVIDER_MODEL_PICKER_SHORTCUT. */
const DEFAULT_SHORTCUT = "ctrl+l";

export class ProviderModelPicker {
  private tabIndex = 0;
  private listIndex = 0;
  private filter = "";

  constructor(
    private tabs: ProviderTab[],
    private currentKey: string | undefined,
    private pinnedThinking: Record<string, ThinkingLevel>,
    private theme: ThemeLike,
    private kb: { matches(data: string, action: string): boolean },
    private onDone: (result: { model: Model<Api>; thinkingLevel?: ThinkingLevel } | null) => void,
  ) {
    if (currentKey) {
      const provider = currentKey.split("/")[0];
      const i = tabs.findIndex((t) => t.provider === provider);
      if (i >= 0) this.tabIndex = i;
    }
    this.focusCurrentModel();
  }

  private key(model: Model<Api>): string {
    return `${model.provider}/${model.id}`;
  }

  private focusCurrentModel(): void {
    const models = this.filtered();
    const i = models.findIndex((m) => this.currentKey && this.key(m) === this.currentKey);
    if (i >= 0) {
      this.listIndex = i;
    } else {
      this.listIndex = Math.min(this.listIndex, Math.max(0, models.length - 1));
    }
  }

  private filtered(): Model<Api>[] {
    const q = this.filter.toLowerCase();
    const models = this.tabs[this.tabIndex]!.models;
    if (!q) return models;
    return models.filter((m) => `${m.id} ${m.name}`.toLowerCase().includes(q));
  }

  private switchTab(delta: number): void {
    if (this.tabs.length === 0) return;
    this.tabIndex = (this.tabIndex + delta + this.tabs.length) % this.tabs.length;
    this.listIndex = 0;
    this.focusCurrentModel();
  }

  handleInput(data: string): void {
    // Provider tab switching
    if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
      this.switchTab(1);
      return;
    }
    if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
      this.switchTab(-1);
      return;
    }
    // List navigation (respect the user's select keybindings)
    if (this.kb.matches(data, "tui.select.up") || matchesKey(data, Key.up)) {
      const models = this.filtered();
      if (models.length > 0) {
        this.listIndex = this.listIndex === 0 ? models.length - 1 : this.listIndex - 1;
      }
      return;
    }
    if (this.kb.matches(data, "tui.select.down") || matchesKey(data, Key.down)) {
      const models = this.filtered();
      if (models.length > 0) {
        this.listIndex = this.listIndex === models.length - 1 ? 0 : this.listIndex + 1;
      }
      return;
    }
    // Confirm / cancel
    if (this.kb.matches(data, "tui.select.confirm") || matchesKey(data, Key.enter)) {
      const model = this.filtered()[this.listIndex];
      if (model) {
        this.onDone({ model, thinkingLevel: this.pinnedThinking[this.key(model)] });
      }
      return;
    }
    if (
      this.kb.matches(data, "tui.select.cancel") ||
      matchesKey(data, Key.escape) ||
      matchesKey(data, Key.ctrl("c"))
    ) {
      this.onDone(null);
      return;
    }
    // Filter editing
    if (matchesKey(data, Key.backspace)) {
      this.filter = this.filter.slice(0, -1);
      this.listIndex = 0;
      this.focusCurrentModel();
      return;
    }
    if (matchesKey(data, Key.ctrl("u"))) {
      this.filter = "";
      this.listIndex = 0;
      this.focusCurrentModel();
      return;
    }
    if (data.length === 1 && data.charCodeAt(0) >= 32 && data !== "\x7f") {
      this.filter += data;
      this.listIndex = 0;
      this.focusCurrentModel();
      return;
    }
  }

  private renderTabBar(width: number): string {
    const t = this.theme;
    const parts = this.tabs.map((tab, i) => {
      const label = `${tab.label} ${tab.models.length}`;
      if (i === this.tabIndex) return t.bg("selectedBg", t.fg("accent", t.bold(` ${label} `)));
      return t.fg("muted", ` ${label} `);
    });
    let bar = parts.join(" ");
    if (visibleWidth(bar) <= width) return truncateToWidth(bar, width, "");
    // Bar overflows: window the tabs around the active one
    const start = Math.max(0, this.tabIndex - 2);
    const end = Math.min(this.tabs.length, start + 5);
    bar =
      (start > 0 ? t.fg("dim", "… ") : "") +
      parts.slice(start, end).join(" ") +
      (end < this.tabs.length ? t.fg("dim", " …") : "");
    return truncateToWidth(bar, width, "");
  }

  private renderModelLine(model: Model<Api>, selected: boolean, width: number): string {
    const t = this.theme;
    const isCurrent = this.currentKey === this.key(model);

    const badges: string[] = [];
    if (model.reasoning) badges.push("thinking");
    if (model.contextWindow) badges.push(`${Math.round(model.contextWindow / 1000)}k`);

    const label = `${model.name}  ${t.fg("dim", model.id)}`;
    const desc = t.fg("muted", badges.join(" · "));
    const marker = isCurrent ? t.fg("success", " ✓") : "";
    const line = (selected ? t.fg("accent", "→ ") : "  ") + label + "  " + desc + marker;
    return truncateToWidth(line, width, "");
  }

  render(width: number): string[] {
    const t = this.theme;
    const lines: string[] = [];

    const models = this.filtered();
    lines.push(t.fg("accent", t.bold(" Switch model")) + t.fg("dim", "  (grouped by provider)"));
    lines.push("");
    lines.push(this.renderTabBar(width));
    lines.push(t.fg("dim", "─".repeat(Math.max(0, Math.min(width, 60)))));

    if (models.length === 0) {
      lines.push(t.fg("warning", `  no models matching "${this.filter}"`));
    } else {
      // Scroll window centered on selection, like SelectList
      const start = Math.max(
        0,
        Math.min(this.listIndex - Math.floor(MAX_VISIBLE_ROWS / 2), models.length - MAX_VISIBLE_ROWS),
      );
      for (let i = start; i < Math.min(start + MAX_VISIBLE_ROWS, models.length); i++) {
        lines.push(this.renderModelLine(models[i]!, i === this.listIndex, width));
      }
      if (models.length > MAX_VISIBLE_ROWS) {
        lines.push(t.fg("dim", `  (${this.listIndex + 1}/${models.length})`));
      }
    }

    lines.push(t.fg("dim", "─".repeat(Math.max(0, Math.min(width, 60)))));
    lines.push(
      this.filter
        ? t.fg("dim", " filter: ") + t.fg("text", this.filter + "▏") + t.fg("dim", "  (ctrl+u clear)")
        : t.fg("dim", " type to filter"),
    );
    lines.push(t.fg("dim", " tab/shift+tab switch provider • ↑↓ move • enter select • esc cancel"));
    // Never exceed the given width (TUI contract)
    return lines.map((l) => truncateToWidth(l, width, ""));
  }

  invalidate(): void {
    // No render cache; nothing to invalidate.
  }
}

async function openPicker(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
  if (ctx.mode !== "tui") return;

  // Mirror the built-in picker: prefer session-scoped models, fall back to
  // all models whose providers have complete auth configuration.
  const scoped = ctx.scopedModels ?? [];
  const pinned: Record<string, ThinkingLevel> = {};
  let models: Model<Api>[];
  if (scoped.length > 0) {
    models = scoped.map((s) => s.model);
    for (const s of scoped) {
      if (s.thinkingLevel) pinned[`${s.model.provider}/${s.model.id}`] = s.thinkingLevel;
    }
  } else {
    models = [...(await ctx.modelRegistry.getAvailable())];
  }
  if (models.length === 0) {
    ctx.ui.notify("No models available (check /login)", "warning");
    return;
  }

  // Group by provider, preserving catalog order within each provider
  const groups = new Map<string, Model<Api>[]>();
  for (const model of models) {
    const list = groups.get(model.provider) ?? [];
    list.push(model);
    groups.set(model.provider, list);
  }
  const tabs: ProviderTab[] = [...groups.entries()].map(([provider, list]) => {
    const name = ctx.modelRegistry.getProvider(provider)?.name ?? provider;
    return { provider, label: name, models: list };
  });

  const currentKey = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined;

  const result = await ctx.ui.custom<{ model: Model<Api>; thinkingLevel?: ThinkingLevel } | null>(
    (tui, theme, keybindings, done) => {
      const picker = new ProviderModelPicker(tabs, currentKey, pinned, theme, keybindings, (r) =>
        done(r),
      );
      return {
        render: (w: number) => picker.render(w),
        invalidate: () => picker.invalidate(),
        handleInput: (data: string) => {
          picker.handleInput(data);
          tui.requestRender();
        },
      };
    },
  );

  if (!result) return;

  const ok = await pi.setModel(result.model);
  if (!ok) {
    ctx.ui.notify(`No authentication configured for ${result.model.provider}`, "error");
    return;
  }
  if (result.thinkingLevel) pi.setThinkingLevel(result.thinkingLevel);
  ctx.ui.notify(`Model: ${result.model.provider}/${result.model.id}`, "info");
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("pm", {
    description: "Switch model (grouped by provider)",
    handler: async (_args, ctx) => {
      await openPicker(pi, ctx);
    },
  });

  // Extension shortcuts are checked before built-in app keybindings, so this
  // takes over Ctrl+L from the built-in model selector by default. Set
  // PI_PROVIDER_MODEL_PICKER_SHORTCUT=none to disable, or to any other key.
  const shortcut = process.env.PI_PROVIDER_MODEL_PICKER_SHORTCUT ?? DEFAULT_SHORTCUT;
  if (shortcut && shortcut.toLowerCase() !== "none") {
    pi.registerShortcut(shortcut as KeyId, {
      description: "Open provider-grouped model picker",
      handler: async (ctx) => {
        await openPicker(pi, ctx);
      },
    });
  }
}
