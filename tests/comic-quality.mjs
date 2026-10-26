// Compiled engine 2.0.1 compatibility regression, including legacy 2D defaults.
// Skill 2.5.0 final delivery is 3D; these raw exports are not final prompts.
// Synthetic material only; no media generation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rui-comic-'));
const previousState = process.env.RUI_STATE_DIR;
process.env.RUI_STATE_DIR = path.join(temp, 'state');
const request = https.request;
https.request = () => { throw new Error('Comic audit must remain offline'); };
let checks = 0;
const ok = (condition, label) => { assert.ok(condition, label); checks++; };
export function fixture() {
  // These names and this scene are authored synthetic facts, not inferred user assets.
  const rows = [
    ['林舟停在桌南侧，右手持封口信封；沈宁站桌北侧，二人面对面。', 'The man holds a sealed envelope beside the table.', 'medium', 'Static Shot', '桌东侧斜侧拍两人，桌面隔开二人', '二人及信封'],
    ['沈宁朝林舟伸出左手，掌心向上停在桌面中央；林舟仍持信。', 'The woman extends her open left palm over the table.', 'close', 'Static Shot', '林舟端偏东侧俯拍桌上手部', '沈宁左手与信封之间的距离'],
    ['沈宁面向林舟说话，左手保持张开；林舟不对口型。', 'The woman speaks to the man while keeping her palm open.', 'close', 'Push In', '从林舟端偏东侧拍向沈宁，缓推至面部特写', '沈宁眼睛与嘴部'],
    ['林舟右手将信封沿桌面上方向沈宁左掌送出，仍捏住近端。', 'The man moves the envelope toward her palm, keeping his grip.', 'medium', 'Static Shot', '桌东侧斜侧拍交接，保留两人上身和双手', '右手、信封和左掌'],
    ['沈宁左手握住信封远端，林舟右手仍捏住近端，信封没有复制。', 'The woman grips the far end with her left hand before he releases it.', 'close', 'Static Shot', '桌东侧略俯拍双手接触点', '两只手与信封两端'],
    ['沈宁接稳后，林舟松开右手并收回；信封完全留在沈宁左手。', 'He releases the envelope and withdraws his right hand.', 'close', 'Static Shot', '沿用桌东侧接触点取景', '林舟空手与沈宁持信左手'],
    ['沈宁左手已经持有信封，从桌上方收至胸前；林舟的空右手留在画外桌南侧。', 'She lifts the envelope in her left hand to her chest.', 'close', 'Tilt Up', '桌东侧仰摇跟随信封至胸前，始终只取手部和信封特写', '沈宁左手持有的封口信封'],
    ['沈宁垂眼查看未拆封的封口，左手保持握信，封口状态不变。', 'She lowers her gaze to inspect the still sealed envelope.', 'close', 'Static Shot', '林舟端偏东侧拍沈宁面部及胸前信封', '沈宁眼睛及信封封口'],
    ['门外传来两步脚步声，沈宁看信的动作停住；门保持关闭。', 'Off-screen footsteps interrupt her inspection; the door stays closed.', 'close', 'Static Shot', '沿用沈宁面部特写，门在画外西侧', '沈宁停住的视线'],
    ['林舟将视线从沈宁移向画外西侧的关闭房门，右手仍空着，嘴闭合。', 'The man looks toward the closed door, his mouth closed.', 'close', 'Static Shot', '从沈宁端偏东侧反打林舟，保持对话轴线东侧', '林舟看向门的视线'],
    ['沈宁抬眼看向画外西侧的房门，左手仍把信封留在胸前。', 'The woman looks toward the same door while retaining the envelope.', 'close', 'Push In', '从林舟端偏东侧拍沈宁，由面部特写缓推，仍保留眼睛和嘴部', '沈宁视线方向'],
    ['沈宁看着门低声说话，左手持信不动；林舟保持闭口，没人开门。', 'The woman speaks quietly toward the door; neither person opens it.', 'close', 'Static Shot', '沿用沈宁斜侧面部特写，门在画外西侧', '沈宁眼睛与嘴部'],
  ];
  const lines = {2: '把信交给我，我来保管。', 11: '门外有人，先不要开门。'};
  const flow = rows.map((row, i) => lines[i] ? {speaker:'C02',line:lines[i],delivery:i === 2 ? '沈宁，中文，画内，对林舟平静说；林舟不对口型' : '沈宁，中文，画内，看向门低声说；林舟不对口型'} : {action:row[0]});
  const cuts = rows.map((row,i) => ({beats:[i+1,i+1],seconds:3,size:row[2],camera:row[3],characters:[...([0,3,4,5].includes(i) ? ['C01','C02'] : [i===9 ? 'C01':'C02'])],props:['P01'],frame:`${row[2]==='medium'?'中景':'特写'}，${row[0]}`,shot:row[0],lens:row[2]==='medium'?'标准透视，人物与桌面清楚':'近距取景，关键动作平面清楚',cameraPosition:row[4],composition:'沿桌形成前后层次',eyeline:i===9||i>=10?'画外西侧房门':i===2?'林舟面部':'本镜动作对象',focus:row[5],stability:'stable',...(i===4?{animation:'沈宁左指先合拢接稳，林舟此镜不松手。',visualTreatment:'二维赛璐璐线条与色块连续，接触点不加残影。'}:{}),...(i===8?{sfx:'西侧关闭房门外传来两步脚步声，由远及近后停止。'}:{})}));
  const segments = [0,1].map(group => {
    const start = group*6, part = cuts.slice(start,start+6);
    const alignment='How the reference pictures align with the target video — '+part.map((_,i)=>`Picture ${i+1} (from Shot ${i+1}) aligns with the ${(i*3).toFixed(2)}-second mark of the target video`).join('; ')+'.';
    const h3Prompt=alignment+'\n\nintegrated_multimodal_description:\n'+part.map((cut,i)=>`[Shot ${i+1}] ${i?`At 00:${String(i*3).padStart(2,'0')}.000, `:''}${cut.camera}. ${rows[start+i][1]}${lines[start+i]?` She says <d>[Chinese] ${lines[start+i]}</d>.`:''}`).join('\n')+'\n\noverall_soundscape: Paper and clothing rustle.'+(group?' Two footsteps outside the closed door, then silence.':'')+'\n\nnon_diegetic_music: N/A';
    return {id:`E01-0${group+1}`,sceneIndex:1,blocking:group?'沈宁在桌北侧，左手持封口信封；林舟在桌南侧，右手已空；门在西侧关闭。':'林舟在桌南侧，右手持封口信封；沈宁在桌北侧面向他；门在西侧关闭，摄影机在二人轴线东侧。',soundscape:group?'收信至胸前时纸张与衣料轻响；门外两步脚步声由远及近后停止；沈宁中文低声对白':'伸手与收手时衣料轻响，交接时纸张轻响；沈宁中文平静对白',constraints:[group?'本组仅用特写，不重演交接；信封始终在沈宁左手，门不开。':'信封只有一份，沈宁左手接稳后林舟才松开右手。'],cuts:part,h3Prompt};
  });
  return {docs:{script:{source:'合成漫剧审计：信封交接',params:{actionSeconds:3},episodes:[{ep:1,targetSeconds:36,beatsClaimed:[],hook:'信封由谁保管',cliff:'门外来者未揭示',hookBeat:[1,1],scenes:[{sceneId:'S01',lighting:'日内，东窗柔光',characters:['C01','C02'],props:['P01'],flow}]}]},storyboard:{source:'合成漫剧审计：信封交接',params:{maxSegmentSeconds:30,minCutSeconds:2,maxCutSeconds:5},episodes:[{ep:1,segments}]}},production:{mode:'comic'}};
}

try {
  const {checkProject,exportText}=await import('../rui-skills/scripts/production.mjs');
  const project=fixture(), before=JSON.stringify(project);
  const report=await checkProject(project);
  ok(report.errors.length===0,report.errors.join('\n'));
  const compact=await exportText(project), full=await exportText(project,{detail:'full'});
  for(const text of [compact,full]) {
    ok(text.includes('2D动漫短剧')&&!/真人短剧|毛孔|ARRI/.test(text),'Comic default is separated from live-action');
    for(const line of ['把信交给我，我来保管。','门外有人，先不要开门。'])ok(text.split(line).length===2,'Each original line occurs once');
    ok(text.includes('动画：沈宁左指先合拢接稳'),'Animation process survives export');
    ok(text.includes('画面处理：二维赛璐璐'),'Visual treatment survives export');
    ok(text.includes('由远及近后停止'),'Specific sound and timing survive');
    ok((text.match(/^## E01-0[12] · 18秒$/gm)||[]).length===2,'Two actual 18-second segments');
    ok(text.includes('右手已空')&&text.includes('不重演交接'),'Cross-segment possession survives');
    ok(text.includes('对话轴线东侧')&&text.includes('西侧房门'),'Axis and eyeline survive');
    ok(text.includes('中文，画内')&&text.includes('不对口型'),'Voice language and silent listener survive');
  }
  ok(!compact.includes('15–18秒')&&full.includes('15–18秒'),'Sequence and timed formats differ correctly');
  ok(project.docs.storyboard.episodes[0].segments[1].cuts.every(c=>c.size==='close'),'Fixture deliberately retains close framing; it is not a group-order rule');
  ok(JSON.stringify(project)===before,'Export does not mutate source');
  const live=structuredClone(project);live.production.mode='live-action';
  const liveText=await exportText(live);
  ok(liveText.includes('真人短剧')&&!liveText.includes('动画：'),'Live-action path remains separate');
  const scoped=structuredClone(project);
  scoped.docs.storyboard.unifiedPrompt='真人实拍，保留毛孔，ARRI ALEXA 35。';
  const inheritedReport=await checkProject(scoped);
  const inherited=await exportText(scoped);
  ok(inheritedReport.errors.length===0&&inherited.includes('真人实拍'),'Observed limitation: explicit shared style overrides comic default');
  for(const segment of scoped.docs.storyboard.episodes[0].segments) segment.unifiedPrompt='9:16，二维赛璐璐动画，统一轮廓线与固有色，东窗柔光；以本段镜头动作组织动画。';
  const corrected=await exportText(scoped);
  ok(!/真人实拍|毛孔|ARRI/.test(corrected)&&corrected.includes('二维赛璐璐'),'Explicit per-segment comic style removes stale shared style');
  const model3d=structuredClone(project);model3d.production.style='三维卡通渲染，模型比例与材质保持一致';
  const threeD=await exportText(model3d,{detail:'full'});
  ok(threeD.includes('三维卡通渲染')&&threeD.includes('线条'),'Observed limitation: custom 3D style retains generic comic line-art wording');
  const alternateCoverage=structuredClone(project);
  const later=alternateCoverage.docs.storyboard.episodes[0].segments[1].cuts[0];later.size='medium';later.frame='中景，沈宁将信封收至胸前。';
  ok((await checkProject(alternateCoverage)).errors.length===0,'Later-group medium framing is allowed; shot choice is a narrative decision');
  const tooLong=structuredClone(project);tooLong.docs.storyboard.episodes[0].segments[0].cuts[0].seconds=20;
  ok((await checkProject(tooLong)).errors.length>0,'Over-limit timing rejected');
  const music=structuredClone(project);music.docs.storyboard.episodes[0].segments[0].music='欢快钢琴配乐';
  await assert.rejects(()=>exportText(music));checks++;
  const longLine=structuredClone(project);longLine.docs.script.episodes[0].scenes[0].flow[2].line='把这封信交给我，我会一直守在这里，等所有人离开以后再替你转交给他。';
  ok((await checkProject(longLine)).errors.length>0,'Unmatched or overlong dialogue rejected');
  const outputIndex=process.argv.indexOf('--out');
  if(outputIndex!==-1) {
    const output=path.resolve(process.argv[outputIndex+1]);fs.mkdirSync(output,{recursive:true});
    for(const [name,value] of Object.entries({'project.json':JSON.stringify(project,null,2),'engine-check.json':JSON.stringify(report,null,2),'compact-raw.md':compact,'full-raw.md':full,'stale-style-raw.md':inherited,'corrected-raw.md':corrected}))fs.writeFileSync(path.join(output,name),value,{flag:'wx'});
  }
  console.log(JSON.stringify({checks,engine:'installed compiled engine',text:'synthetic export checked',limitations:['Explicit unifiedPrompt overrides comic style without a conflict error','Custom 3D style retains generic line-art wording','Absent outline/art leaves dialogue and scene IDs unresolved; human finalization required',...report.skipped],voice:'not_run',video:'not_run'},null,2));
} finally {
  https.request=request;
  if(previousState===undefined)delete process.env.RUI_STATE_DIR;else process.env.RUI_STATE_DIR=previousState;
  const resolved=path.resolve(temp);
  assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));
  assert.ok(path.basename(resolved).startsWith('rui-comic-'));
  fs.rmSync(resolved,{recursive:true,force:true});
}
