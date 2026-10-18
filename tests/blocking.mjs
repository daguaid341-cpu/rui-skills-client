import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {validatePlan,inspectPlan,jointsFor,propTransform,stateProps,makeCamera} from '../rui-skills/scripts/blocking/model.mjs';
import {planSvg,cameraSvg,rasterize,reviewHtml} from '../rui-skills/scripts/blocking/render.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=JSON.parse(fs.readFileSync(path.join(root,'rui-skills/assets/blocking-example.json'),'utf8'));
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
const modify=fn=>{const p=structuredClone(input);fn(p);return p;};
const rejects=(fn,pattern)=>assert.throws(()=>validatePlan(modify(fn)),pattern);
const plan=validatePlan(input);
const require=createRequire(path.join(root,'rui-skills/scripts/blocking/package.json'));
test('validation leaves original input unchanged',()=>assert.deepEqual(input,JSON.parse(fs.readFileSync(path.join(root,'rui-skills/assets/blocking-example.json'),'utf8'))));
test('path traversal IDs rejected',()=>rejects(p=>p.states[0].id='../escape',/标识/));
test('duplicate and cross-kind IDs rejected',()=>rejects(p=>p.props[0].id=p.characters[0].id,/重复/));
test('non-finite camera rejected',()=>rejects(p=>p.shots[0].camera.position[0]=NaN,/有限/));
test('unknown shot state rejected',()=>rejects(p=>p.shots[0].stateId='missing',/stateId/));
test('malformed holder rejected',()=>rejects(p=>p.props[0].holder='A',/holder/));
test('unknown holder rejected',()=>rejects(p=>p.props[0].holder={characterId:'missing',hand:'right'},/holder角色/));
test('missing placements rejected',()=>rejects(p=>p.states[0].placements.pop(),/所有角色/));
test('extreme raster aspect rejected',()=>rejects(p=>p.shots[0].camera.aspect=[100,.001],/宽高比/));
test('unsafe override fields rejected',()=>rejects(p=>p.states[0].propOverrides=[{id:p.props[0].id,color:'url(http://example.com)'}],/只可覆盖/));
test('invalid joint coordinates rejected',()=>rejects(p=>p.states[0].placements[0].joints={handL:[20,0,0]},/关节/));
test('180 degree prop rotation accepted',()=>validatePlan(modify(p=>p.props[0].rotationDegrees=[0,180,0])));
test('demo passes supported geometry checks',()=>assert.equal(inspectPlan(plan).warnings.length,0));
test('obstacle through actor triggers warning',()=>{
  const p=validatePlan(modify(p=>{p.props[0].position=[...p.states[0].placements[0].position];p.props[0].position[1]=.7;p.props[0].size=[1,1.4,1];}));
  assert.ok(inspectPlan(p).warnings.some(x=>x.code==='body-obstacle'));
});
test('path through thin obstacle triggers warning',()=>{
  const p=validatePlan(modify(p=>{p.states[0].paths=[{characterId:p.characters[0].id,points:[[-2,0,0],[2,0,0]]}];p.props[0].position=[0,.7,0];p.props[0].size=[.001,1.4,.5];}));
  const w=inspectPlan(p).warnings;assert.ok(w.some(x=>x.code==='route-obstacle'));assert.ok(w.some(x=>x.code==='route-start'));
});
test('axis crossing caught even with reversed pair ordering',()=>{
  const p=validatePlan(modify(p=>{const s=structuredClone(p.shots[0]);s.id='reverse';s.axis=[...p.shots[0].axis].reverse();s.camera.position[2]*=-1;p.shots.push(s);}));
  assert.ok(inspectPlan(p).warnings.some(x=>x.code==='axis-crossing'));
});
test('head outside frame is reported',()=>{
  const p=validatePlan(modify(p=>p.shots[0].camera.target=[50,1,0]));assert.ok(inspectPlan(p).warnings.some(x=>x.code==='head-out-of-frame'));
});
test('head occlusion is reported',()=>{
  const p=validatePlan(modify(p=>{p.props[0].position=[0,1.5,2];p.props[0].size=[4,3,.3];}));assert.ok(inspectPlan(p).warnings.some(x=>x.code==='head-occluded'));
});
test('held prop follows hand in every state; release uses position',()=>{
  const p=validatePlan(modify(p=>{p.props[0].holder={characterId:p.characters[0].id,hand:'right'};p.states.at(-1).propOverrides=[{id:p.props[0].id,holder:null,position:[1,.5,1]}];}));
  for(const s of p.states.slice(0,-1))assert.deepEqual(propTransform(p,s,stateProps(p,s)[0]).position.toArray(),jointsFor(p.characters[0],s.placements[0]).handR.toArray());
  assert.deepEqual(propTransform(p,p.states.at(-1),stateProps(p,p.states.at(-1))[0]).position.toArray(),[1,.5,1]);
});
test('camera target projects to frame centre',()=>{const shot=plan.shots[0],cam=makeCamera(shot.camera),point=cam.position.clone().fromArray(shot.camera.target).project(cam);assert.ok(Math.abs(point.x)<1e-8&&Math.abs(point.y)<1e-8);});
test('labels escaped and raster dimensions correct',()=>{
  const p=validatePlan(modify(p=>p.title='<script>alert(1)</script>'));
  const svg=planSvg(p,p.states[0]),png=rasterize(svg);assert.ok(!svg.includes('<script>'));assert.ok(svg.includes('&lt;script&gt;'));assert.equal(png.readUInt32BE(16),1440);assert.equal(png.readUInt32BE(20),1080);
  const html=reviewHtml(p,inspectPlan(p));assert.ok(!html.includes('<h1><script>'));assert.ok(html.includes("connect-src 'none'"));
});
test('camera PNG is label-free 720x1280; document global restored',()=>{
  const before=globalThis.document,svg=cameraSvg(plan,plan.states[0],plan.shots[0]),png=rasterize(svg);
  assert.equal(globalThis.document,before);assert.ok(!svg.includes('<text'));assert.equal(png.readUInt32BE(16),720);assert.equal(png.readUInt32BE(20),1280);
});
test('landscape export keeps bounded dimensions and aspect',()=>{
  const p=validatePlan(modify(p=>p.shots[0].camera.aspect=[16,9]));const png=rasterize(cameraSvg(p,p.states[0],p.shots[0]));assert.equal(png.readUInt32BE(16),1280);assert.equal(png.readUInt32BE(20),720);
});
test('review page state selector updates images and shot cards',()=>{
  const {parseHTML}=require('linkedom'),{document,Event}=parseHTML(reviewHtml(plan,inspectPlan(plan)));
  const select=document.getElementById('state');select.options[0].selected=true;
  vm.runInNewContext(document.querySelector('script').textContent,{document});
  assert.equal(document.getElementById('plan').getAttribute('src'),'start.plan.png');
  select.querySelector('option[value="door-look"]').selected=true;
  select.dispatchEvent(new Event('change'));
  assert.equal(document.getElementById('plan').getAttribute('src'),'door-look.plan.png');
  assert.equal(document.querySelectorAll('article:not([hidden])').length,1);
  assert.equal(document.querySelector('article:not([hidden])').dataset.state,'door-look');
});

const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'rui-blocking-test-'));
try{
  const json=path.join(temporary,'input.json'),out=path.join(temporary,'rendered'),guard=path.join(temporary,'deny-network.mjs');
  const mini=structuredClone(input);mini.states=[mini.states[0]];mini.states[0].paths=[];mini.shots=[mini.shots[0]];fs.writeFileSync(json,JSON.stringify(mini));
  fs.writeFileSync(guard,"import net from 'node:net';import tls from 'node:tls';const deny=()=>{throw new Error('NETWORK_FORBIDDEN')};net.Socket.prototype.connect=deny;tls.connect=deny;globalThis.fetch=deny;\n");
  const run=()=>spawnSync(process.execPath,['--import',pathToFileURL(guard).href,path.join(root,'rui-skills/scripts/blocking.mjs'),'render',json,'--out',out],{encoding:'utf8',timeout:60000,windowsHide:true});
  test('CLI renders full delivery with network disabled',()=>{const r=run();assert.equal(r.status,0,r.stderr);for(const file of ['blocking.json','review.json','review.html','generation-reference.md',mini.states[0].id+'.plan.png',mini.shots[0].id+'.camera.png',mini.shots[0].id+'.artcraft.json'])assert.ok(fs.existsSync(path.join(out,file)),file);assert.equal(JSON.parse(fs.readFileSync(path.join(out,'review.json'))).visualReview,'not_run');});
  test('existing output is never overwritten',()=>{const file=path.join(out,'blocking.json'),before=fs.readFileSync(file);const r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/输出目录已存在/);assert.deepEqual(fs.readFileSync(file),before);});
}finally{
  const resolved=path.resolve(temporary);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('rui-blocking-test-'));fs.rmSync(resolved,{recursive:true,force:true});
}
console.log(JSON.stringify({passed,network:'disabled in CLI integration test',video:'not_run'}));
