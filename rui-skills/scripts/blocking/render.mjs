import fs from 'node:fs';
import path from 'node:path';
import {parseHTML} from 'linkedom';
import {Resvg} from '@resvg/resvg-js';
import {SVGRenderer} from 'three/addons/renderers/SVGRenderer.js';
import {buildScene,makeCamera,propTransform,stateProps,disposeScene} from './model.mjs';

export const escapeXml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const font='Microsoft YaHei, Noto Sans CJK SC, Arial, sans-serif';
const text=(x,y,value,size=20,fill='#25344d',extra='')=>`<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${fill}" ${extra}>${escapeXml(value)}</text>`;

export function planSvg(plan,state){
  const W=1440,H=1080,pad=135;
  const positions=[[-plan.room.width/2,0,-plan.room.depth/2],[plan.room.width/2,0,plan.room.depth/2],...plan.shots.filter(s=>s.stateId===state.id).map(s=>s.camera.position),...state.placements.map(p=>p.position),...state.paths.flatMap(p=>p.points),...plan.anchors.map(a=>a.position)];
  const minX=Math.min(...positions.map(p=>p[0]))-.45,maxX=Math.max(...positions.map(p=>p[0]))+.45,minZ=Math.min(...positions.map(p=>p[2]))-.35,maxZ=Math.max(...positions.map(p=>p[2]))+.45;
  const scale=Math.min((W-2*pad)/(maxX-minX),(H-310)/(maxZ-minZ));
  const point=p=>[W/2+(p[0]-(minX+maxX)/2)*scale,560+(p[2]-(minZ+maxZ)/2)*scale];
  const markers=plan.characters.map(c=>`<marker id="arrow-${c.id}" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="${c.color}" stroke-width="1.5"/></marker>`).join('');
  const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,`<defs>${markers}</defs><rect width="100%" height="100%" fill="#f5f7fb"/>`,text(64,65,plan.title,30),text(64,105,`${state.label} · 俯视站位 / 米制`,19,'#596980')];
  const [x,z]=point([-plan.room.width/2,0,-plan.room.depth/2]);
  parts.push(`<rect x="${x}" y="${z}" width="${plan.room.width*scale}" height="${plan.room.depth*scale}" fill="white" stroke="#465871" stroke-width="3"/>`);
  for(let gx=Math.ceil(-plan.room.width/2);gx<plan.room.width/2;gx++){const [sx]=point([gx,0,0]);parts.push(`<path d="M${sx} ${z} v${plan.room.depth*scale}" stroke="#e8edf3"/>`);}
  for(let gz=Math.ceil(-plan.room.depth/2);gz<plan.room.depth/2;gz++){const [,sy]=point([0,0,gz]);parts.push(`<path d="M${x} ${sy} h${plan.room.width*scale}" stroke="#e8edf3"/>`);}
  for(const prop of stateProps(plan,state)){
    const t=propTransform(plan,state,prop),[px,py]=point(t.position.toArray());
    parts.push(`<g transform="translate(${px} ${py}) rotate(${-t.rotation.y*180/Math.PI})"><rect x="${-prop.size[0]*scale/2}" y="${-prop.size[2]*scale/2}" width="${prop.size[0]*scale}" height="${prop.size[2]*scale}" rx="3" fill="${prop.color}" fill-opacity=".24" stroke="${prop.color}" stroke-width="2"/></g>`);
    if(!prop.holder&&!plan.anchors.some(a=>Math.hypot(a.position[0]-t.position.x,a.position[2]-t.position.z)<.5))parts.push(text(px,py+7,prop.name,17,'#465871','text-anchor="middle"'));
  }
  for(const route of state.paths){const c=plan.characters.find(x=>x.id===route.characterId);parts.push(`<polyline points="${route.points.map(p=>point(p).join(',')).join(' ')}" fill="none" stroke="${c.color}" stroke-width="3" stroke-dasharray="9 7" marker-end="url(#arrow-${c.id})"/>`);}
  const axes=new Set();
  for(const shot of plan.shots.filter(s=>s.stateId===state.id)){
    if(shot.axis&&!axes.has(shot.axis.join('/'))){axes.add(shot.axis.join('/'));const [a,b]=shot.axis.map(id=>point(state.placements.find(v=>v.id===id).position));parts.push(`<path d="M${a.join(' ')} L${b.join(' ')}" stroke="#d59c41" stroke-width="2" stroke-dasharray="5 7"/>`);}
    const [cx,cy]=point(shot.camera.position),[tx,ty]=point(shot.camera.target),angle=Math.atan2(ty-cy,tx-cx);const distance=Math.min(Math.hypot(tx-cx,ty-cy),scale*1.5),cam=makeCamera(shot.camera),half=Math.atan(Math.tan(cam.fov*Math.PI/360)*cam.aspect);
    const a=[cx+Math.cos(angle-half)*distance,cy+Math.sin(angle-half)*distance],b=[cx+Math.cos(angle+half)*distance,cy+Math.sin(angle+half)*distance];
    parts.push(`<path d="M${cx} ${cy} L${a.join(' ')} L${b.join(' ')} Z" fill="#64748b" fill-opacity=".06" stroke="#94a3b8" stroke-width="1"/>`,`<circle cx="${cx}" cy="${cy}" r="11" fill="#24354f"/>`,text(cx+17,cy-14,shot.id,17,'#24354f'));
  }
  for(const c of plan.characters){
    const v=state.placements.find(p=>p.id===c.id),[cx,cy]=point(v.position),angle=v.facingDegrees*Math.PI/180;
    parts.push(`<circle cx="${cx}" cy="${cy}" r="22" fill="${c.color}" stroke="white" stroke-width="4"/><path d="M${cx} ${cy} l${Math.sin(angle)*46} ${-Math.cos(angle)*46}" stroke="${c.color}" stroke-width="4" marker-end="url(#arrow-${c.id})"/>`,text(cx,cy+48,c.name,21,c.color,'text-anchor="middle"'));
    if(v.gaze){const target=state.placements.find(x=>x.id===v.gaze)?.position??propTransform(plan,state,stateProps(plan,state).find(x=>x.id===v.gaze)).position.toArray();const [gx,gy]=point(target);parts.push(`<path d="M${cx} ${cy} L${gx} ${gy}" stroke="${c.color}" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="2 7"/>`);}
  }
  for(const a of plan.anchors){const [ax,ay]=point(a.position);parts.push(`<circle cx="${ax}" cy="${ay}" r="4" fill="#75859d"/>`,text(ax+9,ay-10,a.name,17,'#596980'));}
  parts.push(text(64,1010,'实线箭头：朝向   虚线路径：移动   金色虚线：关系轴   扇形：摄影机水平视角',17,'#596980'),text(64,1045,'北 / −Z ↑    东 / +X →    人物、场景均为调度占位；此图用于审阅，不作为最终角色外观。',17,'#596980'));
  parts.push('</svg>');return parts.join('\n');
}

export function cameraSvg(plan,state,shot){
  const previous=globalThis.document;const {document}=parseHTML('<html><body></body></html>');globalThis.document=document;
  const {scene}=buildScene(plan,state);
  try{
    const renderer=new SVGRenderer(),ratio=shot.camera.aspect[0]/shot.camera.aspect[1];const height=Math.round(1280/Math.max(1,ratio)),width=Math.round(height*ratio);
    renderer.setSize(width,height);renderer.setPrecision(3);renderer.setQuality('high');renderer.render(scene,makeCamera(shot.camera));
    // SVGRenderer uses a centered viewBox and CSS background; make the background explicit for rasterization.
    const svg=renderer.domElement;svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
    const background=document.createElementNS('http://www.w3.org/2000/svg','rect');background.setAttribute('x',String(-width/2));background.setAttribute('y',String(-height/2));background.setAttribute('width',String(width));background.setAttribute('height',String(height));background.setAttribute('fill','#eef1f5');svg.insertBefore(background,svg.firstChild);
    return svg.outerHTML;
  }finally{disposeScene(scene);if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}

export function rasterize(svg){
  const fontFile=process.platform==='win32'?path.join(process.env.WINDIR??'C:\\Windows','Fonts','msyh.ttc'):null;
  return new Resvg(svg,{font:{loadSystemFonts:true,...(fontFile&&fs.existsSync(fontFile)?{fontFiles:[fontFile],defaultFontFamily:'Microsoft YaHei'}:{})}}).render().asPng();
}

export function reviewHtml(plan,report){
  const states=plan.states.map(s=>`<option value="${s.id}">${escapeXml(s.label)}</option>`).join('');
  const cards=plan.shots.map(s=>`<article data-state="${s.stateId}"><a href="${s.id}.camera.png"><img src="${s.id}.camera.png" alt="${escapeXml(s.label)}"/></a><h3>${escapeXml(s.label)}</h3><p>${escapeXml(s.id)} · ${s.camera.focalLengthMm}mm · ${s.camera.aspect.join(':')}</p><a href="${s.id}.artcraft.json" download>ArtCraft 场景数据</a></article>`).join('');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'"><title>${escapeXml(plan.title)} · Rui 站位审阅</title><style>body{margin:0;background:#f5f7fb;color:#22324c;font:16px 'Microsoft YaHei',sans-serif}main{max-width:1400px;margin:40px auto;padding:0 28px}h1{margin-bottom:8px}p{color:#65758b}select{padding:10px;border:1px solid #ccd5e2;border-radius:8px;font:inherit}.layout{display:grid;grid-template-columns:minmax(400px,1.25fr) minmax(300px,1fr);gap:24px;margin-top:24px}#plan{width:100%;border-radius:12px}section{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}article{background:white;padding:14px;border-radius:12px}article img{width:100%;max-height:480px;object-fit:contain;background:#eef1f5}h3{font-size:16px}a{color:#2766a5}li{margin:8px 0}.note{background:#eaf0f7;padding:18px;border-radius:12px}article[hidden]{display:none}@media(max-width:850px){.layout{display:block}section{margin-top:20px}}</style><main><h1>${escapeXml(plan.title)}</h1><p>站位、视线与机位参考 · 本地文件 · 三维简模不代表人物身份或最终画风</p><label>调度状态 <select id="state">${states}</select></label><div class="layout"><div><a id="plan-link" href="${plan.states[0].id}.plan.png"><img id="plan" src="${plan.states[0].id}.plan.png" alt="俯视站位图"></a><p>俯视图带标签用于审阅；右侧构图图没有标签，可作为空间参考。</p></div><section>${cards}</section></div><h2>几何检查</h2><div class="note">${report.warnings.length?`<ul>${report.warnings.map(w=>`<li>${escapeXml(w.state+' · '+w.message)}</li>`).join('')}</ul>`:'未发现当前检查覆盖的几何问题。'}<p>只检查近似占地、路径、头部取景和遮挡。人物动机、剧情困局、动作时间及真实人体接触仍需审阅；未进行视频生成验收。</p></div><p><a href="blocking.json" download>站位源数据</a> · <a href="review.json" download>检查记录</a> · <a href="generation-reference.md">参考图使用说明</a></p></main><script>const select=document.getElementById('state');function show(){const id=select.value;document.getElementById('plan').src=id+'.plan.png';document.getElementById('plan-link').href=id+'.plan.png';document.querySelectorAll('article').forEach(x=>x.hidden=x.dataset.state!==id)}select.addEventListener('change',show);show();</script></html>`;
}
