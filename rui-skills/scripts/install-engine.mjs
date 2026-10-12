import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {engineRoot,manifest,ensureEngine} from './local-engine.mjs';
if(process.platform!==manifest.platform||process.arch!==manifest.arch||process.versions.node!==manifest.node){console.error('本版本需要 Windows x64 与 Node.js '+manifest.node);process.exitCode=1;}
else try{
  const base='https://github.com/daguaid341-cpu/rui-skills-client/releases/download/v'+manifest.version+'/';
  fs.mkdirSync(engineRoot,{recursive:true});
  for(const [name,hash]of Object.entries(manifest.files)){
    if(!/^[a-zA-Z0-9_.-]+$/.test(name))throw new Error('无效文件名');
    const target=path.join(engineRoot,name);
    if(fs.existsSync(target)&&!fs.lstatSync(target).isSymbolicLink()&&createHash('sha256').update(fs.readFileSync(target)).digest('hex')===hash)continue;
    const response=await fetch(base+name,{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error('下载失败：'+name);
    const parts=[];let size=0;for await(const part of response.body){size+=part.length;if(size>8*1024*1024)throw new Error('下载超过限制');parts.push(part);}
    const bytes=Buffer.concat(parts);if(createHash('sha256').update(bytes).digest('hex')!==hash)throw new Error('下载摘要不匹配');
    const temp=target+'.'+randomBytes(6).toString('hex');
    try{fs.writeFileSync(temp,bytes,{flag:'wx'});fs.renameSync(temp,target);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  }
  ensureEngine();console.log('本地引擎已安装；无需 Rui-Skills 凭证，制作不依赖云端。');
}catch(e){console.error(e.message);process.exitCode=1;}
