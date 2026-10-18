#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const here=path.dirname(fileURLToPath(import.meta.url));
export async function main(args){
  const [command,input,...flags]=args;
  if(!command||['--help','-h'].includes(command)){
    console.log('Rui 本地站位工具：\n  setup                         安装锁定依赖（首次联网）\n  check <blocking.json>         检查站位及近似几何\n  render <blocking.json> --out <新目录>  输出站位图、构图图、ArtCraft场景与审阅页\n运行与渲染不联网、不调用生图模型、不上传素材。');return;
  }
  if(command==='setup'){
    if(input||flags.length)throw new Error('setup不接受额外参数');
    const runtime=path.join(here,'blocking');
    // Use npm's JS entrypoint, avoiding a command-shell wrapper on Windows.
    const candidates=[path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js'),path.join(path.dirname(process.execPath),'..','lib','node_modules','npm','bin','npm-cli.js')];
    const npm=candidates.find(p=>fs.existsSync(p));if(!npm)throw new Error('找不到随Node安装的npm；请在scripts/blocking目录运行 npm ci --omit=dev --ignore-scripts');
    const result=spawnSync(process.execPath,[npm,'ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],{cwd:runtime,stdio:'inherit',windowsHide:true});if(result.status!==0)throw new Error('依赖安装未完成');return;
  }
  if(!['check','render'].includes(command)||!input)throw new Error('需要check/render和输入JSON；见 --help');
  if(command==='check'&&flags.length)throw new Error('check不接受额外参数');
  if(command==='render'&&(flags.length!==2||flags[0]!=='--out'||!flags[1]))throw new Error('render需要 --out 新目录');
  const stat=fs.statSync(input);if(!stat.isFile()||stat.size>2*1024*1024)throw new Error('站位输入须为2MiB以内JSON文件');
  let model,render;
  try{model=await import('./blocking/model.mjs');if(command==='render')render=await import('./blocking/render.mjs');}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND')throw new Error('站位依赖尚未安装，先运行 node scripts/blocking.mjs setup');throw e;}
  const plan=model.validatePlan(JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,''))),report=model.inspectPlan(plan);
  if(command==='check'){console.log(JSON.stringify(report,null,2));return;}
  const output=path.resolve(flags[1]);if(fs.existsSync(output))throw new Error('输出目录已存在，请选择新路径，避免覆盖既有站位图');
  fs.mkdirSync(output,{recursive:true});
  const write=(name,data)=>fs.writeFileSync(path.join(output,name),data,{flag:'wx'});
  write('blocking.json',JSON.stringify(plan,null,2)+'\n');write('review.json',JSON.stringify(report,null,2)+'\n');
  for(const state of plan.states){const svg=render.planSvg(plan,state);write(state.id+'.plan.svg',svg);write(state.id+'.plan.png',render.rasterize(svg));}
  for(const shot of plan.shots){const state=plan.states.find(s=>s.id===shot.stateId),svg=render.cameraSvg(plan,state,shot);write(shot.id+'.camera.svg',svg);write(shot.id+'.camera.png',render.rasterize(svg));write(shot.id+'.artcraft.json',JSON.stringify(model.artcraftScene(plan,state,shot),null,2)+'\n');}
  write('review.html',render.reviewHtml(plan,report));
  write('generation-reference.md','# 站位参考的使用\n\n*.plan.png 带有名字、方向、路径和轴线，只用于空间审阅。\n\n*.camera.png 是无标注的三维简模构图参考，只约束机位、站位、姿态和遮挡；人物身份、服装与最终二维/真人画风由真实角色及场景参考素材提供。不要继承占位人偶、色块或简模材质。实际生成时按工具能力真实附图，不把文件名当作已上传附件。\n\n*.artcraft.json 使用锁定版本的 ArtCraft 基本几何体场景格式，包含人偶各部件与机位；不包含骨骼绑定、云端素材或动画。可经编辑器的 applyJson/loadCache 接口加载；不是面向所有ArtCraft版本承诺的菜单导入功能。画幅与胶片尺寸记录在rui扩展中，接收端须按此配置。\n\n完整桌面应用未在这里启动；兼容测试的范围见仓库 tests/blocking-artcraft.mjs。图像输出不等于生成视频通过验收。\n');
  console.log(JSON.stringify({output,states:plan.states.length,shots:plan.shots.length,warnings:report.warnings.length,network:'not_used',video:'not_run'},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
