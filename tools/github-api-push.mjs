import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const [owner, repo, message = "Update MindPulse self-review and reports"] = process.argv.slice(2);
const token = process.env.GITHUB_TOKEN;

if (!owner || !repo) {
  console.error("Usage: node tools/github-api-push.mjs <owner> <repo> [message]");
  process.exit(1);
}

if (!token) {
  console.error("GITHUB_TOKEN is required.");
  process.exit(1);
}

const root = process.cwd();
const excludedDirs = new Set(["node_modules", ".git", ".codex-plugin-validation-yaml", ".edge-soft-profile"]);
const excludedFiles = [/\.zip$/i, /^review_.*\.png$/i];

function shouldSkip(name, fullPath) {
  const parts = relative(root, fullPath).split(sep);
  if (parts.some((part) => excludedDirs.has(part))) return true;
  return excludedFiles.some((pattern) => pattern.test(name));
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (shouldSkip(entry.name, fullPath)) continue;
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "mindpulse-upload-script",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const hint = body?.message || response.statusText;
    throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${hint}`);
  }
  return body;
}

async function optionalGithub(path, options = {}) {
  try {
    return await github(path, options);
  } catch (error) {
    if (String(error.message).includes("(404)")) return null;
    if (String(error.message).includes("(409)") && String(error.message).includes("Git Repository is empty")) return null;
    throw error;
  }
}

const repoInfo = await github(`/repos/${owner}/${repo}`);
const branch = repoInfo.default_branch || "main";
let ref = await optionalGithub(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);

if (!ref) {
  const initialReadme = readFileSync(join(root, "README.md"), "utf8");
  await github(`/repos/${owner}/${repo}/contents/README.md`, {
    method: "PUT",
    body: JSON.stringify({
      message: "Initialize repository",
      content: Buffer.from(initialReadme, "utf8").toString("base64"),
      branch
    })
  });
  ref = await github(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
}

let parentSha = null;
let baseTree = null;

if (ref?.object?.sha) {
  parentSha = ref.object.sha;
  const parentCommit = await github(`/repos/${owner}/${repo}/git/commits/${parentSha}`);
  baseTree = parentCommit.tree.sha;
}

const files = walk(root).sort((a, b) => relative(root, a).localeCompare(relative(root, b), "zh-CN"));
const tree = [];

for (const file of files) {
  const rel = relative(root, file).split(sep).join("/");
  const content = readFileSync(file);
  const blob = await github(`/repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({
      content: content.toString("base64"),
      encoding: "base64"
    })
  });
  tree.push({
    path: rel,
    mode: "100644",
    type: "blob",
    sha: blob.sha
  });
}

const createdTree = await github(`/repos/${owner}/${repo}/git/trees`, {
  method: "POST",
  body: JSON.stringify({
    ...(baseTree ? { base_tree: baseTree } : {}),
    tree
  })
});

const commit = await github(`/repos/${owner}/${repo}/git/commits`, {
  method: "POST",
  body: JSON.stringify({
    message,
    tree: createdTree.sha,
    parents: parentSha ? [parentSha] : []
  })
});

if (ref) {
  await github(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false })
  });
} else {
  await github(`/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha })
  });
}

const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
console.log(`Uploaded ${files.length} files (${totalBytes} bytes) to ${owner}/${repo}@${branch}`);
console.log(`Commit: ${commit.sha}`);
