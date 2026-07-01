import esbuild from "esbuild";
import builtins from "builtin-modules";

const production = process.argv[2] === "production";

const ctx = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/view", "@codemirror/state", ...builtins],
  format: "cjs",
  target: "es2022",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  logLevel: "info",
});

if (production) { await ctx.rebuild(); process.exit(0); }
else { await ctx.watch(); }
