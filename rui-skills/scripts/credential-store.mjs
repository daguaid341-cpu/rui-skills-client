import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { saveJson, validDigest } from './gate-common.mjs';

// Secrets travel over pipes, never PowerShell arguments, environment or diagnostics.
function dpapi(operation, value, context) {
  if (process.platform !== 'win32') throw new Error('DPAPI requires Windows');
  const script = `$ErrorActionPreference='Stop'; try {
    Add-Type -AssemblyName System.Security
    $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
    $bytes = [Convert]::FromBase64String($request.value)
    $entropy = [Text.Encoding]::UTF8.GetBytes($request.context)
    if ($request.operation -eq 'protect') {
      $result = [Security.Cryptography.ProtectedData]::Protect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    } elseif ($request.operation -eq 'unprotect') {
      $result = [Security.Cryptography.ProtectedData]::Unprotect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    } else { throw 'Invalid operation' }
    [Console]::Out.Write([Convert]::ToBase64String($result))
  } catch { [Console]::Error.Write('Credential protection failed'); exit 1 }`;
  try {
    const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
    return execFileSync(executable, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
      input: JSON.stringify({operation, value, context}), encoding: 'utf8', windowsHide: true,
      timeout: 10000, maxBuffer: 32768, stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch { throw new Error('无法解锁本机凭证；请由管理员重新发放，禁止降级或打印密钥'); }
}
const context = config => `rui-device-v1\0${config.url}\0${config.device_id}`;
export function unlockToken(config) {
  if (config.token_protection === 'windows-dpapi-user-v1' && !Object.hasOwn(config, 'token')) {
    if (typeof config.protected_token !== 'string' || config.protected_token.length > 16384) throw new Error('Invalid protected credential');
    const token = Buffer.from(dpapi('unprotect', config.protected_token, context(config)), 'base64').toString('utf8');
    if (!validDigest(token)) throw new Error('Invalid protected credential');
    return token;
  }
  if (config.token_protection || !validDigest(config.token)) throw new Error('Invalid credential');
  return config.token;
}
export function protectConfig(config) {
  const token = unlockToken(config);
  if (process.platform !== 'win32') return {...config};
  const result = {...config, token_protection: 'windows-dpapi-user-v1',
    protected_token: dpapi('protect', Buffer.from(token).toString('base64'), context(config))};
  delete result.token;
  if (unlockToken(result) !== token) throw new Error('Credential protection verification failed');
  return result;
}
export function restrictFile(file) {
  if (process.platform !== 'win32') { fs.chmodSync(file, 0o600); return; }
  const script = `$ErrorActionPreference='Stop'; try {
    $file = [Console]::In.ReadToEnd()
    $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = New-Object Security.AccessControl.FileSecurity
    $acl.SetOwner($sid); $acl.SetAccessRuleProtection($true,$false)
    $acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','Allow')))
    [IO.File]::SetAccessControl($file,$acl)
  } catch { [Console]::Error.Write('Credential ACL failed'); exit 1 }`;
  try {
    execFileSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'),
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      {input: path.resolve(file), encoding: 'utf8', windowsHide: true, timeout: 10000, stdio: ['pipe','pipe','pipe']});
  } catch { throw new Error('凭证权限设置失败'); }
}
export function saveCredential(file, config, {exclusive = true} = {}) {
  saveJson(file, protectConfig(config), {exclusive});
  restrictFile(file);
}
