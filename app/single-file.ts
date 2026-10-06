import type { Plugin } from "vite";

// The MCP resource must work without fetching sibling files. Keep this small
// inliner local: vite-plugin-singlefile pulls in the unpatched braces package
// through a glob matcher that our single-entry build does not need.
export function singleFileApp(): Plugin {
  return {
    name: "lotus:single-file-app",
    apply: "build",
    enforce: "post",
    config: () => ({
      base: "./",
      build: {
        assetsInlineLimit: () => true,
        assetsDir: "",
        cssCodeSplit: false,
        rolldownOptions: { output: { codeSplitting: false } },
      },
    }),
    generateBundle(_options, bundle) {
      const entry = bundle["mcp-app.html"];
      if (!entry || entry.type !== "asset") {
        this.error("Expected the mcp-app.html entry for the single-file MCP app");
      }
      let html = String(entry.source);
      for (const [filename, output] of Object.entries(bundle)) {
        if (output === entry) continue;
        const escapedName = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        let pattern: RegExp;
        if (output.type === "chunk") {
          // Rolldown records folded dynamic imports as self-references.
          const imports = [...output.imports, ...output.dynamicImports]
            .filter(imported => imported !== filename);
          if (imports.length) {
            this.error(`Cannot inline ${filename}: it still imports other modules`);
          }
          pattern = new RegExp(`<script\\b([^>]*?)\\s+src="(?:\\./)?${escapedName}"([^>]*)>\\s*</script>`, "g");
          const code = output.code
            .replace(/"?__VITE_PRELOAD__"?/g, "void 0")
            .replace(/<(?=\/script\b|!--)/gi, "\\x3C");
          // Use a callback below so dollar signs in bundled code stay literal.
          html = html.replace(pattern, (_tag, before: string, after: string) =>
            `<script${before}${after}>${code}</script>`);
        } else if (filename.endsWith(".css")) {
          pattern = new RegExp(`<link\\b[^>]*\\s+href="(?:\\./)?${escapedName}"[^>]*>`, "g");
          const css = String(output.source).replace(/<(?=\/style\b)/gi, "\\3C ");
          html = html.replace(pattern, () => `<style>${css}</style>`);
        } else {
          this.error(`Cannot inline unexpected MCP app asset: ${filename}`);
        }
        // A missing reference would otherwise leave a broken resource behind.
        if (!pattern.test(String(entry.source))) {
          this.error(`No HTML reference found for ${filename}`);
        }
        delete bundle[filename];
      }
      entry.source = html;
    },
  };
}
