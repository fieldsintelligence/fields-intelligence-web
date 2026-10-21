// node:module hooks for the blog render tests. They let `node --test` import the
// real lib/ and components/ sources: `@/` paths resolve to the repo root,
// extensionless relative imports resolve to .ts/.tsx, repo .ts/.tsx files are
// transpiled with the project's TypeScript (jsx: react-jsx), next/server
// resolves to the real package entry, and next/link, next/image and
// next/navigation map to the small stubs in ./stubs.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STUBS = {
  "next/link": pathToFileURL(join(ROOT, "src/support/stubs/next-link.mjs")).href,
  "next/image": pathToFileURL(join(ROOT, "src/support/stubs/next-image.mjs")).href,
  "next/navigation": pathToFileURL(join(ROOT, "src/support/stubs/next-navigation.mjs")).href,
  "next/og": pathToFileURL(join(ROOT, "src/support/stubs/next-og.mjs")).href,
};
const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function inRepoSource(file) {
  return file.startsWith(ROOT) && !file.includes(`${join(ROOT, "node_modules")}`);
}

function tryResolve(base) {
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }
  return null;
}

const NEXT_SERVER = pathToFileURL(join(ROOT, "node_modules/next/server.js")).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return { url: NEXT_SERVER, shortCircuit: true };
  }
  if (Object.hasOwn(STUBS, specifier)) {
    return { url: STUBS[specifier], shortCircuit: true };
  }
  let base = null;
  if (specifier.startsWith("@/")) {
    base = join(ROOT, specifier.slice(2));
  } else if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:")
  ) {
    const parent = fileURLToPath(context.parentURL);
    if (inRepoSource(parent)) base = join(dirname(parent), specifier);
  }
  if (base) {
    const url = tryResolve(base);
    if (url) return { url, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && /\.tsx?$/.test(url)) {
    const file = fileURLToPath(url);
    if (inRepoSource(file)) {
      const output = ts.transpileModule(readFileSync(file, "utf8"), {
        fileName: file,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      });
      return { format: "module", source: output.outputText, shortCircuit: true };
    }
  }
  return nextLoad(url, context);
}
