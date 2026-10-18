import * as THREE from 'three';

export const ARTCRAFT_COMMIT = 'd4e4ac69bbd93d237eaf5d0260bc6a5ff3a5e373';
const identifier = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const poses = new Set(['stand', 'sit', 'reach-left', 'reach-right']);
const jointKeys = ['hipL','hipR','kneeL','kneeR','footL','footR','shoulderL','shoulderR','elbowL','elbowR','handL','handR','head','neck','pelvis'];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const vector = (v, label) => assert(Array.isArray(v) && v.length === 3 && v.every(x => Number.isFinite(x) && Math.abs(x) <= 100), `${label} 必须为各轴不超过100的有限 [x,y,z] 坐标`);
const label = (s, key) => assert(typeof s === 'string' && s.trim() && s.length <= 240, `${key} 必须为1—240字文本`);
const id = (s, key) => assert(typeof s === 'string' && identifier.test(s), `${key} 必须为字母数字、下划线或连字符标识`);
const color = (s, key) => assert(/^#[0-9a-f]{6}$/i.test(s), `${key} 必须为 #RRGGBB`);
const unique = (items, key) => { const values = items.map(x=>x.id); values.forEach(x=>id(x,key)); assert(new Set(values).size===values.length, `${key} 重复`); };
const radians = n => n*Math.PI/180;

export function validatePlan(input) {
  assert(input && input.schema === 'rui-blocking/1', 'schema 必须为 rui-blocking/1');
  const p = structuredClone(input);
  label(p.title, 'title');
  assert(p.units === 'meters', 'units 必须为 meters');
  assert(p.room && Number.isFinite(p.room.width) && p.room.width>0 && p.room.width<=100 && Number.isFinite(p.room.depth) && p.room.depth>0 && p.room.depth<=100, 'room.width/depth 必须为0—100米');
  assert(Array.isArray(p.characters) && p.characters.length>0 && p.characters.length<=30, 'characters 需要1—30人');
  unique(p.characters, '角色id');
  for (const c of p.characters) {
    label(c.name,'角色姓名'); color(c.color,'角色颜色'); c.height ??= 1.7;
    assert(Number.isFinite(c.height)&&c.height>=0.5&&c.height<=3,'角色height须在0.5—3米内');
  }
  p.props ??= []; assert(Array.isArray(p.props)&&p.props.length<=150,'props最多150个'); unique(p.props,'道具id');
  unique([...p.characters,...p.props],'角色和道具id');
  for (const prop of p.props) {
    label(prop.name,'道具名称'); color(prop.color,'道具颜色'); vector(prop.size,'道具size');
    assert(prop.size.every(x=>x>0&&x<=100),'道具size各轴须大于0');
    assert(prop.kind === undefined || prop.kind === 'box','当前道具kind仅支持box');
    assert(prop.solid===undefined||typeof prop.solid==='boolean','道具solid须为布尔值');
  }
  p.anchors ??= []; assert(Array.isArray(p.anchors)&&p.anchors.length<=30,'anchors最多30个');
  for(const a of p.anchors){label(a.name,'锚点名称');vector(a.position,'锚点位置');}
  assert(Array.isArray(p.states)&&p.states.length>0&&p.states.length<=50,'states需要1—50个状态'); unique(p.states,'状态id');
  for(const s of p.states){
    label(s.label,'状态label');
    assert(Array.isArray(s.placements)&&s.placements.length===p.characters.length,'每个状态须给出所有角色的placements'); unique(s.placements,'placement.id');
    for(const v of s.placements){
      assert(p.characters.some(c=>c.id===v.id),`未知角色 ${v.id}`); vector(v.position,'角色位置');
      assert(v.position[1]>=0,'角色不能位于地板下');
      assert(Number.isFinite(v.facingDegrees)&&Math.abs(v.facingDegrees)<=36000,'facingDegrees必须为有效角度');
      v.pose ??= 'stand'; assert(poses.has(v.pose),`未知姿态 ${v.pose}`);
      if(v.joints!==undefined){assert(v.joints && typeof v.joints==='object'&&!Array.isArray(v.joints),'joints必须为对象');for(const [key,value] of Object.entries(v.joints)){assert(jointKeys.includes(key),`未知关节 ${key}`);vector(value,`joints.${key}`);assert(value.every(x=>Math.abs(x)<=3),'关节局部坐标须在3米以内');}}
      if(v.gaze!==undefined){assert(p.characters.some(c=>c.id===v.gaze)||p.props.some(a=>a.id===v.gaze),`未知视线目标 ${v.gaze}`);}
    }
    s.propOverrides ??= []; assert(Array.isArray(s.propOverrides),'propOverrides须为数组'); unique(s.propOverrides,'propOverrides.id');
    for(const v of s.propOverrides){assert(p.props.some(x=>x.id===v.id),`未知道具 ${v.id}`);assert(Object.keys(v).every(k=>['id','position','rotationDegrees','holder'].includes(k)),'道具状态只可覆盖位置、旋转和holder');}
    for(const prop of stateProps(p,s)){
      assert(prop.holder===undefined||prop.holder===null||(typeof prop.holder==='object'&&!Array.isArray(prop.holder)),'holder须为对象或null');
      if(prop.holder){
        assert(p.characters.some(c=>c.id===prop.holder.characterId),'holder角色不存在');
        assert(['left','right'].includes(prop.holder.hand),'holder.hand须为left/right');
        if(prop.holder.offset)vector(prop.holder.offset,'持物偏移');
      }else vector(prop.position,`${prop.id}.position`);
      if(prop.rotationDegrees!==undefined)assert(Array.isArray(prop.rotationDegrees)&&prop.rotationDegrees.length===3&&prop.rotationDegrees.every(x=>Number.isFinite(x)&&Math.abs(x)<=36000),'道具rotationDegrees须为三个有限角度');
    }
    s.paths ??= []; assert(Array.isArray(s.paths)&&s.paths.length<=30,'paths最多30条');
    for(const route of s.paths){
      assert(s.placements.some(v=>v.id===route.characterId),'路线角色不存在');
      assert(Array.isArray(route.points)&&route.points.length>=2&&route.points.length<=100,'路线points需要2—100个坐标');route.points.forEach(x=>vector(x,'路线点'));
      if(route.toState)assert(p.states.some(x=>x.id===route.toState),'路线目标状态不存在');
    }
  }
  assert(Array.isArray(p.shots)&&p.shots.length>0&&p.shots.length<=100,'shots需要1—100镜');unique(p.shots,'镜头id');
  for(const shot of p.shots){
    label(shot.label,'镜头label');assert(p.states.some(s=>s.id===shot.stateId),'镜头stateId不存在');
    const c=shot.camera;assert(c,'镜头缺少camera');vector(c.position,'摄影机位置');vector(c.target,'摄影机目标');
    assert(new THREE.Vector3(...c.position).distanceTo(new THREE.Vector3(...c.target))>0.001,'摄影机位置与目标不能相同');
    assert(Number.isFinite(c.focalLengthMm)&&c.focalLengthMm>=8&&c.focalLengthMm<=300,'焦距需要8—300mm');
    c.aspect ??= [9,16]; assert(Array.isArray(c.aspect)&&c.aspect.length===2&&c.aspect.every(x=>Number.isFinite(x)&&x>0&&x<=100),'aspect须为正数宽高比');
    assert(c.aspect[0]/c.aspect[1]>=.25&&c.aspect[0]/c.aspect[1]<=4,'画幅宽高比须在1:4—4:1内');
    c.filmGaugeMm ??= 35; assert(Number.isFinite(c.filmGaugeMm)&&c.filmGaugeMm>=10&&c.filmGaugeMm<=100,'filmGaugeMm需要10—100');
    shot.subjects ??= p.characters.map(c=>c.id);assert(Array.isArray(shot.subjects)&&shot.subjects.every(x=>p.characters.some(c=>c.id===x)),'subjects含未知角色');
    if(shot.axis){assert(Array.isArray(shot.axis)&&shot.axis.length===2&&shot.axis[0]!==shot.axis[1]&&shot.axis.every(x=>p.characters.some(c=>c.id===x)),'axis须为两个不同角色id');}
  }
  return p;
}

export function stateProps(plan,state){return plan.props.map(p=>({...p,...state.propOverrides?.find(x=>x.id===p.id)}));}
export function jointsFor(character, placement){
  const j={pelvis:[0,.87,0],hipL:[-.11,.85,0],hipR:[.11,.85,0],kneeL:[-.12,.47,0],kneeR:[.12,.47,0],footL:[-.12,.08,-.07],footR:[.12,.08,-.07],neck:[0,1.42,0],head:[0,1.57,0],shoulderL:[-.23,1.31,0],shoulderR:[.23,1.31,0],elbowL:[-.28,1.02,0],elbowR:[.28,1.02,0],handL:[-.26,.77,-.03],handR:[.26,.77,-.03]};
  if(placement.pose==='sit'){
    for(const key of ['pelvis','hipL','hipR','neck','head','shoulderL','shoulderR','elbowL','elbowR','handL','handR'])j[key][1]-=.36;
    Object.assign(j,{kneeL:[-.14,.48,-.40],kneeR:[.14,.48,-.40],footL:[-.14,.08,-.42],footR:[.14,.08,-.42],handL:[-.16,.60,-.30],handR:[.16,.60,-.30]});
  }
  if(placement.pose.startsWith('reach-')){const side=placement.pose==='reach-left'?'L':'R',sign=side==='L'?-1:1;j['elbow'+side]=[sign*.22,1.08,-.25];j['hand'+side]=[sign*.13,1.02,-.54];}
  Object.assign(j,placement.joints??{});
  const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-radians(placement.facingDegrees));
  return Object.fromEntries(Object.entries(j).map(([key,pos])=>[key,new THREE.Vector3(...pos).multiplyScalar(character.height/1.7).applyQuaternion(q).add(new THREE.Vector3(...placement.position))]));
}

export function propTransform(plan,state,prop){
  let position=new THREE.Vector3(...(prop.position??[0,0,0]));
  if(prop.holder){const c=plan.characters.find(x=>x.id===prop.holder.characterId),v=state.placements.find(x=>x.id===c.id);position=jointsFor(c,v)[prop.holder.hand==='left'?'handL':'handR'].clone();const offset=new THREE.Vector3(...(prop.holder.offset??[0,0,0])).applyAxisAngle(new THREE.Vector3(0,1,0),-radians(v.facingDegrees));position.add(offset);}
  return {position,rotation:new THREE.Euler(...(prop.rotationDegrees??[0,0,0]).map(radians))};
}

export function makeCamera(config){
  const cam=new THREE.PerspectiveCamera(50,config.aspect[0]/config.aspect[1],.03,500);
  cam.filmGauge=config.filmGaugeMm;cam.setFocalLength(config.focalLengthMm);cam.position.fromArray(config.position);cam.lookAt(new THREE.Vector3(...config.target));cam.updateMatrixWorld();return cam;
}

export function buildScene(plan,state){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#eef1f5');
  scene.add(new THREE.AmbientLight(0xffffff,.85));const light=new THREE.DirectionalLight(0xffffff,.8);light.position.set(-3,8,4);scene.add(light);
  const meshes=[];
  function mesh(shape,position,scale,shade,name,owner,rotation){
    // Subdivide broad surfaces for SVG painter ordering; large floor triangles otherwise cover actors.
    const divisions=(size,step)=>Math.min(40,Math.max(1,Math.ceil(size/step)));
    const geo=shape==='Sphere'?new THREE.SphereGeometry(.5,12,8):shape==='Cylinder'?new THREE.CylinderGeometry(.5,.5,2,10):new THREE.BoxGeometry(1,1,1,divisions(scale.x,.2),divisions(scale.y,.4),divisions(scale.z,.2));
    const obj=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:shade}));obj.position.copy(position);obj.scale.copy(scale);if(rotation)obj.rotation.copy(rotation);
    obj.name=name;obj.userData={shapeKey:shape,owner,color:shade};scene.add(obj);meshes.push(obj);return obj;
  }
  mesh('Box',new THREE.Vector3(0,-.06,0),new THREE.Vector3(plan.room.width,.1,plan.room.depth),'#dce2e9','地面','floor');
  for(const prop of stateProps(plan,state)){
    const t=propTransform(plan,state,prop);mesh('Box',t.position,new THREE.Vector3(...prop.size),prop.color,prop.name,prop.id,t.rotation);
  }
  for(const c of plan.characters){
    const v=state.placements.find(x=>x.id===c.id),j=jointsFor(c,v),scale=c.height/1.7;
    const segment=(a,b,width,part)=>{const d=j[b].clone().sub(j[a]);if(d.length()<.001)return;const obj=mesh('Cylinder',j[a].clone().add(j[b]).multiplyScalar(.5),new THREE.Vector3(width*2*scale,d.length()/2,width*2*scale),c.color,`${c.name}·${part}`,c.id);obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());};
    segment('pelvis','neck',.16,'躯干');segment('shoulderL','shoulderR',.085,'肩部');
    for(const side of ['L','R']){segment('hip'+side,'knee'+side,.073,'大腿'+side);segment('knee'+side,'foot'+side,.060,'小腿'+side);segment('shoulder'+side,'elbow'+side,.052,'上臂'+side);segment('elbow'+side,'hand'+side,.044,'前臂'+side);for(const name of ['hand','knee','elbow'])mesh('Sphere',j[name+side],new THREE.Vector3(.13*scale,.13*scale,.13*scale),c.color,`${c.name}·${name+side}`,c.id);}
    mesh('Sphere',j.head,new THREE.Vector3(.27*scale,.32*scale,.27*scale),c.color,`${c.name}·头`,c.id);
    const forward=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),-radians(v.facingDegrees));
    for(const side of ['L','R'])mesh('Sphere',j['foot'+side].clone().addScaledVector(forward,.04*scale),new THREE.Vector3(.16*scale,.15*scale,.27*scale),c.color,`${c.name}·脚${side}`,c.id,new THREE.Euler(0,-radians(v.facingDegrees),0));
    mesh('Sphere',j.head.clone().addScaledVector(forward,.145*scale),new THREE.Vector3(.07*scale,.07*scale,.07*scale),'#25344d',`${c.name}·朝向`,c.id);
  }
  scene.updateMatrixWorld(true);return {scene,meshes};
}

export function artcraftScene(plan,state,shot){
  const {scene,meshes}=buildScene(plan,state),cam=makeCamera(shot.camera);
  const xyz=v=>({x:v.x,y:v.y,z:v.z});
  const result={version:1,scene:meshes.map(obj=>({version:1,position:xyz(obj.position),rotation:xyz(obj.rotation),scale:xyz(obj.scale),object_name:obj.name,object_uuid:obj.uuid,object_user_data_name:obj.name,media_file_token:'Parim',color:obj.userData.color,metalness:0,shininess:0,specular:0,locked:obj.userData.owner==='floor',visible:true,user_data:{shapeKey:obj.userData.shapeKey,isShape:true,shapeType:obj.userData.shapeKey,media_id:'Parim',name:obj.name},rigData:null})),skybox:'',camera_data:{position:xyz(cam.position),rotation:xyz(cam.rotation)},cameras:[{id:'main',label:'查看场景',focalLength:shot.camera.focalLengthMm,position:xyz(cam.position),rotation:xyz(cam.rotation),lookAt:xyz(new THREE.Vector3(...shot.camera.target))},{id:'rui-render',label:shot.label,focalLength:shot.camera.focalLengthMm,position:xyz(cam.position),rotation:xyz(cam.rotation),lookAt:xyz(new THREE.Vector3(...shot.camera.target))}],selectedCameraId:'rui-render',timeline:null,positivePrompt:'',rui:{schema:'rui-artcraft-exchange/1',upstreamCommit:ARTCRAFT_COMMIT,aspect:shot.camera.aspect,filmGaugeMm:shot.camera.filmGaugeMm,stateId:state.id,shotId:shot.id,notes:'Primitive mannequin scene; no identity assets, cloud media, rig or animation. Camera aspect may require host configuration.'}};
  const ratio=shot.camera.aspect[0]/shot.camera.aspect[1];
  const aspect=[[16/9,'horizontal_16_9'],[9/16,'vertical_9_16'],[1,'SQUARE_1_1'],[3/2,'horizontal_3_2'],[2/3,'vertical_2_3']].find(([value])=>Math.abs(value-ratio)<1e-8);
  if(aspect)result.cameraAspectRatio=aspect[1];
  disposeScene(scene);return result;
}
export function disposeScene(scene){scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}

export function inspectPlan(plan){
  const warnings=[];const warn=(code,state,message)=>warnings.push({code,state,message});
  for(const state of plan.states){
    for(const v of state.placements){if(Math.abs(v.position[0])>plan.room.width/2||Math.abs(v.position[2])>plan.room.depth/2)warn('outside-room',state.id,`${v.id} 位于房间边界之外`);}
    const solids=stateProps(plan,state).filter(x=>x.solid!==false&&!x.holder);
    const collides=(pos,prop)=>{const t=propTransform(plan,state,prop);const local=new THREE.Vector3(...pos).sub(t.position).applyEuler(new THREE.Euler(-t.rotation.x,-t.rotation.y,-t.rotation.z,'ZYX'));return Math.abs(local.x)<prop.size[0]/2+.18&&Math.abs(local.z)<prop.size[2]/2+.18&&t.position.y-prop.size[1]/2<pos[1]+1.6&&t.position.y+prop.size[1]/2>pos[1]+.1;};
    for(const v of state.placements)if(v.pose!=='sit')for(const prop of solids)if(collides(v.position,prop))warn('body-obstacle',state.id,`${v.id} 与 ${prop.id} 的近似占地相交`);
    for(const route of state.paths){
      const placement=state.placements.find(x=>x.id===route.characterId);
      if(new THREE.Vector3(...route.points[0]).distanceTo(new THREE.Vector3(...placement.position))>.05)warn('route-start',state.id,`${route.characterId} 路线起点不等于当前站位`);
      if(route.toState){const end=plan.states.find(x=>x.id===route.toState).placements.find(x=>x.id===route.characterId);if(new THREE.Vector3(...route.points.at(-1)).distanceTo(new THREE.Vector3(...end.position))>.05)warn('route-end',state.id,`${route.characterId} 路线终点不等于目标状态站位`);}
      for(const prop of solids){
        const t=propTransform(plan,state,prop),inverse=new THREE.Quaternion().setFromEuler(t.rotation).invert();
        const box=new THREE.Box3(new THREE.Vector3(-prop.size[0]/2-.18,-prop.size[1]/2-1.6,-prop.size[2]/2-.18),new THREE.Vector3(prop.size[0]/2+.18,prop.size[1]/2-.1,prop.size[2]/2+.18));
        let hit=false;
        for(let i=1;i<route.points.length&&!hit;i++){
          const a=new THREE.Vector3(...route.points[i-1]).sub(t.position).applyQuaternion(inverse),b=new THREE.Vector3(...route.points[i]).sub(t.position).applyQuaternion(inverse),delta=b.clone().sub(a);
          const intersection=new THREE.Ray(a,delta.clone().normalize()).intersectBox(box,new THREE.Vector3());
          hit=box.containsPoint(a)||!!(intersection&&intersection.distanceTo(a)<=delta.length()+1e-8);
        }
        if(hit)warn('route-obstacle',state.id,`${route.characterId} 路线与 ${prop.id} 的近似占地相交`);
      }
    }
  }
  const axisSides=new Map();
  for(const shot of plan.shots){
    const state=plan.states.find(x=>x.id===shot.stateId),camera=makeCamera(shot.camera),{scene,meshes}=buildScene(plan,state);
    for(const subject of shot.subjects){
      const c=plan.characters.find(x=>x.id===subject),v=state.placements.find(x=>x.id===subject),head=jointsFor(c,v).head;
      const projected=head.clone().project(camera);
      if(Math.abs(projected.x)>1||Math.abs(projected.y)>1||projected.z<-1||projected.z>1)warn('head-out-of-frame',state.id,`${shot.id}: ${c.name} 的头部中心不在画幅内（局部镜头可合理）`);
      const direction=head.clone().sub(camera.position);const ray=new THREE.Raycaster(camera.position,direction.clone().normalize(),.03,direction.length()-.16);
      const hits=ray.intersectObjects(meshes,false).filter(x=>x.object.userData.owner!==subject&&x.object.userData.owner!=='floor');
      if(hits.length)warn('head-occluded',state.id,`${shot.id}: ${c.name} 的头部视线被 ${hits[0].object.name} 遮挡（请检查是否有意）`);
    }
    if(shot.axis){const axis=[...shot.axis].sort(),[a,b]=axis.map(x=>state.placements.find(v=>v.id===x).position),c=shot.camera.position;const side=Math.sign((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]));const key=state.id+':'+axis.join('/');if(side&&axisSides.has(key)&&axisSides.get(key)!==side)warn('axis-crossing',state.id,`${shot.id}: 摄影机换到同一关系轴另一侧`);if(side)axisSides.set(key,side);}
    disposeScene(scene);
  }
  return {schema:'rui-blocking-review/1',warnings,scope:'Approximate geometry only; narrative motivation, exact anatomy and temporal continuity require review.',visualReview:'not_run'};
}
