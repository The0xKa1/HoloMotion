import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function walk(directory, predicate) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolute, predicate)));
    } else if (entry.isFile() && predicate(absolute)) {
      files.push(absolute);
    }
  }

  return files;
}

const sourceFiles = await walk(path.join(root, "src"), (file) => file.endsWith(".ts") || file.endsWith(".css"));
const distFiles = await walk(path.join(root, "dist"), (file) => file.endsWith(".js"));
const sourceText = (await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")))).join("\n");

const requiredPatterns = [
  ["meters unit contract", /unit:\s*"meters"/],
  ["right-hand coordinate contract", /handedness:\s*"right-hand"/],
  ["camera mirror transform", /scaleX\(-1\)/],
  ["RAF render pull loop", /requestAnimationFrame/],
  ["Quaternion smoothing", /\.slerp\(/],
  ["seed switch disposal", /disposeSceneResources\(/],
  ["frame buffer consumption", /pushPacket\(packet/],
];

const forbiddenPatterns = [
  ["Euler rotation transport", /\bEuler\b/],
  ["React high-frequency useState", /\buseState\b/],
  ["Vue high-frequency ref", /\bref\(/],
];

const failures = [];

for (const [label, pattern] of requiredPatterns) {
  if (!pattern.test(sourceText)) failures.push(`Missing guardrail: ${label}`);
}

for (const [label, pattern] of forbiddenPatterns) {
  if (pattern.test(sourceText)) failures.push(`Forbidden pattern found: ${label}`);
}

for (const file of distFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    failures.push(`Syntax check failed for ${path.relative(root, file)}\n${result.stderr || result.stdout}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Guardrails passed for ${sourceFiles.length} source files and ${distFiles.length} built modules`);
