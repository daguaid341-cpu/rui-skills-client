import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const stateRoot = path.join(skillRoot, '.local-verifier');
export const endpoint = '/v1/skills/authorize';
export const maxBytes = 4096;
export const validDigest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const validDevice = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value)
  && !['constructor', 'prototype', '__proto__'].includes(value);
export const validPort = value => Number.isInteger(value) && value > 0 && value <= 65535;
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
export function saveJson(file, value, {exclusive = false} = {}) {
  if (exclusive) {
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {mode: 0o600, flag: 'wx'}); return;
  }
  const temporary = file + '.' + randomBytes(8).toString('hex') + '.tmp';
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', {mode: 0o600, flag: 'wx'});
    fs.renameSync(temporary, file);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
export function httpsEndpoint(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.pathname !== endpoint || url.search || url.hash || url.username || url.password)
    throw new Error('授权地址必须是完整的 HTTPS /v1/skills/authorize 接口');
  return url;
}
export function fingerprint(root = skillRoot) {
  const hash = createHash('sha256');
  const extensions = new Set(['.md', '.mjs', '.js', '.py', '.yaml', '.yml', '.json', '.svg']);
  const walk = dir => fs.readdirSync(dir, {withFileTypes: true})
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .forEach(entry => {
      if (entry.name.startsWith('.') || ['node_modules', '__pycache__', 'output'].includes(entry.name)) return;
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('技能目录不支持符号链接');
      if (entry.isDirectory()) walk(file);
      else if (extensions.has(path.extname(file))) {
        hash.update(path.relative(root, file).split(path.sep).join('/') + '\0');
        hash.update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')); hash.update('\0');
      }
    });
  walk(root); return hash.digest('hex');
}
