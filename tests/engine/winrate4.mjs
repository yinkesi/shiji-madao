import { loadEngine } from '../helpers/engine_env.mjs';
import { bots } from '../helpers/bot.mjs';
const { E, D, ui } = loadEngine({ ui: { rpsRound: async () => ({ res: 'win', ap: 3 }) } });
const { kiteBot } = bots(E);
ui.playerPhase = kiteBot;

for(const id of ['s8','s11','s14']){
  const st=D.STAGES.find(s=>s.id===id);
  let wins=0; const n=20;
  for(let i=0;i<n;i++){
    const chars=['wonder','touge','guyin','luhao','xiannv','wenbin'];
    const ch=chars[i%chars.length];
    const b=new E.Battle({mode:'story',stage:st,playerChar:ch,enemies:st.enemies,allies:st.allies||[],rule:st.rule,waves:st.waves});
    ui.rpsRound=async()=>{const r=Math.random();return r<0.4?{res:'win',ap:4}:(r<0.75?{res:'draw',ap:3}:{res:'lose',ap:2});};
    try{ await b.run(); }catch(e){ console.log('ERR',id,e.message); break; }
    if(b.result==='win')wins++;
  }
  console.log(id, st.title.padEnd(10), 'kiting-bot胜率', (wins/n*100).toFixed(0)+'%');
}
process.exit(0);
