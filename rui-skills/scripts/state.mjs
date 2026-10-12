import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
export const stateRoot=path.resolve(process.env.RUI_STATE_DIR || path.join(os.homedir(),'.rui-skills'));
export function readState(name,fallback){try{return JSON.parse(fs.readFileSync(path.join(stateRoot,name),'utf8'));}catch{return fallback;}}
export function writeState(name,value){
  fs.mkdirSync(stateRoot,{recursive:true,mode:0o700});
  const target=path.join(stateRoot,name),temp=target+'.'+randomBytes(6).toString('hex');
  try{fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'});fs.renameSync(temp,target);}
  finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
