#!/usr/bin/env node
// Open client: production executes in the local compiled engine.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseProjectArgs, resolveProductionOptions } from './production-options.mjs';
import { ensureEngine, productionRequest } from './local-engine.mjs';

export const FILES = {outline: 'outline/outline.json', cast: 'characters/cast.json', art: 'art/art.json', script: 'script/script.json', storyboard: 'storyboard/storyboard.json'};
const MODULES = ['novel-outline','novel-characters','novel-art','novel-script','novel-storyboard'];
function read(file, text = false) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) throw new Error('输入必须是2MiB以内的文件');
  const value = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  return text ? value : JSON.parse(value);
}
export function loadProject(directory) {
  const root = fs.realpathSync(directory), docs = {};
  const readProjectFile = file => {
    const resolved = fs.realpathSync(file);
    if (!resolved.startsWith(root + path.sep)) throw new Error('项目文件链接指向项目目录之外，已停止读取');
    return read(resolved);
  };
  for (const [key, rel] of Object.entries(FILES)) {
    const file = path.join(root, rel);
    if (fs.existsSync(file)) docs[key] = readProjectFile(file);
  }
  if (!Object.keys(docs).length) throw new Error('没有制作资料');
  const config = path.join(root, 'production.json');
  return {docs, production: fs.existsSync(config) ? readProjectFile(config) : {}};
}
export async function checkProject(project, options = {}) {
  const result = await productionRequest({command: 'check', project: {docs: project.docs, production: project.production}, options: resolveProductionOptions(options)});
  if (!result?.report) throw new Error(result?.errors?.join('；') || '引擎结果无效');
  return result.report;
}
export async function exportText(project, options = {}) {
  const result = await productionRequest({command: 'export-text', project: {docs: project.docs, production: project.production}, options: resolveProductionOptions(options)});
  if (!result?.ok || typeof result.text !== 'string') throw new Error(result?.report?.errors?.join('；') || result?.errors?.join('；') || '导出失败');
  return result.text;
}
function save(file, content) {
  const target = path.resolve(file);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  // Refuse overwrite; callers choose a new result path explicitly.
  fs.writeFileSync(target, content, {encoding: 'utf8', flag: 'wx'});
  console.log(target);
}
export async function main(argv) {
  const [command, target, ...args] = argv;
  if (!command || ['--help','-h'].includes(command)) {
    console.log('Rui-Skills 本地制作：check|report|export-text <项目目录> [--mode live-action|comic] [--variable-length|--fixed-length] [--allow-music] [--out 路径]\n默认按实际时长校验，每组不超过30秒；仅 --fixed-length 要求每组精确30秒。\nrun <module> <action> <input> [--script FILE] [--outline FILE] [--cast FILE] [--art FILE] [--html] [--out FILE]'); return;
  }
  if (!target) throw new Error('缺少项目或模块');
  // Verify the local runtime before reading project inputs.
  ensureEngine();
  let result, output;
  if (command === 'run') {
    if (!MODULES.includes(target)) throw new Error('模块无效');
    const [action, input, ...flags] = args;
    const context = {}, settings = {};
    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i];
      if (flag === '--html') { settings.html = true; continue; }
      if (flag === '--md') { settings.html = false; continue; }
      const value = flags[++i];
      if (!value || value.startsWith('--')) throw new Error('缺少参数值');
      if (['--script','--outline','--cast','--art'].includes(flag)) context[flag.slice(2)] = read(value);
      else if (flag === '--source-text') context.sourceText = read(value, true);
      else if (flag === '--lang') context.lang = value;
      else if (flag === '--stage') settings.stage = value;
      else if (flag === '--protocol') settings.protocol = value;
      else if (flag === '--per-volume') settings.perVolume = Number(value);
      else if (flag === '--eps') { const m = /^(\d+)(?:-(\d+))?$/.exec(value); if (!m) throw new Error('集数范围无效'); settings.episodes = [+m[1], +(m[2] || m[1])]; }
      else if (flag === '--out') output = value;
      else throw new Error('不支持的参数；此入口不接受任意命令或模型配置');
    }
    const document = action === 'slug' ? input : action === 'ui-template' ? null : read(input, action === 'chunk');
    result = await productionRequest({command:'module', module:target, action, document, context, settings});
  } else {
    if (!['check','report','export-text'].includes(command)) throw new Error('未知制作命令');
    const parsed = parseProjectArgs(args);
    const options = parsed.options;
    output = parsed.output;
    result = await productionRequest({command, project: loadProject(target), options});
    if (command === 'report') output = path.join(output || path.join(target,'reports'), 'production-report.html');
  }
  if (!result?.ok) {
    if (result?.guidance?.id === 'check-input-first') console.error('云端提示：请先对照数据契约检查必填字段，并先运行 check，再导出。');
    throw new Error(result?.report?.errors?.join('\n') || result?.errors?.join('\n') || '本地制作失败');
  }
  const content = result.text ?? result.html ?? JSON.stringify(result.data ?? result, null, 2);
  if (output) save(output, content);
  else process.stdout.write(content + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}

