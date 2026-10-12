#!/usr/bin/env node
// Client only. No local authorization service, permission switch or offline fallback.
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { unlockToken, saveCredential } from './credential-store.mjs';
import { metricsEnabled } from './usage-metrics.mjs';
import { stateRoot, maxBytes, readJson, saveJson, fingerprint, httpsEndpoint, validDigest, validDevice } from './gate-common.mjs';
export { skillRoot, stateRoot, fingerprint } from './gate-common.mjs';
const script = fileURLToPath(import.meta.url);
export const clientFile = path.join(stateRoot, 'client.json');
function validateClient(config) {
  if (!config || config.schema_version !== 2 || !validDevice(config.device_id))
    throw new Error('客户端凭证格式无效');
  return httpsEndpoint(config.url);
}
export function importClient(source, target = clientFile, {replace = false} = {}) {
  const config = readJson(source);
  validateClient(config);
  if (config.ca_file) throw new Error('导入自定义CA须由管理员单独配置绝对路径');
  fs.mkdirSync(path.dirname(target), {recursive: true, mode: 0o700});
  saveCredential(target, config, {exclusive: !replace});
}
export async function authorize({configPath = process.env.RUI_SKILL_GATE_CONFIG || clientFile,
  digest = fingerprint(), timeoutMs = 5000} = {}) {
  return serviceRequest(null, {configPath, digest, timeoutMs});
}
export async function productionRequest(payload, options = {}) {
  return (await serviceRequest(payload, {...options, timeoutMs: options.timeoutMs ?? 20000})).result;
}
async function serviceRequest(payload, {configPath = process.env.RUI_SKILL_GATE_CONFIG || clientFile,
  digest = fingerprint(), timeoutMs = 5000} = {}) {
  let config, url, ca, token;
  try {
    config = readJson(configPath); url = validateClient(config);
    token = unlockToken(config);
    if (payload !== null) url.pathname = '/v1/skills/production';
    if (config.ca_file) {
      if (!path.isAbsolute(config.ca_file)) throw new Error();
      ca = fs.readFileSync(config.ca_file);
    }
  } catch { throw new Error('统一授权客户端未配置或凭证无效，禁止使用 Rui-Skills'); }
  const requestId = randomBytes(16).toString('hex');
  const body = JSON.stringify({skill: 'rui-skills', purpose: payload === null ? 'storyboard' : 'production', device_id: config.device_id,
    fingerprint: digest, request_id: requestId, ...(payload === null ? {} : {payload, usage_metrics: metricsEnabled(configPath)})});
  if (Buffer.byteLength(body) > 2 * 1024 * 1024) throw new Error('项目超过单次2MiB限制，请按分集拆分');
  const response = await new Promise((resolve, reject) => {
    const request = https.request(url, {method: 'POST', agent: false, rejectUnauthorized: true, ...(ca ? {ca} : {}), headers: {
      Authorization: `Bearer ${token}`, 'X-Rui-Device': config.device_id,
      'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
    }}, res => {
      const chunks = []; let size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > (payload === null ? maxBytes : 8 * 1024 * 1024)) request.destroy(new Error('invalid_response'));
        else chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('denied'));
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('invalid_response')); }
      });
    });
    const timer = setTimeout(() => request.destroy(new Error('timeout')), timeoutMs);
    request.on('error', reject); request.on('close', () => clearTimeout(timer)); request.end(body);
  }).catch(() => { throw new Error('统一授权未通过（拒绝、连接或证书失败、响应无效），禁止使用 Rui-Skills'); });
  const now = Math.floor(Date.now() / 1000);
  if (!response || response.allowed !== true || response.skill !== 'rui-skills' || response.device_id !== config.device_id ||
      response.fingerprint !== digest || response.request_id !== requestId || !Number.isInteger(response.expires_at) ||
      response.expires_at <= now || response.expires_at > now + 35)
    throw new Error('统一授权响应不匹配或已过期，禁止使用 Rui-Skills');
  return response;
}
export function requireAuthorization() {
  try {
    execFileSync(process.execPath, [script, 'verify'], {
      encoding: 'utf8', windowsHide: true, timeout: 16000, maxBuffer: 16384, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch { throw new Error('Rui-Skills 本次授权未通过，已停止执行。请检查统一服务器、设备凭证与批准版本。'); }
}
async function main(args) {
  const [command, ...rest] = args;
  if (command === 'verify' && rest.length === 0) console.log(JSON.stringify(await authorize()));
  else if (command === 'fingerprint' && rest.length === 0) console.log(fingerprint());
  else if (command === 'configure-client' && rest[0] === '--from' &&
      (rest.length === 2 || (rest.length === 3 && rest[2] === '--replace'))) {
    importClient(path.resolve(rest[1]), process.env.RUI_SKILL_GATE_CONFIG || clientFile, {replace: rest[2] === '--replace'});
    console.log('客户端凭证已导入；仍须在线验证通过后才能使用。');
  } else if (command === 'protect-local' && rest.length === 0) {
    if (process.platform !== 'win32') throw new Error('此命令仅用于Windows；其他系统需使用权限受限的凭证文件');
    const file = process.env.RUI_SKILL_GATE_CONFIG || clientFile;
    const config = readJson(file); validateClient(config);
    saveCredential(file, config, {exclusive: false});
    console.log('本机凭证已加密并限制文件权限；没有输出或保留明文备份。');
  } else {
    console.log('Client only: verify | fingerprint | configure-client --from FILE [--replace] | protect-local');
    if (command && !['--help', '-h'].includes(command)) throw new Error('客户端不提供本机授权或管理命令');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  main(process.argv.slice(2)).catch(() => {
    console.error('操作失败或授权未通过；请检查服务器凭证与配置。不会启动本机服务、离线放行或输出密钥。');
    process.exitCode = 1;
  });
}
