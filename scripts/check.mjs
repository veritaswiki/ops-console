#!/usr/bin/env node
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { APP_VERSION, loadConfig, PACKAGE_ROOT, validateConfig } from '../src/config.mjs';

const execFileAsync = promisify(execFile);

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'data', '.work']);
const IGNORED_FILES = new Set(['config.local.json', 'ops-console.jsonl', 'audit.jsonl']);

const PII_PATTERNS = [
  { name: 'non-example-cgnat-ip', re: /\b100\.(6[5-9]|[7-9]\d|1[0-2]\d)\.\d{1,3}\.\d{1,3}\b/ },
  { name: 'real-tailnet-domain', re: /tail[0-9a-f]{4,}\.ts\.net/i },
  { name: 'private-key-header', re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ },
  { name: 'github-pat', re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { name: 'api-secret-key', re: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: 'tailscale-auth-key', re: /\btskey-[A-Za-z0-9-]{12,}\b/ },
  { name: 'aws-access-key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'jwt-token', re: /\beyJ[A-Za-z0-9_-]{16,}\.eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/ },
  { name: 'probe-token-literal', re: /\bops_prb_[a-f0-9]{32,}\b/ },
  { name: 'personal-home-path', re: /\/(?:home|Users)\/(?!YOUR_USER\b|ops-user\b|demo\b|runner\b|example\b|ubuntu\b|user\b|<|\*)[a-zA-Z0-9._-]{2,}\// },
];

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

async function walkFiles(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(full, out);
    } else if (entry.isFile() && !IGNORED_FILES.has(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const files = await walkFiles(PACKAGE_ROOT);
  const failures = [];

  const jsFiles = files.filter((f) => f.endsWith('.mjs') || f.endsWith('.js'));
  for (const file of jsFiles) {
    try {
      await execFileAsync(process.execPath, ['--check', file]);
    } catch (err) {
      failures.push(`Syntax error in ${path.relative(PACKAGE_ROOT, file)}: ${err.stderr || err.message}`);
    }
  }
  process.stdout.write(`[check] Syntax validated: ${jsFiles.length} JS/MJS files\n`);

  if (!SEMVER_RE.test(APP_VERSION)) {
    failures.push(`Invalid SemVer in package.json: ${APP_VERSION}`);
  }
  const versionChecks = [
    { file: 'probe/package.json', re: new RegExp(`"version"\\s*:\\s*"${APP_VERSION.replace(/\./g, '\\.')}"`) },
    { file: 'probe/ops-probe.mjs', re: new RegExp(`PROBE_VERSION\\s*=\\s*'${APP_VERSION.replace(/\./g, '\\.')}'`) },
    { file: 'Dockerfile', re: new RegExp(`version="${APP_VERSION.replace(/\./g, '\\.')}"`) },
    { file: 'docker-compose.yml', re: new RegExp(`ops-console:${APP_VERSION.replace(/\./g, '\\.')}`) },
    { file: 'deploy/install.sh', re: new RegExp(`v${APP_VERSION.replace(/\./g, '\\.')}`) },
    { file: 'deploy/probe/install-probe.sh', re: new RegExp(`v${APP_VERSION.replace(/\./g, '\\.')}`) },
  ];
  for (const vc of versionChecks) {
    try {
      const txt = await fs.readFile(path.join(PACKAGE_ROOT, vc.file), 'utf8');
      if (!vc.re.test(txt)) {
        failures.push(`Version mismatch in ${vc.file}: expected ${APP_VERSION}`);
      }
    } catch (err) {
      failures.push(`Version check unreadable (${vc.file}): ${err.message}`);
    }
  }
  process.stdout.write(`[check] Version consistency validated: v${APP_VERSION}\n`);

  const examplePath = path.join(PACKAGE_ROOT, 'ops-console.config.example.json');
  try {
    const raw = JSON.parse(await fs.readFile(examplePath, 'utf8'));
    const result = validateConfig(raw);
    if (!result.valid) {
      failures.push(`Example config invalid: ${result.errors.join('; ')}`);
    }
    loadConfig({ cli: { configPath: examplePath }, env: {} });
    process.stdout.write('[check] Example config schema validated\n');
  } catch (err) {
    failures.push(`Example config failed to load: ${err.message}`);
  }

  const textExts = new Set(['.mjs', '.js', '.json', '.md', '.yml', '.yaml', '.sh', '.service', '.html', '.css', '.svg', '']);
  let scanned = 0;
  for (const file of files) {
    const rel = path.relative(PACKAGE_ROOT, file);
    if (rel === 'scripts/check.mjs') continue;
    const ext = path.extname(file).toLowerCase();
    if (!textExts.has(ext) && path.basename(file) !== 'Dockerfile' && path.basename(file) !== 'LICENSE') continue;
    const content = await fs.readFile(file, 'utf8');
    scanned += 1;
    for (const rule of PII_PATTERNS) {
      if (rule.re.test(content)) {
        failures.push(`PII/Secret rule [${rule.name}] matched in ${rel}`);
      }
    }
  }
  process.stdout.write(`[check] Privacy & secret scan clean across ${scanned} files\n`);

  const cssPath = path.join(PACKAGE_ROOT, 'public', 'styles.css');
  try {
    const css = await fs.readFile(cssPath, 'utf8');
    if (/transition\s*:\s*all\b/i.test(css)) {
      failures.push('public/styles.css contains forbidden "transition: all"');
    }
  } catch {
    // ignore if styles.css not yet created
  }

  if (failures.length > 0) {
    process.stderr.write(`\n[check] FAILED (${failures.length}):\n- ${failures.join('\n- ')}\n`);
    process.exit(1);
  }
  process.stdout.write('[check] All checks passed\n');
}

main();
