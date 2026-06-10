// ============================================================
// battle.js — Battle System, Combat Logic, Effects
// ============================================================

let S = {char:null,enemy:null,totalXP:0,block:100234,defending:false,isPlayerTurn:true,busy:false,selectedChar:0,skillCooldowns:{},wave:1};
let totalWins = 0;
let inEventMode = false;

function rnd(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function fakeTx(){ return '0x'+Array.from({length:16},()=>rnd(0,15).toString(16)).join('')+'...'; }
function fakeBlock(){ S.block+=rnd(1,5); return '#'+S.block; }

// ---- Character List ----

function renderCharList(){
  var cl=document.getElementById('char-list');
  if(cl) cl.innerHTML=CHARS.map((c,i)=>`
    <div class="char-card ${i===0?'selected':''}" id="cc${i}" onclick="selectChar(${i})">
      <div class="char-icon-box">${c.icon}</div>
      <div style="flex:1"><div class="char-name">${c.name}</div><div class="char-meta">${c.cls} · HP ${c.hp} · ATK ${c.atk} · DEF ${c.def}</div></div>
      ${i===0?'<span class="sel-badge">Selected</span>':''}
    </div>`).join('');
  S.selectedChar=0;
}

function selectChar(i){
  S.selectedChar=i;
  CHARS.forEach((_,idx)=>{
    const el=document.getElementById('cc'+idx);
    el.className='char-card'+(idx===i?' selected':'');
    const b=el.querySelector('.sel-badge'); if(b) b.remove();
  });
  const badge=document.createElement('span'); badge.className='sel-badge'; badge.textContent='Selected';
  document.getElementById('cc'+i).appendChild(badge);
}

// ---- Enemy Selection ----

let pvpEnemyPool = [];
let pvpPoolLoaded = false;

async function loadPvpEnemyPool(){
  if(!wallet.address || wallet.isDemo) return;
  try {
    const provider = new ethers.providers.Web3Provider(wallet.provider);
    const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, provider);
    const enemies = await contract.getRandomEnemies(wallet.address, 10);
    pvpEnemyPool = enemies.filter(e => e.username && e.username.length > 0);
    pvpPoolLoaded = true;
  } catch(err){ pvpEnemyPool = []; }
}

function pickEnemy(){
  const wave=S.wave||1;
  const isPvpWave = wave>1 && wave%3===0 && pvpEnemyPool.length>0;
  if(isPvpWave){
    const nft = pvpEnemyPool[Math.floor(Math.random()*pvpEnemyPool.length)];
    S.enemy = {
      name:'@'+nft.username, icon:'👤', type:'NFT Player',
      hp:Number(nft.hp), maxhp:Number(nft.hp),
      atk:Number(nft.atk), def:Number(nft.def),
      mp:Number(nft.mp), maxmp:Number(nft.mp), healPow:Number(nft.healPow),
      xp:Math.floor(120*Math.pow(1.30,wave-1)),
      avatarUrl:nft.avatarUrl, cls:nft.cls, isPvp:true, wave,
      moves:['Timeline Strike','Viral Burst','Retweet Drain','Echo Chamber'],
    };
    return;
  }
  const e=JSON.parse(JSON.stringify(ENEMIES[rnd(0,ENEMIES.length-1)]));
  if(wave>1){
    e.hp   = Math.floor(e.hp   * Math.pow(1.22,wave-1)); e.maxhp=e.hp;
    e.atk  = Math.floor(e.atk  * Math.pow(1.12,wave-1));
    e.def  = Math.floor(e.def  * Math.pow(1.08,wave-1));
    e.xp   = Math.floor(e.xp   * Math.pow(1.30,wave-1));
    if(wave>=5)  e.name='⚡ '+e.name;
    if(wave>=10){ e.name='💀 '+e.name; e.icon='💀'; e.atk=Math.floor(e.atk*1.15); }
    if(wave>=15){ e.hp=Math.floor(e.hp*1.3); e.maxhp=e.hp; e.def=Math.floor(e.def*1.2); }
  }
  e.wave=wave; S.enemy=e;
}

// ---- Render Battle UI ----

function renderBattle(){
  const p=S.char, e=S.enemy;
  var pnEl=document.getElementById('p-name'); if(pnEl) pnEl.textContent=p.name||p.username||'Player';
  var eiEl=document.getElementById('e-icon'); if(eiEl) eiEl.textContent=e.isPvp?'':e.icon;
  var eibEl=document.getElementById('e-icon-bottom'); if(eibEl) eibEl.textContent=e.isPvp?'':e.icon;
  var enemySprite=document.getElementById('enemy-sprite');
  var pvpAvEl=document.getElementById('pvp-enemy-avatar');
  if(enemySprite){
    if(pvpAvEl) pvpAvEl.remove();
    if(e.isPvp && e.avatarUrl){
      var pbnEn=document.getElementById('e-name-tag');
      var pvpImg=document.createElement('img');
      pvpImg.id='pvp-enemy-avatar';
      pvpImg.src=e.avatarUrl;
      pvpImg.style.cssText='width:150px;height:150px;border-radius:8px;object-fit:cover;border:2px solid #ff4040;filter:drop-shadow(0 0 18px rgba(255,60,60,0.6));display:block;image-rendering:pixelated';
      pvpImg.onerror=function(){this.style.display='none';};
      enemySprite.insertBefore(pvpImg, pbnEn);
    }
  }
  document.getElementById('e-name').textContent=e.name;
  document.getElementById('e-type').textContent=e.type;
  document.getElementById('e-reward').textContent='+'+e.xp+' XP';
  var haEl=document.getElementById('heal-amt'); if(haEl) haEl.textContent=p.healPow;
  updateBars(); renderSkills();
  var nt=document.getElementById('e-name-tag'); if(nt) nt.textContent=e.name||'Enemy';
  var ps=document.getElementById('p-sprite'); if(ps) ps.innerHTML=p.icon||'';
  var pn=document.getElementById('p-name'); if(pn) pn.textContent=p.name||p.username||'Player';
  var pl=document.getElementById('p-level'); if(pl) pl.textContent=p.level||1;
  var bw=document.getElementById('battle-wallet'); if(bw) bw.textContent=wallet.address?wallet.address.slice(0,6)+'...'+wallet.address.slice(-4):'—';
  var bn=document.getElementById('battle-net'); if(bn) bn.textContent=wallet.isDemo?'Demo':'Ritual';
  var wb=document.getElementById('wave-badge');
  if(wb){
    var wave=S.wave||1;
    var stars='⭐'.repeat(Math.min(wave,5))+(wave>5?'+'+(wave-5):'');
    if(e.isPvp){
      wb.innerHTML='WAVE '+wave+' <span style="color:#ff6060;font-size:7px">⚔ PvP</span> '+stars;
      wb.style.borderColor='#ff4040'; wb.style.color='#ff8080';
    } else {
      wb.innerHTML='WAVE '+wave+' <span class="wave-stars">'+stars+'</span>';
      wb.style.borderColor='var(--gold)'; wb.style.color='var(--gold)';
    }
  }
  var pbn=document.getElementById('p-battle-name'); if(pbn) pbn.textContent=p.name||p.username||'Player';
  var gifEl=document.getElementById('player-gif');
  var madGifEl=document.getElementById('mad-gif');
  var flashGifEl=document.getElementById('flash-gif');
  var psSprite=document.getElementById('player-sprite');
  if(psSprite){
    if(gifEl) gifEl.style.display='none';
    if(madGifEl) madGifEl.style.display='none';
    if(flashGifEl) flashGifEl.style.display='none';
    var eo=document.getElementById('player-emoji-big'); if(eo) eo.remove();
    var customAvEl=document.getElementById('custom-avatar-battle'); if(customAvEl) customAvEl.remove();
    if(p.isCustom && p.avatarUrl){
      var pbn2=document.getElementById('p-battle-name');
      var cImg=document.createElement('img');
      cImg.id='custom-avatar-battle'; cImg.src=p.avatarUrl; cImg.className='player-sprite-img';
      cImg.style.cssText='border-radius:8px;border:2px solid var(--gold);filter:drop-shadow(0 0 18px rgba(255,200,0,0.5));width:150px;height:150px;object-fit:cover;';
      cImg.onerror=function(){this.style.display='none';};
      psSprite.insertBefore(cImg, pbn2);
    } else if(p.id==='node'){ if(gifEl) gifEl.style.display='block'; }
      else if(p.id==='val'){ if(madGifEl) madGifEl.style.display='block'; }
      else if(p.id==='mage'){ if(flashGifEl) flashGifEl.style.display='block'; }
  }
}

function updateBars(){
  const p=S.char, e=S.enemy;
  var phb=document.getElementById('p-hp-bar'); if(phb){phb.style.width=(Math.max(0,p.hp)/p.maxhp*100)+'%';if(p.hp/p.maxhp<0.25)phb.classList.add('low');else phb.classList.remove('low');}
  var pht=document.getElementById('p-hp-txt'); if(pht) pht.textContent=p.hp+'/'+p.maxhp;
  var mpb=document.getElementById('p-mp-bar'); if(mpb) mpb.style.width=(p.mp/p.maxmp*100)+'%';
  var mpt=document.getElementById('p-mp-txt'); if(mpt) mpt.textContent=p.mp+'/'+p.maxmp;
  var xpb=document.getElementById('p-xp-bar'); if(xpb) xpb.style.width=Math.min(100,p.xp/p.xpNext*100)+'%';
  var xpt=document.getElementById('p-xp-txt'); if(xpt) xpt.textContent=p.xp+'/'+p.xpNext;
  var plv=document.getElementById('p-level'); if(plv) plv.textContent=p.level;
  var ehb=document.getElementById('e-hp-bar'); if(ehb){ehb.style.width=(Math.max(0,e.hp)/e.maxhp*100)+'%';if(e.hp/e.maxhp<0.25)ehb.classList.add('low');else ehb.classList.remove('low');}
  var eht=document.getElementById('e-hp-txt'); if(eht) eht.textContent=Math.max(0,e.hp)+'/'+e.maxhp;
  var db=document.getElementById('def-badge'); if(db) db.style.display=S.defending?'inline-block':'none';
}

function renderSkills(){
  const p=S.char;
  var sl=document.getElementById('skill-list'); if(!sl) return;
  sl.innerHTML=p.skills.map(s=>{
    const cd=S.skillCooldowns[s.id]||0;
    const isCooldown=s.type==='cooldown';
    const disabled=!S.isPlayerTurn||S.busy||(isCooldown?cd>0:p.mp<s.mpCost);
    const costLabel=isCooldown?(cd>0?'⏳ '+cd+' turn':'Ready!'):(s.mpCost>0?'MP:'+s.mpCost:'Free');
    const costColor=isCooldown?(cd>0?'color:#ff8080':'color:#40ff80'):'color:var(--gold)';
    return `<button class="skill-btn" onclick="useSkill('${s.id}')" ${disabled?'disabled':''}>
      <div class="sk-name">${s.name}</div>
      <div class="sk-cost" style="${costColor}">${costLabel}</div>
    </button>`;
  }).join('');
}

function setButtonsDisabled(v){
  ['btn-atk','btn-def','btn-heal','btn-flee'].forEach(id=>{const el=document.getElementById(id);if(el)el.disabled=v;});
}

function setTurnUI(isPlayer){
  S.isPlayerTurn=isPlayer;
  const turnText=document.getElementById('turn-text');
  const banner=document.getElementById('turn-banner');
  if(turnText) turnText.textContent=isPlayer?'Your turn — choose an action!':S.enemy.name+' is attacking...';
  if(banner) banner.className='turn-banner '+(isPlayer?'player-turn':'enemy-turn');
  setButtonsDisabled(!isPlayer);
  if(isPlayer&&S.char&&S.char.mp<20)document.getElementById('btn-heal').disabled=true;
  renderSkills();
  var arrow=document.getElementById('turn-arrow'), label=document.getElementById('turn-label');
  if(arrow&&label){
    if(isPlayer){arrow.textContent='⚔';arrow.style.color='var(--gold)';label.textContent='YOUR TURN';label.style.color='var(--gold)';label.style.animation='';}
    else{arrow.textContent='!';arrow.style.color='var(--red)';label.textContent='ENEMY';label.style.color='var(--red)';label.style.animation='blink 0.8s infinite';}
  }
}

function addLog(msg,type){
  const el=document.getElementById('battle-log');
  if(!el) return;
  const d=document.createElement('div');
  d.className='log-line log-'+(type||'');
  d.textContent='› '+msg;
  el.appendChild(d); el.scrollTop=el.scrollHeight;
}

function shakeEl(id){
  var target=id;
  if(id==='e-icon') target='enemy-sprite';
  else if(id==='player-card'){
    var ps=document.getElementById('player-sprite');
    if(ps){ps.classList.remove('shake');void ps.offsetWidth;ps.classList.add('shake');setTimeout(function(){ps.classList.remove('shake');},400);}
    return;
  }
  const el=document.getElementById(target); if(!el) return;
  el.classList.remove('shake'); void el.offsetWidth;
  el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'),400);
}

function endPlayerTurn(){ S.busy=false; tickCooldowns(); setTurnUI(false); setTimeout(enemyTurn,800); }

// ---- Projectile Effects ----

function getCharProjectile(charId, skillType){
  const configs = {
    node:  { normal:'⚙️', dmg:'⚡', heal:'💚', drain:'🔋', multi:'⚙️', sure:'🎯', color:'#40d0ff' },
    val:   { normal:'🔩', dmg:'💥', heal:'🛡️', drain:'⚔️', multi:'🔩', sure:'💢', color:'#ff8040' },
    mage:  { normal:'✨', dmg:'🌟', heal:'💫', drain:'🌀', multi:'✨', sure:'🎯', color:'#c040ff' },
  };
  const custom = { normal:'💫', dmg:'⚡', heal:'💚', drain:'🌀', multi:'💥', sure:'🎯', color:'#ffd700' };
  const cfg = configs[S.char.id] || custom;
  return { emoji: cfg[skillType]||cfg.normal, color: cfg.color };
}

function fireProjectile(skillType, onHit){
  const playerEl=document.getElementById('player-sprite');
  const enemyEl=document.getElementById('enemy-sprite');
  if(!playerEl||!enemyEl){ onHit(); return; }
  const pr=playerEl.getBoundingClientRect();
  const er=enemyEl.getBoundingClientRect();
  const startX=pr.left+pr.width/2, startY=pr.top+pr.height/2;
  const endX=er.left+er.width/2,   endY=er.top+er.height/2;
  const {emoji,color}=getCharProjectile(S.char.id,skillType);
  const proj=document.createElement('div');
  proj.className='projectile'; proj.textContent=emoji;
  proj.style.left=startX+'px'; proj.style.top=startY+'px';
  proj.style.filter=`drop-shadow(0 0 10px ${color})`;
  document.body.appendChild(proj);
  const duration=380, start=performance.now();
  function animate(now){
    const t=Math.min((now-start)/duration,1);
    const ease=t<0.5?2*t*t:-1+(4-2*t)*t;
    const x=startX+(endX-startX)*ease;
    const y=startY+(endY-startY)*ease-Math.sin(Math.PI*t)*40;
    const scale=1+Math.sin(Math.PI*t)*0.4;
    proj.style.left=x+'px'; proj.style.top=y+'px';
    proj.style.transform=`translate(-50%,-50%) scale(${scale})`;
    if(t<1){ requestAnimationFrame(animate); }
    else {
      proj.remove();
      const burst=document.createElement('div');
      burst.className='hit-burst'; burst.textContent=skillType==='heal'?'💚':'💥';
      burst.style.left=endX+'px'; burst.style.top=endY+'px';
      burst.style.filter=`drop-shadow(0 0 14px ${color})`;
      document.body.appendChild(burst);
      setTimeout(()=>burst.remove(),400);
      onHit();
    }
  }
  requestAnimationFrame(animate);
}

// ---- Actions ----

function doAction(type){
  if(!S.isPlayerTurn||S.busy) return;
  S.busy=true; setButtonsDisabled(true);
  const p=S.char, e=S.enemy;
  if(type==='attack'){
    let dmg=Math.max(1,p.atk-e.def+rnd(-4,6)); const crit=rnd(1,10)>8; if(crit)dmg=Math.floor(dmg*1.6);
    fireProjectile('normal',()=>{
      e.hp=Math.max(0,e.hp-dmg); addLog('⚔️ Attack: -'+dmg+' enemy HP'+(crit?' ⚡ CRITICAL!':''),'hit');
      shakeEl('e-icon'); updateBars();
      if(e.hp<=0){setTimeout(victory,300);return;} setTimeout(endPlayerTurn,400);
    });
  } else if(type==='defend'){
    S.defending=true; addLog('🛡️ Defend — -60% damage this turn!','def'); updateBars(); setTimeout(endPlayerTurn,400);
  } else if(type==='heal'){
    if(p.mp<20){S.busy=false;setTurnUI(true);return;}
    p.mp=Math.max(0,p.mp-20); const h=p.healPow+rnd(0,8);
    fireProjectile('heal',()=>{
      p.hp=Math.min(p.maxhp,p.hp+h);
      addLog('💊 Heal: +'+h+' HP restored','heal'); updateBars(); setTimeout(endPlayerTurn,400);
    });
  }
}

function useSkill(id){
  if(!S.isPlayerTurn||S.busy) return;
  const p=S.char, e=S.enemy;
  const s=p.skills.find(x=>x.id===id); if(!s) return;
  if(s.type==='cooldown'&&S.skillCooldowns[id]>0) return;
  if(s.type!=='cooldown'&&p.mp<s.mpCost) return;
  S.busy=true; setButtonsDisabled(true);
  if(s.type!=='cooldown') p.mp=Math.max(0,p.mp-s.mpCost);
  fireProjectile(s.type,()=>{
    if(s.type==='dmg'){let d=s.dmg+rnd(-5,10);const c=rnd(1,10)>9;if(c)d=Math.floor(d*1.5);e.hp=Math.max(0,e.hp-d);addLog('⚡ '+s.name+': -'+d+' HP'+(c?' CRITICAL!':''),'hit');shakeEl('e-icon');}
    else if(s.type==='heal'){const h=s.heal+rnd(0,6);p.hp=Math.min(p.maxhp,p.hp+h);addLog('💚 '+s.name+': +'+h+' HP','heal');}
    else if(s.type==='multi'){let d1=s.dmg+rnd(-3,6),d2=s.dmg+rnd(-3,6);e.hp=Math.max(0,e.hp-d1-d2);addLog('⚡ '+s.name+': -'+d1+' & -'+d2+' HP','hit');shakeEl('e-icon');}
    else if(s.type==='sure'){e.hp=Math.max(0,e.hp-s.dmg);addLog('🎯 '+s.name+': -'+s.dmg+' HP (sure hit!)','hit');shakeEl('e-icon');}
    else if(s.type==='drain'){let d=s.dmg+rnd(-5,6);const mg=s.manaHeal||0;e.hp=Math.max(0,e.hp-d);p.mp=Math.min(p.maxmp,p.mp+mg);addLog('🌀 '+s.name+': -'+d+' HP, +'+mg+' Mana','hit');shakeEl('e-icon');}
    else if(s.type==='special'){const h=s.heal+rnd(0,5);const mg=s.manaHeal||0;p.hp=Math.min(p.maxhp,p.hp+h);p.mp=Math.min(p.maxmp,p.mp+mg);addLog('✨ '+s.name+': +'+h+' HP, +'+mg+' Mana','heal');}
    else if(s.type==='cooldown'){const h=s.heal+rnd(0,8);const mg=s.manaHeal||0;p.hp=Math.min(p.maxhp,p.hp+h);p.mp=Math.min(p.maxmp,p.mp+mg);S.skillCooldowns[id]=s.cooldown;addLog('🔄 '+s.name+': +'+h+' HP, +'+mg+' Mana — cooldown '+s.cooldown+' turn','heal');}
    updateBars();
    if(e.hp<=0){setTimeout(victory,300);return;}
    tickCooldowns(); renderSkills(); setTimeout(endPlayerTurn,400);
  });
}

function tickCooldowns(){
  for(const key in S.skillCooldowns){ if(S.skillCooldowns[key]>0) S.skillCooldowns[key]--; }
}

function enemyTurn(){
  const e=S.enemy, p=S.char;
  const defaultMoves = e.isPvp?['Timeline Strike','Viral Burst','Retweet Drain','Echo Chamber']:(e.moves||['Strike']);
  const move=defaultMoves[rnd(0,defaultMoves.length-1)];
  const t=rnd(1,10); const defR=S.defending?0.6:0;
  let dmg;
  if(t>=9){dmg=Math.max(1,Math.floor((e.atk+rnd(5,12))*1.5*(1-defR))-p.def);addLog('💥 '+e.name+' "'+move+'" — CRITICAL! -'+dmg+' HP','dmg');}
  else if(t<=2){dmg=Math.max(1,Math.floor(e.atk*0.5*(1-defR))-p.def+rnd(0,2));addLog('😤 '+e.name+' "'+move+'" (weak): -'+dmg+' HP','enemy');}
  else{dmg=Math.max(1,Math.floor((e.atk+rnd(-3,4))*(1-defR))-p.def);addLog('🗡️ '+e.name+' "'+move+'": -'+dmg+' HP','dmg');}
  p.hp=Math.max(0,p.hp-dmg); shakeEl('player-card');
  if(S.defending){S.defending=false;addLog('🛡️ Defense ended','sys');}
  if(e.hp<e.maxhp*0.3&&rnd(1,4)===1){
    const healAmt=e.isPvp?rnd(e.healPow||15,(e.healPow||15)+10):rnd(10,22);
    e.hp=Math.min(e.maxhp,e.hp+healAmt);
    addLog('🔄 '+e.name+' recovered '+healAmt+' HP!','enemy');
  }
  updateBars();
  if(p.hp<=0){setTimeout(()=>{updateReviveUI();showScreen('dead');},500);return;}
  setTimeout(()=>{addLog('── Your Turn ──','sys');S.busy=false;setTurnUI(true);renderSkills();},600);
}

// ---- Flee ----

function confirmFlee(){ if(!S.isPlayerTurn||S.busy)return; document.getElementById('flee-modal').classList.add('show'); }
function closeFlee(){ document.getElementById('flee-modal').classList.remove('show'); }
function doFlee(){
  closeFlee();
  S.defending=false;S.busy=false;S.skillCooldowns={};S.wave=1;
  pickEnemy();renderBattle();
  var bl=document.getElementById('battle-log'); if(bl) bl.innerHTML='';
  setTurnUI(true);
  addLog('🏃 Kabur! Wave reset. New enemy: '+S.enemy.icon+' '+S.enemy.name,'sys');
}

// ---- Game Flow ----

function goMenu(){
  S.char=null;S.enemy=null;S.busy=false;S.defending=false;S.wave=1;inEventMode=false;
  var bl=document.getElementById('battle-log'); if(bl) bl.innerHTML='';
  if(wallet.isDemo){ showScreen('demo-select'); }
  else { showScreen('menu'); renderCustomCharList(); updateCreateCharButton(); }
}

function getBestScore(){ return parseInt(localStorage.getItem('bestScore_'+(wallet.address||'demo').toLowerCase())||'0'); }
function saveBestScore(score){ localStorage.setItem('bestScore_'+(wallet.address||'demo').toLowerCase(), score.toString()); }

function victory(){
  if(inEventMode){ eventVictory(); return; }
  const e=S.enemy, p=S.char;
  p.xp+=e.xp; S.totalXP+=e.xp; totalWins++;
  let lu=false;
  while(p.xp>=p.xpNext){p.xp-=p.xpNext;p.level++;p.xpNext=Math.floor(p.xpNext*1.4);p.maxhp=Math.floor(p.maxhp*1.1);p.hp=p.maxhp;p.maxmp=Math.floor(p.maxmp*1.1);p.mp=p.maxmp;p.atk+=3;p.def+=2;p.healPow+=5;lu=true;}
  document.getElementById('vic-msg').textContent=e.name+' defeated! (Wave '+S.wave+')'+(lu?' 🎉 Level Up! '+p.level+'!':'');
  var vw=document.getElementById('vic-wave'); if(vw) vw.textContent='Wave '+S.wave+' '+'⭐'.repeat(Math.min(S.wave,5))+(S.wave>5?'+'+(S.wave-5):'');
  document.getElementById('vic-xp').textContent='+'+e.xp+' XP';
  document.getElementById('vic-total-xp').textContent=S.totalXP+' XP';
  document.getElementById('vic-wins').textContent=totalWins+' victories';
  const score=calcScore(S.totalXP,p.level,totalWins);
  document.getElementById('vic-score').textContent=score.toLocaleString()+' pts';
  document.getElementById('vic-wallet').textContent=wallet.address?wallet.address.slice(0,6)+'...'+wallet.address.slice(-4):'—';
  const bestScore=getBestScore();
  const isNewBest=score>bestScore;
  const submitBox=document.getElementById('submit-score-box');
  const statusEl=document.getElementById('submit-status');
  const btn=document.getElementById('btn-submit');
  if(isNewBest){
    saveBestScore(score);
    const submittedKey='submittedScore_'+(wallet.address||'').toLowerCase();
    const alreadySubmitted=localStorage.getItem(submittedKey)===score.toString();
    if(!alreadySubmitted) localStorage.removeItem(submittedKey);
    btn.disabled=alreadySubmitted;
    btn.innerHTML=alreadySubmitted?'✅ Submitted to Chain!':'🚀 Submit Score to Ritual Chain';
    if(alreadySubmitted){btn.style.background='rgba(29,158,117,0.3)';btn.style.borderColor='#5DCAA5';btn.onclick=null;}
    else{btn.style.background='';btn.style.borderColor='';btn.onclick=submitScoreOnChain;}
    statusEl.textContent='';statusEl.className='';
    document.getElementById('submit-tx-info').style.display='none';
    submitBox.style.display=wallet.isDemo?'none':'block';
    var sbEl=document.getElementById('vic-score');
    if(sbEl) sbEl.innerHTML=score.toLocaleString()+' pts <span style="background:#ffd700;color:#000;font-size:6px;padding:2px 6px;font-family:var(--pixel);vertical-align:middle">NEW BEST!</span>';
  } else {
    submitBox.style.display='none';
    var notBestEl=document.getElementById('vic-not-best');
    if(!notBestEl){notBestEl=document.createElement('div');notBestEl.id='vic-not-best';notBestEl.style.cssText='background:rgba(40,40,80,0.6);border:1px solid #3030a0;padding:10px;margin-top:8px;text-align:center;font-family:var(--vt);font-size:13px;color:#6060a0';submitBox.parentNode.insertBefore(notBestEl,submitBox);}
    notBestEl.style.display='block';
    notBestEl.innerHTML='📊 Current score: <span style="color:var(--cyan)">'+score.toLocaleString()+'</span> pts<br>Best score: <span style="color:var(--gold)">'+bestScore.toLocaleString()+'</span> pts<br><span style="font-size:11px;color:#4040a0">Beat your best score to submit on-chain!</span>';
  }
  showScreen('victory');
}

function nextBattle(){
  S.wave=(S.wave||1)+1;
  S.defending=false;S.busy=false;pickEnemy();renderBattle();showScreen('battle');
  var bl=document.getElementById('battle-log'); if(bl) bl.innerHTML=''; setTurnUI(true);
  if(S.enemy.isPvp){
    addLog('⚔️ WAVE '+S.wave+' — PvP! Fighting '+S.enemy.name+'!','sys');
    addLog('🔴 This is a real player\'s NFT character!','sys');
  } else {
    addLog('⚔️ WAVE '+S.wave+'! Enemy: '+S.enemy.icon+' '+S.enemy.name,'sys');
  }
}

function revive(){
  if(inEventMode){
    S.reviveCount=(S.reviveCount||0)+1;
    const remaining=3-S.reviveCount;
    if(remaining>=0){
      S.char.hp=Math.floor(S.char.maxhp*0.5);S.char.mp=Math.floor(S.char.maxmp*0.5);
      S.defending=false;S.busy=false;updateBars();showScreen('battle');setTurnUI(true);
      addLog('💊 Revive! HP & Mana 50% recovered ('+remaining+' revives left)','heal');
    }
  } else {
    S.char.hp=Math.floor(S.char.maxhp*0.5);S.char.mp=Math.floor(S.char.maxmp*0.5);
    S.defending=false;S.busy=false;updateBars();showScreen('battle');setTurnUI(true);
    addLog('💊 Revive! HP & Mana 50% recovered','heal');
  }
}

function updateReviveUI(){
  const btn=document.getElementById('btn-revive');
  const counter=document.getElementById('revive-counter');
  if(!btn||!counter) return;
  if(inEventMode){
    const used=S.reviveCount||0;
    const remaining=3-used;
    if(remaining<=0){btn.style.display='none';counter.innerHTML='<span style="color:#ff6060">No revives left!</span>';}
    else{btn.style.display='';counter.textContent='Revives: '+'💊'.repeat(remaining)+'🩶'.repeat(3-remaining);}
  } else { btn.style.display=''; counter.textContent=''; }
}

// ---- Start Game ----

const _origStartGame=function(){
  inEventMode=false;
  const c=JSON.parse(JSON.stringify(CHARS[S.selectedChar]));
  c.xp=0;c.level=1;c.xpNext=100;
  S.char=c;S.defending=false;S.isPlayerTurn=true;S.busy=false;S.skillCooldowns={};S.wave=1;S.totalXP=0;
  totalWins=0;
  var nb=document.getElementById('vic-not-best'); if(nb) nb.style.display='none';
  var bl=document.getElementById('battle-log'); if(bl) bl.innerHTML='';
  pickEnemy();renderBattle();showScreen('battle');setTurnUI(true);
  addLog('⚔️ Battle begins on Ritual Testnet!','sys');
  addLog('Enemy appears: '+S.enemy.icon+' '+S.enemy.name,'sys');
  addLog('Your turn — choose an action!','sys');
};

function startGame(){
  if(typeof S.selectedChar==='string' && S.selectedChar.startsWith('custom_')){
    inEventMode=false;
    const i=parseInt(S.selectedChar.replace('custom_',''));
    const saved=loadCustomChars();
    if(!saved[i]){ showToast('❌ Character not found!'); return; }
    const c=JSON.parse(JSON.stringify(saved[i]));
    c.xp=0;c.level=1;c.xpNext=100;
    S.char=c;S.defending=false;S.isPlayerTurn=true;S.busy=false;S.skillCooldowns={};S.wave=1;S.totalXP=0;
    totalWins=0;
    var nb=document.getElementById('vic-not-best'); if(nb) nb.style.display='none';
    var bl=document.getElementById('battle-log'); if(bl) bl.innerHTML='';
    pickEnemy();renderBattle();showScreen('battle');setTurnUI(true);
    addLog('⚔️ @'+c.username+' enters the Ritual Arena!','sys');
    addLog('Enemy appears: '+S.enemy.icon+' '+S.enemy.name,'sys');
    addLog('Your turn — choose an action!','sys');
  } else { _origStartGame(); }
}
