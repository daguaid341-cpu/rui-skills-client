// Run with the version pinned in engine-manifest.json after installing the engine.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {resolveProductionOptions,parseProjectArgs} from '../rui-skills/scripts/production-options.mjs';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rui-timing-'));
const previousState=process.env.RUI_STATE_DIR;
process.env.RUI_STATE_DIR=path.join(temp,'state');
const request=https.request;
https.request=()=>{throw new Error('Timing regression must work offline');};
const line='여기 놓을게요.';
let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++;};
const time=t=>`00:${String(Math.floor(t)).padStart(2,'0')}.${String(Math.round((t%1)*1000)).padStart(3,'0')}`;
function fixture(durations=[3,3,3,3,3,3],dialogue=line){
  const total=durations.reduce((n,x)=>n+x,0);
  const flow=Array.from({length:5},(_,i)=>({action:`男人在桌旁完成第${i+1}个动作。`}));
  flow.push({speaker:'C01',line:dialogue,delivery:'平静'});
  const script={source:'Synthetic timing regression',params:{actionSeconds:durations[0]},episodes:[{ep:1,targetSeconds:total,beatsClaimed:[],hook:'男人为何握着钥匙',cliff:'他等待回答',hookBeat:[1,1],scenes:[{sceneId:'S01',lighting:'夜内',characters:['C01'],props:[],flow}]}]};
  const cuts=flow.map((_,i)=>({beats:[i+1,i+1],seconds:durations[i],size:'medium',camera:'Static Shot',characters:['C01'],props:[],frame:'中景，男人站在桌旁，暖色光照亮面部',shot:'男人在桌旁抬眼，保持原来的站姿',lens:'50mm，T2.8',cameraPosition:'桌旁平视',composition:'三分法',eyeline:'桌面钥匙',focus:'人物面部',stability:'stable'}));
  let cursor=0;
  const starts=durations.map(n=>{const at=cursor;cursor+=n;return at;});
  const alignment='How the reference pictures align with the target video — '+starts.map((at,i)=>`Picture ${i+1} (from Shot ${i+1}) aligns with the ${at.toFixed(2)}-second mark of the target video`).join('; ')+'.';
  const h3Prompt=alignment+'\n\nintegrated_multimodal_description:\n'+cuts.map((_,i)=>`[Shot ${i+1}] ${i?`At ${time(starts[i])}, `:''}Static Shot. The man stands beside the table and looks down.${i===5?` He says <d>[Chinese] ${dialogue}</d>.`:''}`).join('\n')+'\n\noverall_soundscape: Quiet room tone.\n\nnon_diegetic_music: N/A';
  const storyboard={source:script.source,params:{maxSegmentSeconds:30,minCutSeconds:2,maxCutSeconds:Math.max(5,...durations)},episodes:[{ep:1,segments:[{id:'E01-01',sceneIndex:1,blocking:'男人站在桌旁，面向门口',soundscape:'衣料摩擦声',cuts,h3Prompt}]}]};
  return {docs:{script,storyboard},production:{mode:'live-action'}};
}
try{
  const {checkProject,exportText}=await import('../rui-skills/scripts/production.mjs');
  ok(resolveProductionOptions().variableLength===true,'Programmatic default is variable');
  const explicit={variableLength:false,mode:'comic',allowMusic:true};
  ok(resolveProductionOptions(explicit).variableLength===false&&explicit.variableLength===false,'Explicit fixed option is preserved without mutation');
  for(const flags of [[],['--variable-length']])ok(parseProjectArgs(flags).options.variableLength===true,'CLI defaults and legacy variable flag');
  ok(parseProjectArgs(['--fixed-length']).options.variableLength===false,'Explicit fixed CLI');
  for(const flags of [['--fixed-length','--variable-length'],['--variable-length','--fixed-length'],['--out','--fixed-length']]){assert.throws(()=>parseProjectArgs(flags));checks++;}
  assert.throws(()=>resolveProductionOptions({variableLength:'false'}));checks++;
  for(const mode of ['live-action','comic']){
    const project=fixture();project.production.mode=mode;
    const before=JSON.stringify(project);
    const report=await checkProject(project);
    ok(report.errors.length===0,`${mode}: 18 seconds accepted by default: ${report.errors.join(';')}`);
    const text=await exportText(project);
    ok(text.includes('18秒')&&text.includes('镜头6')&&!text.includes('15–18秒')&&text.split(line).length===2,`${mode}: compact order, actual segment duration and exact dialogue`);
    const timed=await exportText(project,{timing:'seconds'});
    ok(timed.includes('15–18秒'),'Explicit seconds show actual endpoint');
    const full=await exportText(project,{detail:'full'});
    ok(full.includes('15–18秒')&&full.includes('构图：三分法'),'Full output preserves timing and technical fields');
    ok(!text.match(/统一提示词：[^\n]*站位：/)&&text.includes('动作起点：男人站在桌旁'),'Blocking belongs to the shot rather than the shared prompt');
    const emotion=structuredClone(project);
    emotion.docs.storyboard.episodes[0].segments[0].cuts[0].shot='男人愤怒地抬眼，眼睛发红，脸色发红。';
    const visible=await exportText(emotion);
    ok(!visible.includes('眼睛发红')&&!visible.includes('脸色发红')&&visible.includes('下颌绷紧')&&visible.includes(line),'Replace visual color descriptions while preserving dialogue');
    ok(JSON.stringify(project)===before,'Validation and export do not pad or mutate inputs');
    ok((await checkProject(project,{variableLength:false})).errors.some(x=>x.includes('30秒')),`${mode}: explicit fixed rejects 18 seconds`);
    await assert.rejects(()=>exportText(project,{variableLength:false}));checks++;
  }
  ok((await checkProject(fixture([4,4,4,4,4,3]))).errors.length===0,'23-second group accepted');
  ok((await checkProject(fixture([5,5,5,5,5,5]),{variableLength:false})).errors.length===0,'30-second fixed group still accepted');
  ok((await checkProject(fixture([5,5,5,5,5,6]))).errors.length>0,'31-second group still rejected');
  ok((await checkProject(fixture(undefined,'내일은 반드시 다시 찾아올 거예요.'))).errors.length>0,'Natural dialogue must still fit its cut');
  const projectDir=path.join(temp,'project with spaces');fs.mkdirSync(projectDir);
  const project=fixture();
  for(const [key,rel]of [['script','script/script.json'],['storyboard','storyboard/storyboard.json']]){
    const file=path.join(projectDir,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(project.docs[key]));
  }
  const cli=fileURLToPath(new URL('../rui-skills/scripts/production.mjs',import.meta.url));
  const run=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',windowsHide:true,timeout:30000});
  const checked=run('check',projectDir);ok(checked.status===0,checked.stderr||checked.stdout);
  const exported=run('export-text',projectDir);ok(exported.status===0&&exported.stdout.includes('18秒')&&exported.stdout.includes('镜头6'),'CLI default export uses compact order and actual duration');
  const timedExport=run('export-text',projectDir,'--timing','seconds');ok(timedExport.status===0&&timedExport.stdout.includes('15–18秒'),'CLI accepts explicit seconds');
  const fullExport=run('export-text',projectDir,'--detail','full');ok(fullExport.status===0&&fullExport.stdout.includes('构图：三分法'),'CLI accepts full output');
  const out=path.join(temp,'reports');const reported=run('report',projectDir,'--out',out);
  ok(reported.status===0&&fs.existsSync(path.join(out,'production-report.html')),'CLI report defaults to variable duration');
  for(const command of ['check','export-text','report'])ok(run(command,projectDir,'--fixed-length').status!==0,`${command}: fixed request remains strict`);
  ok(run('check',projectDir,'--variable-length').status===0,'Legacy flag remains compatible');
  console.log(`PASS ${checks} actual-engine timing checks; offline synthetic data only, no voice or video generation.`);
}finally{
  https.request=request;
  if(previousState===undefined)delete process.env.RUI_STATE_DIR;else process.env.RUI_STATE_DIR=previousState;
  const resolved=path.resolve(temp);
  assert.ok(path.dirname(resolved)===path.resolve(os.tmpdir())&&path.basename(resolved).startsWith('rui-timing-'));
  fs.rmSync(resolved,{recursive:true,force:true});
}
