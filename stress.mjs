import { createRequire } from 'module';
const require = createRequire(import.meta.url);
global.window={};
window.SJI_SAVE={bump:()=>{}};
let logs=[];
window.SJI_UI={
  onLog:s=>logs.push(s), onState:()=>{}, snap:()=>{}, fxFloat:()=>{}, fxHit:()=>{}, fxStatus:()=>{},
  rpsRound:async()=>({res:'win',ap:3}),
  pickBoon:async(b)=>window.SJI_DATA.BOONS[(b.survivalWaveNo||1)%9],
  playerPhase:null, onBattleEnd:()=>{}
};
window.SJI_AUDIO=new Proxy({},{get:()=>()=>{}});
window.SJI={settings:{speed:1}};
require('./js/data.js');
const D=window.SJI_DATA;
require('./js/engine.js');
const E=window.SJI_ENGINE;

async function smartPlay(b){
  await (async(battle)=>{
    let guard=0;
    while(battle.player.apNow>0 && guard++<14 && !battle.over){
      const p=battle.player;
      const foes=battle.opponentsOf(p);
      if(!foes.length)break;
      const t=foes.sort((a,c)=>E.manh(p,a)-E.manh(p,c))[0];
      // 技能优先
      if(p.st.silence<=0 && Math.random()<0.8){
        const pick=battle.aiPickSkill(p);
        if(pick){ await battle.doSkill(p,pick.idx,pick.target); continue; }
      }
      if(!p.hasKnife){await battle.doBuyKnife(p);continue;}
      if(!p.hasHorse && Math.random()<0.7){await battle.doBuyHorse(p);continue;}
      if(p.hp>=7 && E.manh(p,t)<=2 && Math.random()<0.3){await battle.doSacrifice(p);continue;}
      if(p.hasHorse&&E.isWall(p.r,p.c)&&E.isWall(t.r,t.c)&&E.manh(p,t)<=3){await battle.doHorse(p,t);continue;}
      if(p.hasKnife&&E.adj(p,t)){await battle.doKnife(p,t);continue;}
      const step=battle._stepToward(p,t);
      if(step&&!(step[0]===p.r&&step[1]===p.c)){await battle.doMove(p,step[0],step[1]);continue;}
      break;
    }
  })(b);
}
window.SJI_UI.playerPhase=smartPlay;

let fails=0;
// 全关卡测试
for(const st of D.STAGES){
  const ch=D.PLAYABLE[Math.floor(Math.random()*D.PLAYABLE.length)];
  logs=[];
  try{
    const b=new E.Battle({mode:'story',stage:st,playerChar:ch,enemies:st.enemies,allies:st.allies||[],rule:st.rule,waves:st.waves});
    // 覆盖波次（s8）
    if(st.waves) b.waves=st.waves;
    const r=await Promise.race([b.run(), new Promise(res=>setTimeout(()=>res('HANG'),30000))]);
    if(r==='HANG'){console.log('HANG', st.id); fails++;}
    else console.log(st.id, ch, '->', r, 'rounds', b.round, 'loglen', b.log.length);
  }catch(e){ console.log('ERROR in', st.id, e.stack.split('\n').slice(0,3).join(' | ')); fails++; }
}
// 全角色1v1
for(const id of D.PLAYABLE){
  try{
    const b=new E.Battle({mode:'free',playerChar:id,enemies:['mob'],allies:[],diff:'hard'});
    const r=await Promise.race([b.run(), new Promise(res=>setTimeout(()=>res('HANG'),20000))]);
    if(r==='HANG'){console.log('HANG 1v1', id); fails++;}
  }catch(e){ console.log('ERROR 1v1', id, e.stack.split('\n')[0]); fails++; }
}
// 生存模式3波
logs=[];
try{
  const b=new E.Battle({mode:'survival',playerChar:'touge'});
  await Promise.race([b.run(), new Promise(res=>setTimeout(()=>res('HANG'),60000))]);
  console.log('survival: wave', b.survivalWaveNo, 'over', b.over, 'result', b.result);
}catch(e){ console.log('ERROR survival', e.stack.split('\n').slice(0,3).join('|')); fails++; }
console.log(fails===0?'ALL PASS':'FAILS: '+fails);
process.exit(fails===0?0:1);
