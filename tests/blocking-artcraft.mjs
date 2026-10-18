// Compatibility test against unmodified, pinned ArtCraft serializer/loader sources.
// The primitive Scene facade supplies rendering services; this is not a desktop app test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validatePlan,artcraftScene,disposeScene,ARTCRAFT_COMMIT} from '../rui-skills/scripts/blocking/model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=path.join(root,'rui-skills/scripts/blocking');
const require=createRequire(path.join(runtime,'package.json'));
const THREE=await import(pathToFileURL(path.join(runtime,'node_modules/three/build/three.module.js')));
const {build}=require('esbuild');
const fixture=path.join(root,'tests/fixtures/artcraft');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'rui-artcraft-test-'));
let checks=0;
const equal=(a,b)=>{assert.deepEqual(a,b);checks++;};

class PrimitiveScene {
  scene=new THREE.Scene();
  disposeContents(){disposeScene(this.scene);this.scene.clear();}
  async instantiate(shape){
    const geometry=shape==='Box'?new THREE.BoxGeometry(1,1,1):shape==='Cylinder'?new THREE.CylinderGeometry(.5,.5,2,12):shape==='Sphere'?new THREE.SphereGeometry(.5,18,12):null;
    assert.ok(geometry,`Unsupported shape ${shape}`);
    const object=new THREE.Mesh(geometry,new THREE.MeshPhongMaterial());
    object.userData={isShape:true,shapeType:shape,shapeKey:shape,media_id:'Parim'};
    this.scene.add(object);return object;
  }
  get_object_by_uuid(uuid){return this.scene.getObjectByProperty('uuid',uuid);}
  setVisible(uuid,visible){this.get_object_by_uuid(uuid).visible=visible;}
  setColor(uuid,color){this.get_object_by_uuid(uuid).material.color.set(color);}
  _createGrid(){}
  updateSkybox(token){assert.equal(token,'','No remote skybox permitted');}
  warmMediaURLs(){throw new Error('Unexpected cloud media lookup');}
  loadObject(){throw new Error('Unexpected cloud object load');}
}

try{
  equal(JSON.parse(fs.readFileSync(path.join(fixture,'SOURCE.json'))).commit,ARTCRAFT_COMMIT);
  const outfile=path.join(temporary,'upstream-loader.mjs');
  await build({entryPoints:[path.join(fixture,'proxy/storyteller_proxy_scene.ts')],outfile,bundle:true,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'fixture-dependencies',setup(b){
    b.onResolve({filter:/^three(?:\/.*)?$/},args=>({path:pathToFileURL(args.path==='three'?path.join(runtime,'node_modules/three/build/three.module.js'):path.join(runtime,'node_modules/three/examples/jsm',args.path.slice('three/addons/'.length))).href,external:true}));
    b.onResolve({filter:/^\.\.\/enums$/},()=>({path:path.join(fixture,'enums/MediaFileType.ts')}));
  }}]});
  const {StoryTellerProxyScene}=await import(pathToFileURL(outfile));
  const plan=validatePlan(JSON.parse(fs.readFileSync(path.join(root,'rui-skills/assets/blocking-example.json'),'utf8')));
  for(const shot of plan.shots){
    const exported=artcraftScene(plan,plan.states.find(s=>s.id===shot.stateId),shot),host=new PrimitiveScene(),proxy=new StoryTellerProxyScene(1,host);
    await proxy.loadFromSceneJson(exported.scene,exported.skybox,exported.version);
    equal(host.scene.children.length,exported.scene.length);
    for(const original of exported.scene){
      const loaded=host.get_object_by_uuid(original.object_uuid);
      assert.ok(loaded);checks++;
      equal(loaded.position.toArray(),Object.values(original.position));
      equal(loaded.rotation.toArray().slice(0,3),Object.values(original.rotation));
      equal(loaded.scale.toArray(),Object.values(original.scale));
      equal(loaded.userData.shapeKey,original.user_data.shapeKey);
      equal('#'+loaded.material.color.getHexString(),original.color.toLowerCase());
      equal(loaded.visible,original.visible);
      equal(loaded.userData.locked,original.locked);
    }
    // Silence only verbose upstream diagnostics while preserving every assertion.
    const log=console.log,debug=console.debug;let saved;
    try{console.log=console.debug=()=>{};saved=proxy.saveToScene(1);}finally{console.log=log;console.debug=debug;}
    equal(saved.length,exported.scene.length);
    for(let i=0;i<saved.length;i++)for(const key of ['position','rotation','scale','object_name','object_uuid','media_file_token','color','locked','visible'])equal(saved[i][key],exported.scene[i][key]);
    // A second load verifies that the upstream serializer retained primitive shape keys.
    await proxy.loadFromSceneJson(saved,'',1);
    equal(host.scene.children.length,saved.length);
    equal(host.scene.children.map(x=>x.userData.shapeKey),exported.scene.map(x=>x.user_data.shapeKey));
    equal(exported.cameraAspectRatio,'vertical_9_16');
    equal(exported.cameras.find(c=>c.id===exported.selectedCameraId).position,Object.fromEntries(['x','y','z'].map((k,i)=>[k,shot.camera.position[i]])));
    host.disposeContents();
  }
  console.log(JSON.stringify({passed:checks,shots:plan.shots.length,upstreamCommit:ARTCRAFT_COMMIT,scope:'Original primitive object loader and serializer; camera envelope shape only. Desktop UI, camera restoration and cloud assets not exercised.'},null,2));
}finally{
  const resolved=path.resolve(temporary),parent=path.resolve(os.tmpdir());
  assert.equal(path.dirname(resolved),parent);assert.ok(path.basename(resolved).startsWith('rui-artcraft-test-'));
  fs.rmSync(resolved,{recursive:true,force:true});
}
