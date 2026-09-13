import { createRequire } from 'module';
const require = createRequire(import.meta.url);
global.window={};
window.SJI_SAVE={bump:()=>{}};
window.SJI_UI={onLog:()=>{},onState:()=>{},snap:()=>{},fxFloat:()=>{},fxHit:()=>{},fxStatus:()=>{},rpsRound:async()=>({res:'win',ap:3}),playerPhase:async()=>{},pickBoon:async()=>null,onBattleEnd:()=>{}};
window.SJI_AUDIO=new Proxy({},{get:()=>()=>{}});
window.SJI={settings:{speed:3}};
require('./js/config.js');
require('./js/data.js');
const D=window.SJI_DATA;
require('./js/engine.js');
const E=window.SJI_ENGINE;

/* 会拉扯的机器人：打完就走、优先残血、合理血祭 */
async function kitePlay(b){
  const p=b.player, E2=E;
  let guard=0;
  while(p.apNow>0 && guard++<16 && !b.over && p.alive){
    const foes=b.opponentsOf(p);
    if(!foes.length)break;
    // 优先最弱且最近的
    const t=foes.slice().sort((a,c)=>(a.hp-a.hp*0.3+E2.manh(p,a)*0.7)-(c.hp-c.hp*0.3+E2.manh(p,c)*0.7))[0];
    const pick=(b.skillCd(p,0)<=0 && p.st.silence<=0)?b.aiPickSkill(p):null;
    if(pick && Math.random()<0.85){ await b.doSkill(p,pick.idx,pick.target); continue; }
    if(!p.hasKnife){ await b.doBuyKnife(p); continue; }
    if(!p.hasHorse){ await b.doBuyHorse(p); continue; }
    const adjacent=foes.filter(f=>E2.adj(p,f));
    const danger=adjacent.length + foes.filter(f=>E2.manh(p,f)===1).length;
    // 血祭：仅当有斩杀机会且相对安全
    if(p.hp>=6 && adjacent.length>=1 && t.hp<=2 && danger<=1 && p.st.bloodlust<=0 && Math.random()<0.5){ await b.doSacrifice(p); continue; }
    if(p.hasHorse && E2.isWall(p.r,p.c) && E2.isWall(t.r,t.c) && E2.manh(p,t)<=3){ await b.doHorse(p,t); continue; }
    if(p.hasKnife && adjacent.length){ await b.doKnife(p,t.alive&&E2.adj(p,t)?t:adjacent[0]); continue; }
    // 移动：若身边危险且无攻击目标 -> 撤退；否则逼近
    const reach=b._reachable(p, b.moveRange(p));
    let bestKey=null, bestScore=-1e9;
    for(const key of reach.keys){
      const [r,c]=key.split(',').map(Number);
      if(b.unitAt(r,c)||(r===p.r&&c===p.c)) continue;
      const near=foes.filter(f=>Math.max(Math.abs(f.r-r),Math.abs(f.c-c))<=1).length;
      const d=Math.abs(r-t.r)+Math.abs(c-t.c);
      const score = -d*2 - near*3;  // 靠近目标，但避开被围
      if(score>bestScore){bestScore=score;bestKey=key;}
    }
    if(bestKey){ const [r,c]=bestKey.split(',').map(Number); await b.doMove(p,r,c); continue; }
    break;
  }
}
window.SJI_UI.playerPhase=kitePlay;
for(const id of ['s8','s11','s14']){
  const st=D.STAGES.find(s=>s.id===id);
  let wins=0; const n=20;
  for(let i=0;i<n;i++){
    const chars=['wonder','touge','guyin','luhao','xiannv','wenbin'];
    const ch=chars[i%chars.length];
    const b=new E.Battle({mode:'story',stage:st,playerChar:ch,enemies:st.enemies,allies:st.allies||[],rule:st.rule,waves:st.waves});
    window.SJI_UI.rpsRound=async()=>{const r=Math.random();return r<0.4?{res:'win',ap:4}:(r<0.75?{res:'draw',ap:3}:{res:'lose',ap:2});};
    try{ await b.run(); }catch(e){ console.log('ERR',id,e.message); break; }
    if(b.result==='win')wins++;
  }
  console.log(id, st.title.padEnd(10), 'kiting-bot胜率', (wins/n*100).toFixed(0)+'%');
}
process.exit(0);
