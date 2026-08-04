import { readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile("tests/rule-cases.json", "utf8"));
const output = `(function (global) {\n  global.MindPulseRuleCases = ${JSON.stringify(source, null, 2)};\n})(window);\n`;
await writeFile("src/rules/browser-cases.js", output, "utf8");
console.log(`Generated browser rule cases: ${source.length} case(s).`);
