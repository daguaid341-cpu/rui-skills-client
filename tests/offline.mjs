import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
const base=fs.mkdtempSync(path.join(os.tmpdir(),'rui-offline-'));
process.env.RUI_STATE_DIR=base;
const original=https.request;
https.request=()=>{throw new Error('Offline test forbids cloud requests');};
try{
  const {productionRequest,runEngine}=await import('../rui-skills/scripts/local-engine.mjs');
  const {preferences,validEvent}=await import('../rui-skills/scripts/evolution.mjs');
  assert.deepEqual(preferences(),{metrics:false,feedback:false,updates:false});
  const slug=await productionRequest({command:'module',module:'novel-outline',action:'slug',document:'Synthetic sample'});
  assert.equal(slug.ok,true);
  for(const mode of ['live-action','comic']){
    const result=await productionRequest({kind:'turnaround',document:{mode,observations:'Fictional adult with short hair and a blue coat'}});
    assert.equal(result.ok,true);assert.equal(result.visual,'not_run');assert.ok(result.prompt.includes('90-degree'));
  }
  const asset=runEngine(['character','intake-template']);assert.equal(asset.status,0);assert.ok(JSON.parse(asset.stdout).outfit);
  assert.throws(()=>validEvent({schema:1,kind:'feedback',text:'Private text is not a supported field'}));
  console.log('PASS offline module, turnaround prompts, character intake, consent defaults and privacy schema. No real image generation.');
}finally{https.request=original;if(!base.startsWith(path.join(os.tmpdir(),'rui-offline-')))throw new Error('Invalid cleanup');fs.rmSync(base,{recursive:true,force:true});}
