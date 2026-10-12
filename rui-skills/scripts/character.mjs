import fs from 'node:fs';
import {runEngine,productionRequest} from './local-engine.mjs';
import {afterTask} from './evolution.mjs';
const [command,...args]=process.argv.slice(2);
try{
  if(['asset','native'].includes(command)){
    const started=Date.now(),r=runEngine([command==='asset'?'character':'native',...args]);
    process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');process.exitCode=r.status||0;
    await afterTask({mode:'character',command:'character',ok:r.status===0,elapsed:Date.now()-started});
  }else if(command==='workflow'){
    const r=await productionRequest({kind:'workflow',topic:args[0]||'turnaround'});if(!r.ok)throw new Error('工作流不可用');console.log(r.text);
  }else if(command==='sheet'){
    if(!args[0]||fs.statSync(args[0]).size>65536)throw new Error('需要64KiB以内的观察JSON');
    const r=await productionRequest({kind:'turnaround',document:JSON.parse(fs.readFileSync(args[0],'utf8').replace(/^\uFEFF/,''))});
    if(!r.ok)throw new Error(r.errors?.join('；')||'输入无效');
    const text=JSON.stringify(r,null,2)+'\n';
    if(args[1]==='--out'&&args[2])fs.writeFileSync(args[2],text,{flag:'wx'});else process.stdout.write(text);
  }else console.log('sheet 观察.json [--out 提示词.json] | workflow turnaround|assets | asset <角色命令> | native prepare|import-image|review ...');
}catch(e){console.error(e.message);process.exitCode=1;}
