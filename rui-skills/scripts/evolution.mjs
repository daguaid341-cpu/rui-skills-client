import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {fileURLToPath} from 'node:url';
import {verify,randomUUID} from 'node:crypto';
import {readState,writeState} from './state.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export const config=JSON.parse(fs.readFileSync(path.join(here,'../evolution-config.json'),'utf8'));
export const RULE_IDS=['continuity','timing','identity','skin','framing','angle'];
const MODES=['live-action','comic','character'];
const COMMANDS=['check','report','export-text','module','turnaround','character'];
export const preferences=()=>{const p=readState('consent.json',{});return {metrics:p?.metrics===true,feedback:p?.feedback===true,updates:p?.updates===true};};
export function consent(feature,enabled){if(!['metrics','feedback','updates'].includes(feature)||typeof enabled!=='boolean')throw new Error('无效偏好');writeState('consent.json',{...preferences(),[feature]:enabled});}
export function validEvent(event){
  if(!event||Object.keys(event).some(k=>!['schema','kind','id','mode','command','outcome','duration','issue','task_id','attempt','applied'].includes(k))||event.schema!==1||
      !['metric','feedback'].includes(event.kind)||!MODES.includes(event.mode)||!COMMANDS.includes(event.command)||
      !/^[a-f0-9-]{36}$/.test(event.id)||!['ok','failed'].includes(event.outcome)||!['fast','normal','slow'].includes(event.duration)||
      (event.kind==='feedback'?(!RULE_IDS.includes(event.issue)||typeof event.task_id!=='string'||!/^[a-f0-9-]{36}$/.test(event.task_id)||!Number.isInteger(event.attempt)||event.attempt<1||event.attempt>20||typeof event.applied!=='boolean'):
        ['issue','task_id','attempt','applied'].some(k=>event[k]!==undefined)))throw new Error('反馈只接受固定类别和实际尝试结果，不接受文本或私人材料');
  return event;
}
export function verifyPack(envelope,key=config.public_key){
  if(!envelope||typeof envelope.payload!=='string'||envelope.payload.length>16384||typeof envelope.signature!=='string'||
      !verify(null,Buffer.from(envelope.payload),key,Buffer.from(envelope.signature,'base64')))throw new Error('更新签名无效');
  const p=JSON.parse(envelope.payload);
  if(Object.keys(p).some(k=>!['schema','revision','created_at','rules','validation'].includes(k))||p.schema!==1||!Number.isSafeInteger(p.revision)||p.revision<1||
      !Number.isFinite(Date.parse(p.created_at))||!Array.isArray(p.rules)||p.rules.length>6||new Set(p.rules).size!==p.rules.length||
      p.rules.some(id=>!RULE_IDS.includes(id))||p.validation!=='preset-regression-passed')throw new Error('更新内容无效');
  return p;
}
export function currentRules(key=config.public_key){try{return verifyPack(readState('active-rules.json',null),key).rules;}catch{return [];}}
export function applyPack(envelope,key=config.public_key){
  const pack=verifyPack(envelope,key),highest=readState('update-history.json',{highest:0}).highest;
  if(pack.revision<highest)throw new Error('拒绝远程降级');
  const old=readState('active-rules.json',null);
  if(old){let prior;try{prior=verifyPack(old,key);}catch{}if(prior?.revision===pack.revision)return false;if(prior)writeState('previous-rules.json',old);}
  writeState('active-rules.json',envelope);writeState('update-history.json',{highest:Math.max(pack.revision,highest)});return true;
}
export function rollback(key=config.public_key){
  const previous=readState('previous-rules.json',null);
  if(!previous){writeState('active-rules.json',null);}else{verifyPack(previous,key);const current=readState('active-rules.json',null);writeState('active-rules.json',previous);writeState('previous-rules.json',current);}
  consent('updates',false);return currentRules(key);
}
function request(route,event,timeoutMs=15000){
  const url=new URL(route,config.url);
  if(url.protocol!=='https:'||url.origin!==new URL(config.url).origin)throw new Error('无效云端地址');
  return new Promise((resolve,reject)=>{
    const body=event?JSON.stringify(event):null;
    const req=https.request(url,{method:body?'POST':'GET',agent:false,rejectUnauthorized:true,headers:body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}},res=>{
      const chunks=[];let n=0;res.on('data',c=>{n+=c.length;if(n>32768)req.destroy(new Error('响应过大'));else chunks.push(c);});
      res.on('error',reject);res.on('end',()=>{if(res.statusCode!==200)return reject(new Error('云端暂不可用'));try{resolve(JSON.parse(Buffer.concat(chunks)));}catch{reject(new Error('响应无效'));}});
    });
    const timer=setTimeout(()=>req.destroy(new Error('云端超时')),timeoutMs);req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end(body);
  });
}
export async function sync({timeoutMs=15000}={}){if(!preferences().updates)throw new Error('尚未同意更新检查');return applyPack(await request('/v2/updates',null,timeoutMs));}
export async function submit(event,{timeoutMs=15000}={}){validEvent(event);const pref=preferences();if(!(event.kind==='metric'?pref.metrics:pref.feedback))return false;await request('/v2/events',event,timeoutMs);return true;}
export async function afterTask({mode='live-action',command='module',ok=false,elapsed=0}){
  const p=preferences();
  if(p.metrics){try{await submit({schema:1,kind:'metric',id:randomUUID(),mode:MODES.includes(mode)?mode:'live-action',command:COMMANDS.includes(command)?command:'module',outcome:ok?'ok':'failed',duration:elapsed<1000?'fast':elapsed<5000?'normal':'slow'},{timeoutMs:2500});}catch{/* Optional metrics cannot fail a local task. */}}
  if(p.updates){const last=readState('last-update.json',{at:0});if(Date.now()-last.at>3600000){try{await sync({timeoutMs:2500});writeState('last-update.json',{at:Date.now()});}catch{}}}
}
async function main(args){
  const [cmd,feature,flag]=args;
  if(cmd==='status')console.log(JSON.stringify({consent:preferences(),active_rules:currentRules()},null,2));
  else if(cmd==='enable'&&flag==='--consent'&&args.length===3){consent(feature,true);console.log('已保存明确同意。');}
  else if(cmd==='disable'&&args.length===2){consent(feature,false);console.log('已关闭。');}
  else if(cmd==='sync'){console.log(await sync()?'已安装验证通过的更新。':'已是当前版本。');}
  else if(cmd==='rollback'){console.log(JSON.stringify({rules:rollback(),automatic_updates:false}));}
  else if(cmd==='new-task'&&args.length===1){console.log(randomUUID());}
  else if(cmd==='feedback'&&RULE_IDS.includes(feature)&&MODES.includes(flag)&&args.length===7){
    const [,issue,mode,outcome,attempt,task_id,variant]=args;
    if(!['baseline','enhanced'].includes(variant))throw new Error('预设必须为实际使用的 baseline 或 enhanced');
    const sent=await submit({schema:1,kind:'feedback',id:randomUUID(),mode,command:mode==='character'?'character':'check',outcome,duration:'fast',issue,task_id,attempt:Number(attempt),applied:variant==='enhanced'});
    if(!sent)throw new Error('尚未单独同意提交反馈');console.log('固定类别反馈已提交，不含自由文本。');
  }else console.log('status | enable metrics|feedback|updates --consent | disable metrics|feedback|updates | sync | rollback | new-task | feedback ISSUE MODE ok|failed ATTEMPT TASK_UUID baseline|enhanced');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
