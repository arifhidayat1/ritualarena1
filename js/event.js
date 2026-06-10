// ============================================================
// event.js — Rank Event Arena Mode
// ============================================================

let eventInfo = null;
let eventWave = 0;
let eventScore = 0;
let eventBestScore = 0;
let countdownInterval = null;

// ---- Countdown Timer ----

function startEventCountdown(endTime){
  if(countdownInterval) clearInterval(countdownInterval);
  const el=document.getElementById('event-countdown');
  if(!el) return;
  function update(){
    const now=Math.floor(Date.now()/1000);
    const diff=endTime-now;
    if(diff<=0){ el.innerHTML='⏱ EVENT ENDED'; el.style.color='#ff4040'; clearInterval(countdownInterval); return; }
    const d=Math.floor(diff/86400);
    const h=Math.floor((diff%86400)/3600);
    const m=Math.floor((diff%3600)/60);
    const s=diff%60;
    const txt=`⏱ ${d}D ${String(h).padStart(2,'0')}H ${String(m).padStart(2,'0')}M ${String(s).padStart(2,'0')}S`;
    el.innerHTML=txt;
    const miniEl=document.getElementById('event-countdown-mini');
    if(miniEl) miniEl.textContent=txt;
  }
  update();
  countdownInterval=setInterval(update,1000);
}

// ---- Load Event Info ----

async function loadEventInfo(){
  const banner=document.getElementById('event-banner');
  if(!banner) return;
  let info=LOCAL_EVENT;

  if(EVENT_CONTRACT_ADDRESS && wallet.address && !wallet.isDemo){
    try {
      const provider=new ethers.providers.Web3Provider(wallet.provider);
      const contract=new ethers.Contract(EVENT_CONTRACT_ADDRESS,EVENT_ABI,provider);
      const res=await contract.getEventInfo();
      if(res[0]){
        info={active:res[0],name:res[1],description:res[2],bannerColor:res[3],
               startTime:Number(res[4]),endTime:Number(res[5]),totalPlayers:Number(res[6])};
        document.getElementById('event-banner-players').textContent=info.totalPlayers+' players competing';
        var mn=document.getElementById('mode-event-name'); if(mn) mn.textContent=info.name||'RANK EVENT';
        var md=document.getElementById('mode-event-desc'); if(md) md.textContent=info.description||'NFT holders only';
        if(info.endTime>0){
          startEventCountdown(Math.floor(info.endTime/1000));
          document.getElementById('event-countdown').style.display='block';
          const miniEl=document.getElementById('event-countdown-mini');
          if(miniEl) miniEl.style.display='block';
        } else {
          document.getElementById('event-countdown').style.display='none';
        }
      }
    } catch(err){ console.log('Event contract not ready, using local config'); }
  }

  if(info.active){
    banner.style.display='block';
    document.getElementById('event-banner-name').textContent='⚔️ '+info.name.toUpperCase();
    document.getElementById('event-banner-desc').textContent=info.description;
    document.getElementById('event-banner-inner').style.borderColor=info.bannerColor||'#ff4040';
    eventInfo=info;
  } else {
    banner.style.display='none';
  }
}

// ---- Enter Event Arena ----

async function enterEventArena(){
  if(!wallet.address||wallet.isDemo){ showToast('❌ Connect a real wallet first!'); return; }
  try {
    const provider=new ethers.providers.Web3Provider(wallet.provider);
    const nftContract2=new ethers.Contract(NFT_CONTRACT_ADDRESS,NFT_ABI,provider);
    const hasNFT=await nftContract2.hasCharacter(wallet.address);
    if(!hasNFT){ showToast('❌ You need an NFT character to enter the event!'); return; }
  } catch(e){ showToast('❌ Could not verify NFT: '+e.message); return; }

  document.getElementById('event-arena-title').textContent='⚔️ '+(eventInfo?.name||'RANK EVENT');
  document.getElementById('event-arena-desc').textContent=eventInfo?.description||'NFT holders only — compete for the top rank!';

  const saved=loadCustomChars();
  const nftChar=saved.find(c=>c.isNFT);
  const nftInfoEl=document.getElementById('event-nft-info');
  if(nftInfoEl && nftChar){
    nftInfoEl.style.display='block';
    nftInfoEl.innerHTML=`
      <div style="display:flex;align-items:center;gap:10px;background:rgba(255,40,40,0.08);border:1px solid rgba(255,60,60,0.3);padding:10px;margin-bottom:8px">
        <img src="${nftChar.avatarUrl||''}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;border:2px solid #ff4040" onerror="this.style.display='none'">
        <div>
          <div style="font-family:var(--pixel);font-size:7px;color:#ff8080">@${nftChar.username}</div>
          <div style="font-family:var(--vt);font-size:12px;color:#a0a0d0">${nftChar.cls} · HP ${nftChar.hp} · ATK ${nftChar.atk} · DEF ${nftChar.def}</div>
          <div style="font-size:6px;background:#a855f7;color:#fff;padding:2px 6px;font-family:var(--pixel);display:inline-block;margin-top:2px">NFT ✓</div>
        </div>
      </div>`;
  }

  await loadEventLeaderboard();
  await loadMyEventScore();
  showScreen('event');
}

// ---- Event Leaderboard ----

async function loadEventLeaderboard(){
  if(!EVENT_CONTRACT_ADDRESS) return;
  const lbEl=document.getElementById('event-lb-list');
  if(!lbEl) return;
  try {
    const provider=new ethers.providers.Web3Provider(wallet.provider);
    const contract=new ethers.Contract(EVENT_CONTRACT_ADDRESS,EVENT_ABI,provider);
    const scores=await contract.getLeaderboard(20);
    if(!scores.length){
      lbEl.innerHTML='<div style="font-family:var(--vt);font-size:12px;color:#4040a0;text-align:center;padding:16px">No scores yet — be the first!</div>';
      return;
    }
    lbEl.innerHTML=scores.map((s,i)=>{
      const isMe=wallet.address&&s.player.toLowerCase()===wallet.address.toLowerCase();
      const rankLabel=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
      const avatarHtml=s.avatarUrl
        ?`<img src="${s.avatarUrl}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid #ff4040;flex-shrink:0" onerror="this.style.display='none'">`
        :`<div style="width:28px;height:28px;border-radius:50%;background:#1a0000;border:1px solid #ff4040;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">⚔️</div>`;
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid ${isMe?'#ff4040':'rgba(255,60,60,0.2)'};margin-bottom:4px;background:${isMe?'rgba(255,40,40,0.1)':'rgba(10,0,0,0.4)'}">
        <div style="width:20px;text-align:center;font-size:12px;flex-shrink:0">${rankLabel}</div>
        ${avatarHtml}
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--pixel);font-size:6px;color:#ff8080;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">@${s.username}${isMe?' ← You':''}</div>
          <div style="font-family:var(--vt);font-size:11px;color:#6060a0">Wave ${s.wave} · ${s.charName}</div>
        </div>
        <div style="font-family:var(--pixel);font-size:7px;color:#ff4040;flex-shrink:0">${Number(s.score).toLocaleString()}</div>
      </div>`;
    }).join('');
  } catch(err){
    lbEl.innerHTML='<div style="font-family:var(--vt);font-size:12px;color:#4040a0;text-align:center;padding:10px">Failed to load rankings</div>';
  }
}

async function loadMyEventScore(){
  if(!EVENT_CONTRACT_ADDRESS || !wallet.address) return;
  try {
    const provider=new ethers.providers.Web3Provider(wallet.provider);
    const contract=new ethers.Contract(EVENT_CONTRACT_ADDRESS,EVENT_ABI,provider);
    const myScore=await contract.getMyScore();
    const el=document.getElementById('event-my-score');
    if(myScore.score>0 && el){
      el.style.display='block';
      document.getElementById('event-my-wave').textContent='Wave '+myScore.wave+' reached';
      document.getElementById('event-my-score-val').textContent=Number(myScore.score).toLocaleString()+' pts';
      eventBestScore=Number(myScore.score);
    }
  } catch(e){}
}

// ---- Event Battle ----

function startEventBattle(){
  const saved=loadCustomChars();
  const nftChar=saved.find(c=>c.isNFT);
  if(!nftChar){ showToast('❌ Select your NFT character first!'); showScreen('menu'); return; }

  inEventMode=true;
  eventWave=1; eventScore=0;
  S.wave=1; S.reviveCount=0;

  const c=JSON.parse(JSON.stringify(nftChar));
  c.xp=0; c.level=1; c.xpNext=100;
  S.char=c; S.defending=false; S.isPlayerTurn=true;
  S.busy=false; S.skillCooldowns={}; S.totalXP=0;

  pickEventEnemy();
  renderBattle();
  showScreen('battle');
  setTurnUI(true);
  addLog('⚔️ EVENT BATTLE — Wave '+eventWave+'!','sys');
  addLog('Fighting: '+S.enemy.name,'sys');
  addLog('Your turn — choose an action!','sys');
}

function pickEventEnemy(){
  if(pvpEnemyPool.length>0){
    const nft=pvpEnemyPool[Math.floor(Math.random()*pvpEnemyPool.length)];
    const wave=S.wave||1;
    S.enemy={
      name:'@'+nft.username, icon:'👤', type:'NFT Player',
      hp:Math.floor(Number(nft.hp)*Math.pow(1.15,wave-1)),
      maxhp:Math.floor(Number(nft.hp)*Math.pow(1.15,wave-1)),
      atk:Math.floor(Number(nft.atk)*Math.pow(1.10,wave-1)),
      def:Number(nft.def), mp:Number(nft.mp), maxmp:Number(nft.mp),
      healPow:Number(nft.healPow),
      xp:Math.floor(100*Math.pow(1.25,wave-1)),
      avatarUrl:nft.avatarUrl, cls:nft.cls, isPvp:true, wave,
      moves:['Timeline Strike','Viral Burst','Retweet Drain','Echo Chamber'],
    };
  } else {
    pickEnemy(); // fallback
  }
}

// ---- Event Victory ----

function eventVictory(){
  const e=S.enemy, p=S.char;
  const waveScore=Math.floor(1000*S.wave*(p.level||1));
  eventScore+=waveScore;

  document.getElementById('ev-msg').textContent=e.name+' defeated! Wave '+S.wave+' complete!';
  document.getElementById('ev-wave').textContent='Wave '+S.wave+' '+'⭐'.repeat(Math.min(S.wave,5));
  document.getElementById('ev-score').textContent=eventScore.toLocaleString()+' pts';
  document.getElementById('ev-best').textContent=eventBestScore.toLocaleString()+' pts';

  const submitBox=document.getElementById('ev-submit-box');
  const btn=document.getElementById('btn-ev-submit');
  if(eventScore>eventBestScore && EVENT_CONTRACT_ADDRESS){
    submitBox.style.display='block';
    btn.disabled=false;
    btn.innerHTML='🏆 Submit to Event Board';
    document.getElementById('ev-submit-status').textContent='';
  } else {
    submitBox.style.display='none';
  }
  showScreen('event-victory');
}

function continueEventBattle(){
  S.wave=(S.wave||1)+1;
  eventWave=S.wave;
  S.defending=false; S.busy=false;
  pickEventEnemy(); renderBattle();
  showScreen('battle');
  var bl=document.getElementById('battle-log'); if(bl) bl.innerHTML='';
  setTurnUI(true);
  addLog('⚔️ EVENT Wave '+S.wave+'!','sys');
  addLog('Fighting: '+S.enemy.name,'sys');
}

async function submitEventScore(){
  if(!EVENT_CONTRACT_ADDRESS){ showToast('⚠️ Event contract not deployed!'); return; }
  const btn=document.getElementById('btn-ev-submit');
  const statusEl=document.getElementById('ev-submit-status');
  btn.disabled=true; btn.innerHTML='⏳ Submitting...';
  statusEl.innerHTML='<span class="spinner"></span> Waiting for signature...';
  try {
    const provider=new ethers.providers.Web3Provider(wallet.provider);
    const signer=provider.getSigner();
    const contract=new ethers.Contract(EVENT_CONTRACT_ADDRESS,EVENT_ABI,signer);
    const saved=loadCustomChars();
    const nftChar=saved.find(c=>c.isNFT);
    const tx=await contract.submitScore(eventScore,S.wave,nftChar?.username||'',nftChar?.avatarUrl||'',nftChar?.name||'');
    statusEl.innerHTML='<span class="spinner"></span> Confirming...';
    await tx.wait();
    eventBestScore=eventScore;
    statusEl.textContent='✅ Score submitted to Event Board!';
    btn.innerHTML='✅ Submitted!';
    document.getElementById('ev-best').textContent=eventBestScore.toLocaleString()+' pts';
    showToast('🏆 Event score submitted!');
  } catch(err){
    statusEl.textContent='❌ '+(err.reason||err.message);
    btn.disabled=false; btn.innerHTML='🏆 Submit to Event Board';
  }
}

function exitEvent(){
  inEventMode=false;
  S.wave=1; S.char=null; S.enemy=null;
  showScreen('menu');
}
