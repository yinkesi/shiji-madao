import { loadEngine } from '../helpers/engine_env.mjs';
import { bots } from '../helpers/bot.mjs';

let logs = [];
const { E, D, ui } = loadEngine({
  speed: 1,
  ui: {
    onLog: (s) => logs.push(s),
    rpsRound: async () => ({ res: 'win', ap: 3 }),
    pickBoon: async (b) => window.SJI_DATA.BOONS[(b.survivalWaveNo || 1) % 9],
  },
});
const { smartPlay } = bots(E);
ui.playerPhase = smartPlay;


let fails=0;
// 全关卡测试
for(const st of D.STAGES){
  const ch=D.PLAYABLE[Math.floor(Math.random()*D.PLAYABLE.length)];
  logs=[];
  try{
    const b=new E.Battle({mode:'story',stage:st,playerChar:ch,enemies:st.enemies,allies:st.allies||[],rule:st.rule,waves:st.waves});
    // 覆盖波次（s8）
    if(st.waves) b.waves=st.waves;
    const r=await Promise.race([b.run(), new Promise(res=>setTimeout(()=>res('HANG'),60000))]);
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
