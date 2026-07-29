import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const template = await readFile(join(root, "public/sw.js"), "utf8");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.name !== "sw.js") {
      files.push(`/${relative(dist, path).split("\\").join("/")}`);
    }
  }
  return files;
}

const assets = ["/", ...(await collectFiles(dist)).sort()];
const serviceWorker = template.replace(
  "__PRECACHE_ASSETS__",
  JSON.stringify(assets, null, 2),
);

await writeFile(join(dist, "sw.js"), serviceWorker);
console.log(`Prepared offline cache with ${assets.length} files.`);
