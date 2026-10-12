import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {currentRules,afterTask} from './evolution.mjs';
const skill=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const engineRoot=path.join(skill,'.engine');
export const manifest=JSON.parse(fs.readFileSync(path.join(skill,'engine-manifest.json'),'utf8'));
export function ensureEngine(){
  if(process.platform!==manifest.platform||process.arch!==manifest.arch)throw new Error('当前引擎包支持 Windows x64；请勿在其他平台执行。');
  for(const [name,hash]of Object.entries(manifest.files)){
    const file=path.join(engineRoot,name);
    if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)
      throw new Error('本地引擎缺失或校验失败；运行 node scripts/install-engine.mjs 安装。');
  }
  if(process.versions.node!==manifest.node)throw new Error('请安装 Node.js '+manifest.node+' 后运行此引擎。');
}
export function runEngine(args,input){
  ensureEngine();
  const result=spawnSync(process.execPath,[path.join(engineRoot,'bootstrap.cjs'),...args],{input:input===undefined?undefined:JSON.stringify(input),encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:12*1024*1024,
    env:{...process.env,NODE_OPTIONS:'',NODE_PATH:'',BYTENODE_DEBUG:''}});
  if(result.error)throw new Error('本地引擎未完成执行');
  return result;
}
export async function productionRequest(payload){
  const start=Date.now(),result=runEngine(['request'],{...payload,rules:currentRules()});
  let value;try{value=JSON.parse(result.stdout);}catch{throw new Error('本地引擎返回无效结果');}
  await afterTask({mode:payload.kind==='turnaround'?'character':payload.options?.mode||payload.project?.production?.mode,command:payload.kind==='turnaround'?'turnaround':payload.command,ok:value.ok===true,elapsed:Date.now()-start});
  return value;
}
