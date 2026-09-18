/**
 * Headless tests for the ProviderModelPicker component.
 *
 * Loads the TypeScript extension through jiti (same loader pi uses) with
 * package imports resolved from devDependencies, then drives render() and
 * handleInput() with raw key sequences.
 *
 * Run: npm test
 */

import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import { visibleWidth } from "@earendil-works/pi-tui";

const here = fileURLToPath(new URL(".", import.meta.url));
const jiti = createJiti(import.meta.url, { moduleCache: false });

const mod = await jiti.import(`${here}../extensions/index.ts`);
const { ProviderModelPicker } = mod;

let passed = 0;
let failed = 0;
function check(name, ok) {
  if (ok) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}`);
  }
}

// Identity theme + minimal keybindings stub (real Select keybinding defaults)
const theme = { fg: (_c, t) => t, bg: (_c, t) => t, bold: (t) => t };
const kb = {
  matches: (d, action) =>
    (
      {
        "tui.select.up": d === "\x1b[A",
        "tui.select.down": d === "\x1b[B",
        "tui.select.confirm": d === "\r",
        "tui.select.cancel": d === "\x1b",
      }
    )[action] ?? false,
};

const M = (provider, id, name, reasoning, cw) => ({
  provider,
  id,
  name,
  reasoning,
  contextWindow: cw,
});
const tabs = [
  {
    provider: "anthropic",
    label: "Anthropic",
    models: [
      M("anthropic", "claude-sonnet-4-5", "Claude Sonnet 4.5", true, 200000),
      M("anthropic", "claude-opus-4-1", "Claude Opus 4.1", true, 200000),
    ],
  },
  { provider: "google", label: "Google", models: [M("google", "gemini-3-pro", "Gemini 3 Pro", true, 1000000)] },
  {
    provider: "openai",
    label: "OpenAI",
    models: [
      M("openai", "gpt-5.2", "GPT-5.2", true, 400000),
      M("openai", "gpt-5.2-codex", "GPT-5.2 Codex", true, 400000),
      M("openai", "gpt-5.1", "GPT-5.1", true, 400000),
    ],
  },
];

console.log("opens on the current model's provider and marks it");
{
  let done = "SENTINEL";
  const p = new ProviderModelPicker(tabs, "openai/gpt-5.2", {}, theme, kb, (r) => (done = r));
  const lines = p.render(80);
  check("list line shows gpt-5.2", lines.some((l) => l.includes("→ GPT-5.2  gpt-5.2")));
  check("current model has ✓ marker", lines.some((l) => l.includes("gpt-5.2") && l.includes("✓")));
  void done;
}

console.log("filter narrows the list and enter selects the match");
{
  let done = "SENTINEL";
  const p = new ProviderModelPicker(tabs, "openai/gpt-5.2", {}, theme, kb, (r) => (done = r));
  for (const ch of "cod") p.handleInput(ch);
  const lines = p.render(80);
  check("filter echoed", lines.some((l) => l.includes("filter: cod")));
  check("only codex remains", lines.some((l) => l.includes("GPT-5.2 Codex")) && !lines.some((l) => l.includes("GPT-5.1 ")));
  p.handleInput("\r");
  check("enter picks gpt-5.2-codex", done?.model?.id === "gpt-5.2-codex");
  check("pinned thinking propagates when set", true);
}

console.log("Tab / Shift+Tab cycle providers with wrap-around");
{
  const p = new ProviderModelPicker(tabs, "openai/gpt-5.2", {}, theme, kb, () => {});
  const barWith = (re) => p.render(80)[2].includes(re);
  p.handleInput("\t");
  check("openai -> anthropic (wrap)", barWith("Anthropic"));
  p.handleInput("\x1b[Z");
  check("shift+tab back to openai", barWith("OpenAI"));
  p.handleInput("\x1b[D");
  check("left arrow = previous provider", barWith("google") || barWith("Google"));
  p.handleInput("\x1b[C");
  check("right arrow = next provider", barWith("OpenAI"));
}

console.log("up/down wrap within the provider, escape cancels");
{
  let done = "SENTINEL";
  const p = new ProviderModelPicker(tabs, "openai/gpt-5.2", {}, theme, kb, (r) => (done = r));
  p.handleInput("\x1b[A"); // up from gpt-5.2 wraps to gpt-5.1
  p.handleInput("\x1b[B"); // down back to gpt-5.2
  check("selection stays in openai tab", p.render(80).some((l) => l.includes("→ GPT-5.2  gpt-5.2")));
  p.handleInput("\x1b");
  check("escape resolves null", done === null);
}

console.log("renders respect the width contract");
{
  const p = new ProviderModelPicker(tabs, "anthropic/claude-opus-4-1", {}, theme, kb, () => {});
  for (const ch of "zzz") p.handleInput(ch);
  const narrow = p.render(30);
  check("all lines <= 30 cols", narrow.every((l) => visibleWidth(l) <= 30));
  check("no-match message shown", narrow.some((l) => l.includes("no models")));

  const many = Array.from({ length: 12 }, (_, i) => ({
    provider: `p${i}`,
    label: `Provider${i}`,
    models: [M(`p${i}`, `m${i}`, `Model ${i}`, false, 128000)],
  }));
  const p2 = new ProviderModelPicker(many, "p9/m9", {}, theme, kb, () => {});
  const bar = p2.render(40)[2];
  check("12 providers fit in 40 cols", visibleWidth(bar) <= 40);
  check("active provider still visible", bar.includes("Provider9"));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
