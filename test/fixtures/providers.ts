/** Offline fixture: selection only; any model call is an error. */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
export default function (pi: ExtensionAPI) {
  for (const provider of ["picker-one", "picker-two"]) {
    pi.registerProvider(provider, {
      name: provider, baseUrl: "http://127.0.0.1:9", apiKey: "fixture-not-a-secret",
      api: "openai-completions",
      streamSimple: () => { throw new Error("Picker smoke must not call a model"); },
      models: ["alpha", "beta"].map((id) => ({
        id, name: `${provider} ${id}`, reasoning: true, input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000, maxTokens: 4096,
      })),
    });
  }
  pi.registerCommand("picker-status", {
    description: "Offline test status", handler: async (_args, ctx) => {
      ctx.ui.notify(`PICKER-STATUS:${ctx.model?.provider}/${ctx.model?.id}:${ctx.thinkingLevel}`, "info");
    },
  });
}
