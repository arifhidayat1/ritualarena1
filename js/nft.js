// ============================================================
// nft.js — NFT Character: Generate, Mint, Burn, Load
// ============================================================

let generatedChar = null;

// ---- Modal ----

function openCustomModal(){
  document.getElementById('custom-modal').classList.add('show');
  document.getElementById('gen-status').textContent='';
  document.getElementById('char-preview').classList.remove('show');
  document.getElementById('btn-save-char').style.display='none';
  document.getElementById('x-username-input').value='';
  generatedChar=null;
}
function closeCustomModal(){ document.getElementById('custom-modal').classList.remove('show'); }

// ---- Generate via API ----

async function generateCustomChar(){
  const username=document.getElementById('x-username-input').value.trim().replace('@','');
  if(!username){ showToast('❌ Enter your X username first!'); return; }
  const btn=document.getElementById('btn-gen-char');
  btn.disabled=true; btn.textContent='⏳...';
  document.getElementById('gen-status').innerHTML='<span class="spinner"></span> Generating your character...';
  document.getElementById('char-preview').classList.remove('show');
  document.getElementById('btn-save-char').style.display='none';
  generatedChar=null;
  try {
    const res=await fetch(BACKEND_URL+'/api/generate',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username})
    });
    const data=await res.json();
    if(!data.success) throw new Error(data.error||'Failed');
    const c=data.character;
    generatedChar=c;
    document.getElementById('preview-avatar').src=c.avatarUrl||'';
    document.getElementById('preview-name').textContent=c.name;
    document.getElementById('preview-class').textContent=c.cls;
    document.getElementById('preview-hp').textContent=c.hp;
    document.getElementById('preview-atk').textContent=c.atk;
    document.getElementById('preview-def').textContent=c.def;
    document.getElementById('preview-mp').textContent=c.mp;
    document.getElementById('preview-heal').textContent=c.healPow;
    document.getElementById('preview-cls').textContent=c.cls.split(' ')[0];
    document.getElementById('preview-lore').textContent=c.lore;
    document.getElementById('preview-skills').innerHTML=(c.skills||[]).map(s=>
      `<div style="font-family:var(--vt);font-size:11px;color:#a0a0d0;margin-bottom:2px">⚡ <b>${s.name}</b> — ${s.desc} (MP:${s.mpCost})</div>`
    ).join('');
    document.getElementById('char-preview').classList.add('show');
    document.getElementById('btn-save-char').style.display='inline-block';

    // Check if username already taken on-chain
    if(!wallet.isDemo && wallet.address){
      try {
        const provider=new ethers.providers.Web3Provider(wallet.provider);
        const contract=new ethers.Contract(NFT_CONTRACT_ADDRESS,NFT_ABI,provider);
        const taken=await contract.usernameTaken(username);
        if(taken){
          document.getElementById('gen-status').innerHTML='⚠️ <span style="color:#ff8040">@'+username+' is already minted by another player — you can save but cannot mint this username.</span>';
          document.getElementById('btn-mint-char').style.display='none';
        } else {
          document.getElementById('btn-mint-char').style.display='inline-block';
          document.getElementById('gen-status').textContent='✅ Character generated! Username available to mint.';
        }
      } catch(e){
        document.getElementById('btn-mint-char').style.display=wallet.isDemo?'none':'inline-block';
        document.getElementById('gen-status').textContent='✅ Character generated!';
      }
    } else {
      document.getElementById('btn-mint-char').style.display=wallet.isDemo?'none':'inline-block';
      document.getElementById('gen-status').textContent='✅ Character generated!';
    }
  } catch(err){
    document.getElementById('gen-status').textContent='❌ Failed: '+err.message;
  }
  btn.disabled=false; btn.textContent='⚡ Generate';
}

// ---- Save locally ----

function saveCustomChar(){
  if(!generatedChar) return;
  const key='customChars_'+(wallet.address||'demo');
  let saved=[]; try{ saved=JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){}
  const idx=saved.findIndex(c=>c.username===generatedChar.username);
  if(idx>=0) saved[idx]=generatedChar; else saved.push(generatedChar);
  localStorage.setItem(key,JSON.stringify(saved));
  showToast('✅ @'+generatedChar.username+' saved!');
  closeCustomModal();
  renderCustomCharList();
}

function loadCustomChars(){
  const key='customChars_'+(wallet.address||'demo');
  try{ return JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){ return []; }
}

function deleteCustomChar(username){
  const key='customChars_'+(wallet.address||'demo');
  const remaining=loadCustomChars().filter(c=>c.username!==username);
  localStorage.setItem(key,JSON.stringify(remaining));
  if(typeof S.selectedChar==='string' && S.selectedChar==='custom_'+username) S.selectedChar=0;
  renderCustomCharList();
  showToast('🗑️ Character deleted');
  updateCreateCharButton();
}

function renderCustomCharList(){
  const saved=loadCustomChars();
  const section=document.getElementById('custom-char-section');
  const list=document.getElementById('custom-char-list');
  if(section) section.style.display=saved.length?'block':'none';
  if(list) list.innerHTML=saved.map((c,i)=>`
    <div class="custom-saved-item" id="cc_custom_${i}" onclick="selectCustomChar(${i})">
      <img class="custom-saved-avatar" src="${c.avatarUrl||''}" onerror="this.style.display='none'">
      <div style="flex:1">
        <div class="custom-saved-name">${c.name} <span style="color:#6060a0">@${c.username}</span>${c.isNFT?'<span style="background:#a855f7;color:#fff;font-size:5px;padding:2px 5px;font-family:var(--pixel);margin-left:4px">NFT</span>':''}</div>
        <div class="custom-saved-meta">${c.cls||'NFT Fighter'} · HP ${c.hp} · ATK ${c.atk} · DEF ${c.def}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
        ${c.isNFT?`<button onclick="event.stopPropagation();burnNFTChar('${c.username}')" style="background:rgba(120,0,120,0.4);border:1px solid rgba(180,0,180,0.5);color:#ff80ff;padding:2px 6px;font-size:7px;cursor:pointer;font-family:var(--pixel)" title="Burn NFT on-chain">🔥</button>`:''}
        <button onclick="event.stopPropagation();deleteCustomChar('${c.username}')" style="background:rgba(150,30,30,0.4);border:1px solid rgba(200,50,50,0.4);color:#ff8080;padding:2px 6px;font-size:8px;cursor:pointer;font-family:var(--pixel)">✕</button>
      </div>
    </div>`).join('');
  updateCreateCharButton();
}

function selectCustomChar(i){
  document.querySelectorAll('.char-card').forEach(el=>{ el.classList.remove('selected'); const b=el.querySelector('.sel-badge'); if(b)b.remove(); });
  document.querySelectorAll('[id^="cc_custom_"]').forEach(el=>el.classList.remove('selected'));
  const el=document.getElementById('cc_custom_'+i);
  if(el) el.classList.add('selected');
  S.selectedChar='custom_'+i;
}

// ---- Mint NFT ----

async function mintCharacterNFT(){
  if(!generatedChar){ showToast('❌ Generate a character first!'); return; }
  if(!wallet.address||wallet.isDemo){ showToast('❌ Connect a real wallet first!'); return; }
  const btn=document.getElementById('btn-mint-char');
  btn.disabled=true; btn.textContent='⏳ Checking...';
  try {
    const provider=new ethers.providers.Web3Provider(wallet.provider);
    const signer=provider.getSigner();
    const contract=new ethers.Contract(NFT_CONTRACT_ADDRESS,NFT_ABI,signer);
    const c=generatedChar;
    const taken=await contract.usernameTaken(c.username);
    if(taken){
      showToast('❌ @'+c.username+' is already minted by another player!');
      btn.disabled=false; btn.textContent='🎖 Mint as NFT'; return;
    }
    btn.textContent='⏳ Minting...';
    const tx=await contract.mintCharacter(c.username,c.avatarUrl||'',c.name,c.cls,c.lore||'',c.hp,c.atk,c.def,c.mp,c.healPow);
    document.getElementById('gen-status').innerHTML='<span class="spinner"></span> Waiting for confirmation...';
    await tx.wait();
    saveCustomChar();
    showToast('🎖 NFT minted! Character saved on-chain!');
    document.getElementById('gen-status').textContent='🎖 NFT minted on Ritual Chain!';
    btn.textContent='✅ Minted!';
    var btnCreate=document.getElementById('btn-create-char');
    if(btnCreate) btnCreate.style.display='none';
  } catch(err){
    if(err.message&&err.message.includes('Already have')) showToast('❌ Wallet already has a character NFT!');
    else showToast('❌ Mint failed: '+(err.reason||err.message));
    btn.disabled=false; btn.textContent='🎖 Mint as NFT';
  }
}

// ---- Load NFT from chain ----

async function loadNFTCharacter(){
  if(!wallet.address||wallet.isDemo) return;
  try {
    const provider=new ethers.providers.Web3Provider(wallet.provider);
    const contract=new ethers.Contract(NFT_CONTRACT_ADDRESS,NFT_ABI,provider);
    const hasNFT=await contract.hasCharacter(wallet.address);
    if(!hasNFT) return;
    const data=await contract.getCharacterByWallet(wallet.address);
    const nftChar={
      id:'nft_'+data.username.toLowerCase(),
      username:data.username, name:data.charName||data.username,
      avatarUrl:data.avatarUrl, cls:data.cls||'NFT Fighter', lore:data.lore||'',
      hp:Number(data.hp), maxhp:Number(data.hp),
      atk:Number(data.atk), def:Number(data.def),
      mp:Number(data.mp), maxmp:Number(data.mp),
      healPow:Number(data.healPow),
      level:1, xp:0, xpNext:100,
      isCustom:true, isNFT:true,
      skills:[
        {id:'s1',name:'Timeline Strike',desc:'Signature attack',dmg:Math.floor(Number(data.atk)*1.4),mpCost:12,type:'dmg'},
        {id:'s2',name:'Viral Burst',desc:'Massive follower power',dmg:Math.floor(Number(data.atk)*2.2),mpCost:28,type:'dmg'},
        {id:'s3',name:'Echo Chamber',desc:'Restore HP',heal:Math.floor(Number(data.healPow)*1.3),mpCost:15,type:'heal'},
        {id:'s4',name:'Retweet Drain',desc:'Drain enemy restore mana',dmg:Math.floor(Number(data.atk)*1.1),manaHeal:20,mpCost:10,type:'drain'},
      ]
    };
    const key='customChars_'+wallet.address;
    let saved=[]; try{ saved=JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){}
    const idx=saved.findIndex(c=>c.username===nftChar.username);
    if(idx>=0) saved[idx]=nftChar; else saved.unshift(nftChar);
    localStorage.setItem(key,JSON.stringify(saved));
    renderCustomCharList();
    showToast('🎖 NFT character loaded: @'+data.username);
    var btnCreate=document.getElementById('btn-create-char');
    if(btnCreate) btnCreate.style.display='none';
  } catch(err){ console.error('NFT load:',err.message); }
}

// ---- Burn NFT ----

async function burnNFTChar(username){
  if(!wallet.address||wallet.isDemo){ showToast('❌ Connect a real wallet first!'); return; }
  if(!confirm('🔥 Burn NFT @'+username+'?\n\nThis will permanently delete your NFT on-chain.\n\nThis cannot be undone!')) return;
  try {
    const provider=new ethers.providers.Web3Provider(wallet.provider);
    const signer=provider.getSigner();
    const contract=new ethers.Contract(NFT_CONTRACT_ADDRESS,['function burnCharacter() external'],signer);
    showToast('⏳ Burning NFT...');
    const tx=await contract.burnCharacter();
    await tx.wait();
    deleteCustomChar(username);
    showToast('🔥 NFT @'+username+' burned! You can now mint a new character.');
    updateCreateCharButton();
  } catch(err){ showToast('❌ Burn failed: '+(err.reason||err.message)); }
}

// ---- Create Button Visibility ----

function updateCreateCharButton(){
  const saved=loadCustomChars();
  const hasNFT=saved.some(c=>c.isNFT);

  var wrapper=document.getElementById('btn-create-char-wrapper');
  if(wrapper) wrapper.style.display=(!hasNFT&&wallet.address&&!wallet.isDemo)?'block':'none';

  var nftSection=document.getElementById('menu-nft-section');
  if(nftSection){
    if(hasNFT){
      const nftChar=saved.find(c=>c.isNFT);
      nftSection.style.display='block';
      nftSection.innerHTML=`
        <div style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.4);padding:12px;border-radius:4px">
          <div style="font-size:6px;color:#a855f7;font-family:var(--pixel);margin-bottom:8px;letter-spacing:1px">── YOUR NFT CHARACTER ──</div>
          <div style="display:flex;align-items:center;gap:10px">
            <img src="${nftChar.avatarUrl||''}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;border:2px solid #a855f7" onerror="this.style.display='none'">
            <div style="flex:1">
              <div style="font-family:var(--pixel);font-size:7px;color:#a855f7">${nftChar.name||nftChar.username} <span style="background:#a855f7;color:#fff;font-size:5px;padding:1px 4px">NFT</span></div>
              <div style="font-family:var(--vt);font-size:12px;color:#8080b0">${nftChar.cls||'NFT Fighter'} · HP ${nftChar.hp} · ATK ${nftChar.atk}</div>
              <div style="font-family:var(--vt);font-size:11px;color:#6060a0">@${nftChar.username}</div>
            </div>
            <button onclick="burnNFTChar('${nftChar.username}')" style="background:rgba(120,0,120,0.4);border:1px solid rgba(180,0,180,0.5);color:#ff80ff;padding:4px 8px;font-size:7px;cursor:pointer;font-family:var(--pixel)">🔥 Burn</button>
          </div>
        </div>`;
    } else {
      nftSection.style.display='none';
    }
  }

  var btnCreate=document.getElementById('btn-create-char');
  if(btnCreate) btnCreate.style.display=hasNFT?'none':'';
}

function clearOldNFTData(){
  const key='customChars_'+(wallet.address||'demo').toLowerCase();
  try {
    let saved=JSON.parse(localStorage.getItem(key)||'[]');
    const filtered=saved.filter(c=>!c.isNFT);
    localStorage.setItem(key,JSON.stringify(filtered));
  } catch(e){}
}
