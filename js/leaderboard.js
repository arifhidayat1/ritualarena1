// ============================================================
// leaderboard.js — Score Submission & Leaderboard
// ============================================================

function calcScore(totalXP, level, wins){
  return (totalXP * 5) + (level * 500) + (wins * 200);
}

function isContractDeployed(){
  return CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';
}

function getLocalLeaderboard(){
  try { return JSON.parse(localStorage.getItem(LB_KEY)||'[]'); } catch(e) { return []; }
}
function saveLocalLeaderboard(data){
  try { localStorage.setItem(LB_KEY, JSON.stringify(data)); } catch(e) {}
}

// ---- On-Chain Score Submission ----

async function submitScoreOnChain(){
  if(!wallet.connected || wallet.isDemo){
    showToast('❌ Connect a real wallet first!'); return;
  }
  const btn=document.getElementById('btn-submit');
  const statusEl=document.getElementById('submit-status');
  const p=S.char;
  const score=calcScore(S.totalXP, p.level, totalWins);

  if(!isContractDeployed()){
    statusEl.innerHTML=`⚠️ Smart contract not deployed yet.`;
    statusEl.style.color='#EF9F27';
    submitScoreLocal(score, btn, statusEl);
    return;
  }

  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span>Waiting for signature...';
  statusEl.style.color='#EF9F27';
  statusEl.textContent='⏳ Open your wallet and sign the transaction...';

  try {
    const mmProvider=new ethers.providers.Web3Provider(wallet.provider);
    const signer=mmProvider.getSigner();

    let gasPrice=ethers.utils.parseUnits('1','gwei');
    try {
      const ritualRpc=new ethers.providers.JsonRpcProvider('https://rpc.ritualfoundation.org');
      const feeData=await ritualRpc.getFeeData();
      const raw=feeData.gasPrice||feeData.maxFeePerGas;
      if(raw&&raw.gt(gasPrice)) gasPrice=raw;
    } catch(_){}

    const contract=new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    statusEl.textContent='⏳ Sending transaction to Ritual Chain...';
    btn.innerHTML='<span class="spinner"></span>Sending...';

    const scoreBN=ethers.BigNumber.from(Math.floor(score));
    const xpBN=ethers.BigNumber.from(Math.floor(S.totalXP));
    const winsBN=ethers.BigNumber.from(Math.floor(totalWins));
    const levelU8=Math.min(255,Math.max(1,Math.floor(p.level)));
    const charName=String(p.name).slice(0,32);

    const tx=await contract.submitScore(scoreBN,xpBN,winsBN,levelU8,charName,{gasLimit:300000,gasPrice});

    statusEl.textContent='⏳ Waiting for block confirmation...';
    btn.innerHTML='<span class="spinner"></span>Waiting for block...';

    const receipt=await tx.wait(1);
    const txHash=receipt.transactionHash;
    const blockNum=receipt.blockNumber;

    statusEl.style.color='#5DCAA5';
    statusEl.textContent=`✅ Score saved on block #${blockNum}!`;
    document.getElementById('submit-tx-info').style.display='block';
    document.getElementById('submit-tx-hash').textContent=txHash;
    document.getElementById('submit-explorer-link').href=`https://explorer.ritualfoundation.org/tx/${txHash}`;

    btn.disabled=true;
    btn.innerHTML='✅ Submitted to Chain!';
    btn.style.background='rgba(29,158,117,0.3)';
    btn.style.borderColor='#5DCAA5';
    btn.onclick=null;
    showToast('✅ Score on-chain! Block #'+blockNum);

    const submittedKey='submittedScore_'+(wallet.address||'').toLowerCase();
    localStorage.setItem(submittedKey, score.toString());
    submitScoreLocal(score, null, null, txHash, blockNum);

  } catch(e){
    console.error('Submit error:',e);
    btn.disabled=false;
    btn.innerHTML='🚀 Try Again';
    if(e.code===4001||e.code==='ACTION_REJECTED'){
      statusEl.style.color='#f09595';
      statusEl.textContent='❌ Transaction rejected by user.';
    } else if(e.code==='INSUFFICIENT_FUNDS'){
      statusEl.style.color='#f09595';
      statusEl.textContent='❌ Not enough gas. Top up RITUAL Testnet first.';
    } else {
      statusEl.style.color='#f09595';
      statusEl.textContent='❌ Error: '+(e.reason||e.message||'Unknown');
    }
  }
}

// ---- Local Leaderboard Fallback ----

function submitScoreLocal(score, btn, statusEl, txHash, blockNum){
  const lb=getLocalLeaderboard();
  const addr=wallet.address;
  const p=S.char;
  const entry={
    address:addr, score, xp:S.totalXP, wins:totalWins,
    level:p.level, charName:p.name,
    charIcon:CHAR_ICONS[p.name]||'⚔️',
    timestamp:Date.now(),
    txHash:txHash||null, blockNum:blockNum||null,
    isDemo:wallet.isDemo, onChain:!!txHash
  };
  const idx=lb.findIndex(x=>x.address&&x.address.toLowerCase()===addr.toLowerCase());
  if(idx>=0){ if(score>lb[idx].score) lb[idx]=entry; }
  else lb.push(entry);
  lb.sort((a,b)=>b.score-a.score);
  while(lb.length>20) lb.pop();
  saveLocalLeaderboard(lb);
  if(statusEl && !txHash){
    statusEl.style.color='#5DCAA5';
    statusEl.textContent='✅ Score saved locally!';
  }
  if(btn && !txHash){
    btn.disabled=true;
    btn.innerHTML='✅ Saved Locally';
  }
}

// ---- Render Leaderboard ----

async function loadLeaderboard(){
  const lbEl=document.getElementById('lb-list');
  if(!lbEl) return;
  lbEl.innerHTML='<div style="text-align:center;padding:20px;font-family:var(--vt);font-size:14px;color:#4040a0"><span class="spinner"></span> Loading...</div>';

  // Try on-chain first
  if(!wallet.isDemo && wallet.address && isContractDeployed()){
    try {
      const provider=new ethers.providers.Web3Provider(wallet.provider);
      const contract=new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const [players,scores,xps,levels,charNames]=await contract.getTopScores();
      if(players.length>0){
        renderLeaderboard(players.map((addr,i)=>({
          address:addr, score:Number(scores[i]), xp:Number(xps[i]),
          level:Number(levels[i]), charName:charNames[i], onChain:true
        })));

        // Show my score
        const myIdx=players.findIndex(a=>a.toLowerCase()===wallet.address.toLowerCase());
        const myScoreBox=document.getElementById('my-score-box');
        if(myIdx>=0 && myScoreBox){
          myScoreBox.style.display='block';
          document.getElementById('my-score-val').textContent=Number(scores[myIdx]).toLocaleString()+' pts';
          document.getElementById('my-score-addr').textContent=wallet.address.slice(0,6)+'...'+wallet.address.slice(-4);
          document.getElementById('my-score-rank').textContent='Rank #'+(myIdx+1);
          document.getElementById('my-score-char').textContent=charNames[myIdx]||'—';
        }
        return;
      }
    } catch(err){ console.log('On-chain LB failed, falling back to local'); }
  }

  // Fallback — local leaderboard
  const lb=getLocalLeaderboard();
  if(!lb.length){
    lbEl.innerHTML='<div style="text-align:center;padding:20px;font-family:var(--vt);font-size:14px;color:#4040a0">No scores yet.<br>Be the first to play!</div>';
    return;
  }
  renderLeaderboard(lb);
}

function renderLeaderboard(entries){
  const lbEl=document.getElementById('lb-list');
  const medals=['🥇','🥈','🥉'];
  const rankClasses=['gold','silver','bronze'];
  lbEl.innerHTML=entries.map((e,i)=>{
    const isMe=wallet.address && e.address && e.address.toLowerCase()===wallet.address.toLowerCase();
    const rankLabel=i<3?medals[i]:(i+1);
    const rankClass=i<3?rankClasses[i]:'';
    const avatarHtml=e.avatarUrl
      ?`<img class="lb-avatar${e.isNFT?' nft':''}" src="${e.avatarUrl}" onerror="this.style.display='none'">`
      :`<div class="lb-char">${e.charIcon||'⚔️'}</div>`;
    return `<div class="lb-row${isMe?' me':''}">
      <div class="lb-rank ${rankClass}">${rankLabel}</div>
      ${avatarHtml}
      <div class="lb-info">
        <div class="lb-addr">${e.address?e.address.slice(0,6)+'...'+e.address.slice(-4):'—'}${isMe?' ← You':''}</div>
        ${e.username?`<div class="lb-username">@${e.username}</div>`:''}
        <div class="lb-meta">Lv ${e.level||1} · ${e.charName||'—'} · ${e.xp||0} XP${e.onChain?' ⛓':''}${e.isDemo?' (Demo)':''}</div>
      </div>
      <div class="lb-score">${(e.score||0).toLocaleString()}</div>
    </div>`;
  }).join('');
}

function showLeaderboard(){
  document.getElementById('btn-back-vic').style.display='block';
  loadLeaderboard();
  showScreen('leaderboard');
}
