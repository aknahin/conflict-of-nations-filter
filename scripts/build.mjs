import { mkdir, readFile, readdir, rm, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const chromeDir = path.join(distDir, "chrome");
const firefoxDir = path.join(distDir, "firefox");
const packagesDir = path.join(distDir, "packages");

const commonManifest = {
  name: "Conflict of Nations Game Filter",
  description: "Hide game cards that do not match your active speed, age, and fill filters.",
  version: "0.1.0",
  manifest_version: 3,
  action: {
    default_popup: "popup/popup.html",
  },
  permissions: ["storage", "tabs"],
  host_permissions: [
    "*://*.conflictnations.com/*",
    "*://conflictnations.com/*",
    "*://*.conflict-of-nations.com/*",
    "*://conflict-of-nations.com/*",
  ],
  content_scripts: [
    {
      matches: [
        "*://*.conflictnations.com/*",
        "*://conflictnations.com/*",
        "*://*.conflict-of-nations.com/*",
        "*://conflict-of-nations.com/*",
      ],
      js: ["shared/shared.js", "content/content.js"],
      run_at: "document_idle",
    },
  ],
};

const firefoxManifest = {
  ...commonManifest,
  browser_specific_settings: {
    gecko: {
      id: "conflict-of-nations-filter@example.com",
      strict_min_version: "109.0",
    },
  },
};

async function copyTree(sourceDir, targetDir) {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "dist" || entry.name === "tests" || entry.name === "scripts" || entry.name === ".git" || entry.name === ".DS_Store") {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyTree(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath);
    }
  }
}

async function writeManifest(targetDir, manifest) {
  await writeFile(path.join(targetDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

async function zipDirectory(sourceDir, archivePath) {
  await mkdir(path.dirname(archivePath), { recursive: true });
  await rm(archivePath, { force: true });
  await execFileAsync("zip", ["-qr", archivePath, "."], { cwd: sourceDir });
}

async function buildTarget(targetDir, manifest, archivePath) {
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });

  const requiredEntries = [
    "shared",
    "content",
    "popup",
  ];

  for (const entry of requiredEntries) {
    await copyTree(path.join(rootDir, entry), path.join(targetDir, entry));
  }

  await writeManifest(targetDir, manifest);
  await zipDirectory(targetDir, archivePath);
}

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(packagesDir, { recursive: true });

  await buildTarget(chromeDir, commonManifest, path.join(packagesDir, "conflict-of-nations-filter-chrome.zip"));
  await buildTarget(firefoxDir, firefoxManifest, path.join(packagesDir, "conflict-of-nations-filter-firefox.xpi"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
