// ============================================================
// ui.js — UI Helpers: screens, toast, header, modals
// ============================================================

function showToast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

function updateHeader() {
  const wEl = document.getElementById('hdr-wallet');
  const nEl = document.getElementById('hdr-net');
  const mEl = document.getElementById('menu-addr');
  const mnEl = document.getElementById('menu-net');
  if (wallet.address) {
    const short = wallet.address.slice(0,6)+'...'+wallet.address.slice(-4);
    if(wEl) wEl.textContent = short;
    if(nEl) nEl.textContent = wallet.isDemo ? 'Demo Mode' : 'Ritual Testnet';
    if(mEl) mEl.textContent = short + (wallet.isDemo ? ' (Demo)' : '');
    if(mnEl) mnEl.textContent = wallet.isDemo ? 'Demo Mode' : 'Ritual Testnet';
  } else {
    if(wEl) wEl.textContent = '—';
    if(nEl) nEl.textContent = 'Not connected';
  }
}

function setDot(color) {
  const dot = document.getElementById('hdr-dot');
  if(dot) dot.className = 'dot' + (color === 'red' ? ' red' : color === 'yellow' ? ' yellow' : '');
}

function resetBtn(btn, name) {
  btn.disabled = false;
  btn.querySelector('.wname').textContent = name;
}

function switchTab(name, el) {
  ['skills','log'].forEach(t => document.getElementById('tab-'+t).style.display = t === name ? '' : 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

// ---- Mode Selection ----

function selectModeEvent(){
  if(!wallet.address || wallet.isDemo){ showToast('❌ Connect a real wallet first!'); return; }
  enterEventArena();
}

function selectModeClassic(){
  if(!wallet.address){ showToast('❌ Connect wallet first!'); return; }
  var cd=document.getElementById('classic-dot');
  var ca=document.getElementById('classic-addr');
  var cn=document.getElementById('classic-net');
  if(cd) cd.className=document.getElementById('menu-dot').className;
  if(ca) ca.textContent=wallet.address?wallet.address.slice(0,6)+'...'+wallet.address.slice(-4):'—';
  if(cn) cn.textContent=wallet.isDemo?'Demo':'Ritual Testnet';
  showScreen('classic');
  renderCharList();
  renderCustomCharList();
  updateCreateCharButton();
}

function selectModeDemo(){
  if(!wallet.connected){
    wallet={connected:true,address:'0xDEMO'+Math.random().toString(16).slice(2,8).toUpperCase()+'429D',
      chainId:RITUAL_CHAIN_ID,isDemo:true,provider:null,wcProvider:null};
    sessionStorage.removeItem('wallet_disconnected');
  }
  renderDemoCharList();
  showScreen('demo');
}

function renderDemoCharList(){
  const list = document.getElementById('demo-char-list');
  if(!list) return;
  list.innerHTML = CHARS.map((c,i)=>`
    <div class="char-card" id="dc${i}" onclick="selectDemoChar(${i})" style="border-color:#2d4d2d">
      <div class="char-icon-box">${c.icon}</div>
      <div>
        <div class="char-name" style="color:#40ff80">${c.name}</div>
        <div class="char-meta">${c.cls} · HP ${c.maxhp} · ATK ${c.atk} · DEF ${c.def}</div>
      </div>
    </div>`).join('');
  selectDemoChar(0);
}

function selectDemoChar(i){
  document.querySelectorAll('[id^="dc"]').forEach(el=>{ el.classList.remove('selected'); const b=el.querySelector('.sel-badge'); if(b) b.remove(); });
  const el=document.getElementById('dc'+i);
  if(el){ el.classList.add('selected'); const b=document.createElement('span'); b.className='sel-badge'; b.textContent='Selected'; el.appendChild(b); }
  S.selectedChar=i;
}

function startDemoGame(){ S.selectedChar = S.selectedChar||0; startGame(); }

function updateEventCardLock(){
  const lockEl = document.getElementById('event-card-locked');
  if(!lockEl) return;
  lockEl.style.display = 'none';
}

// ---- Background Music ----

const bgMusic = document.getElementById('bg-music');
const musicBtn = document.getElementById('music-btn');
let musicOn = true;

function toggleMusic(){
  if(musicOn){ bgMusic.pause(); musicBtn.textContent='🔇 OFF'; musicOn=false; }
  else { bgMusic.play(); musicBtn.textContent='🎵 ON'; musicOn=true; }
}

document.addEventListener('click', function startMusic(){
  if(musicOn && bgMusic && bgMusic.paused){
    bgMusic.volume = 0.4;
    bgMusic.play().catch(()=>{});
  }
  document.removeEventListener('click', startMusic);
}, {once:true});
