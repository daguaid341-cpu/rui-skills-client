import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, saveJson, stateRoot, httpsEndpoint, validDevice } from './gate-common.mjs';

export function metricsEnabled(configPath) {
  try {
    const client = readJson(configPath), preference = readJson(path.join(path.dirname(configPath), 'usage-consent.json'));
    return preference.schema_version === 1 && preference.enabled === true &&
      preference.url === client.url && preference.device_id === client.device_id;
  } catch { return false; }
}
export function setMetrics(configPath, enabled) {
  const client = readJson(configPath);
  httpsEndpoint(client.url);
  if (!validDevice(client.device_id)) throw new Error('无效设备');
  saveJson(path.join(path.dirname(configPath), 'usage-consent.json'), {
    schema_version: 1, enabled, url: client.url, device_id: client.device_id,
  });
}
const file = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === file) {
  try {
    const args = process.argv.slice(2), config = process.env.RUI_SKILL_GATE_CONFIG || path.join(stateRoot, 'client.json');
    if (args.join(' ') === 'enable --consent') setMetrics(config, true);
    else if (args.join(' ') === 'disable') setMetrics(config, false);
    else if (args.join(' ') !== 'status') throw new Error('用法：status | enable --consent | disable');
    console.log(metricsEnabled(config) ? '已同意使用指标：服务端聚合操作类别、成功/失败及耗时档位；不保存剧情。' : '使用指标已关闭；在线制作仍可正常使用。');
  } catch { console.error('用法：status | enable --consent | disable；请先导入有效客户端配置。'); process.exitCode = 1; }
}
