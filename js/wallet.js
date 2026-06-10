// ============================================================
// wallet.js — Wallet Connection & Provider Logic
// ============================================================

let wallet = {
  connected: false, address: null, chainId: null,
  isDemo: false, provider: null, wcProvider: null
};
let wcURIValue = '';

// ---- Provider Detection ----

function getProvider(preferRabby = false) {
  if (window.ethereum && window.ethereum.providers && window.ethereum.providers.length) {
    const providers = window.ethereum.providers;
    if (preferRabby) {
      const rabby = providers.find(p => p.isRabby);
      if (rabby) return rabby;
    } else {
      const mm = providers.find(p => p.isMetaMask && !p.isRabby);
      if (mm) return mm;
    }
    return providers[0];
  }
  if (preferRabby && window.rabby) return window.rabby;
  return window.ethereum || null;
}

async function connectWithProvider(provider, btnId, btnLabel) {
  const btn = document.getElementById(btnId);
  btn.disabled = true;
  btn.querySelector('.wname').innerHTML = '<span class="spinner"></span>Connecting...';
  try {
    await provider.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
    const accounts = await provider.request({ method: 'eth_accounts' });
    if (!accounts || !accounts.length) {
      showToast('❌ No account selected');
      resetBtn(btn, btnLabel); return;
    }
    sessionStorage.removeItem('wallet_disconnected');
    wallet.address = accounts[0];
    wallet.connected = true;
    wallet.isDemo = false;
    wallet.provider = provider;
    wallet.chainId = await provider.request({ method: 'eth_chainId' });
    resetBtn(btn, btnLabel);

    provider.on('accountsChanged', (a) => {
      if (!a.length) { disconnectWallet(); return; }
      wallet.address = a[0]; updateHeader(); showToast('🔄 Account changed');
    });
    provider.on('chainChanged', (id) => {
      wallet.chainId = id; updateHeader();
      if (id.toLowerCase() !== RITUAL_CHAIN_ID.toLowerCase()) {
        showScreen('wrongnet'); setDot('yellow'); showToast('⚠️ Network changed!');
      } else { showScreen('menu'); setDot('green'); showToast('✅ Back on Ritual Testnet'); }
    });

    onConnected();
  } catch (e) {
    resetBtn(btn, btnLabel);
    if (e.code === 4001) showToast('❌ Rejected by user');
    else { console.error(e); showToast('❌ Error: ' + (e.message || 'Unknown')); }
  }
}

// ---- MetaMask ----

async function connectMetaMask() {
  const provider = getProvider(false);
  if (!provider) {
    showToast('❌ MetaMask not found! Please install it.');
    setTimeout(() => window.open('https://metamask.io/download/', '_blank'), 1200);
    return;
  }
  await connectWithProvider(provider, 'btn-metamask', 'MetaMask');
}

// ---- Rabby Wallet ----

async function connectRabby() {
  const provider = getProvider(true);
  if (!provider) {
    showToast('❌ Rabby Wallet not found! Please install it.');
    setTimeout(() => window.open('https://rabby.io/', '_blank'), 1200);
    return;
  }
  await connectWithProvider(provider, 'btn-rabby', 'Rabby Wallet');
}

// ---- WalletConnect ----

async function connectWalletConnect() {
  if (typeof window.EthereumProvider === 'undefined' && typeof window.WalletConnectProvider === 'undefined') {
    showToast('⏳ WalletConnect library loading, try again...');
    return;
  }
  const btn = document.getElementById('btn-wc');
  btn.disabled = true;
  btn.querySelector('.wname').innerHTML = '<span class="spinner"></span>Initializing...';
  try {
    const EthProvider = window.EthereumProvider || window.WalletConnectEthereumProvider;
    const wcProvider = await EthProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [1979],
      optionalChains: [1, 137, 56],
      showQrModal: false,
      metadata: {
        name: 'Ritual Arena',
        description: 'Turn-based game on Ritual Chain Testnet',
        url: window.location.origin,
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }
    });
    wcProvider.on('display_uri', (uri) => {
      wcURIValue = uri;
      showQRModal(uri);
      btn.querySelector('.wname').innerHTML = 'WalletConnect';
      btn.disabled = false;
    });
    wcProvider.on('connect', async () => {
      closeQRModal();
      if (sessionStorage.getItem('wallet_disconnected') === '1') {
        try { wcProvider.disconnect(); } catch(e) {}
        return;
      }
      sessionStorage.removeItem('wallet_disconnected');
      const accounts = await wcProvider.request({ method: 'eth_accounts' });
      wallet.address = accounts[0];
      wallet.connected = true;
      wallet.isDemo = false;
      wallet.wcProvider = wcProvider;
      wallet.chainId = '0x' + wcProvider.chainId.toString(16);
      resetBtn(btn, 'WalletConnect');
      onConnected();
    });
    wcProvider.on('disconnect', () => {
      showToast('🔌 WalletConnect disconnected');
      disconnectWallet();
    });
    await wcProvider.connect();
  } catch (e) {
    resetBtn(btn, 'WalletConnect');
    console.error('WC Error:', e);
    showWCFallback();
  }
}

function showWCFallback() {
  document.getElementById('qr-container').innerHTML = `
    <div style="padding:20px;color:#a8a0d0;font-size:13px;line-height:1.7">
      <div style="font-size:24px;margin-bottom:10px">📱</div>
      <b style="color:#fff">Manual WalletConnect:</b><br><br>
      1. Open your mobile wallet<br>
      2. Select "Connect Wallet" or scan QR<br>
      3. Enter URL: <span style="color:#7F77DD">${window.location.href}</span><br><br>
      <small>Or use MetaMask Extension / Demo Mode</small>
    </div>`;
  document.getElementById('qr-modal').classList.add('show');
  document.getElementById('wc-uri').textContent = 'Use MetaMask Extension for the best experience.';
}

// ---- QR Code ----

function showQRModal(uri) {
  document.getElementById('wc-uri').textContent = uri;
  document.getElementById('qr-modal').classList.add('show');
  if (typeof QRCode === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    script.onload = () => renderQR(uri);
    document.head.appendChild(script);
  } else {
    renderQR(uri);
  }
}

function renderQR(uri) {
  const container = document.getElementById('qr-container');
  if(container) container.innerHTML = '';
  new QRCode(container, { text: uri, width: 220, height: 220, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
}

function closeQRModal() { document.getElementById('qr-modal').classList.remove('show'); }
function copyURI() {
  if (!wcURIValue) return;
  navigator.clipboard.writeText(wcURIValue).then(() => showToast('✅ URI copied!'));
}

// ---- Demo Mode ----

function connectDemo() {
  wallet.address = '0xDEMO' + Math.random().toString(16).slice(2, 10).toUpperCase();
  wallet.connected = true;
  wallet.isDemo = true;
  wallet.chainId = RITUAL_CHAIN_ID;
  wallet.provider = null;
  showToast('🎮 Demo Mode — Choose your character!');
  S.selectedChar = 0;
  const demoList = document.getElementById('char-list-demo');
  if(demoList){
    demoList.innerHTML = CHARS.map((c,i)=>`
      <div class="char-card" id="dcc${i}" onclick="selectDemoCharCard(${i})">
        <div class="char-icon-box">${c.icon}</div>
        <div><div class="char-name">${c.name}</div><div class="char-meta">${c.cls} · HP ${c.maxhp} · ATK ${c.atk} · DEF ${c.def}</div></div>
      </div>`).join('');
    const first = document.getElementById('dcc0');
    if(first){ first.classList.add('selected'); const b=document.createElement('span'); b.className='sel-badge'; b.textContent='Selected'; first.appendChild(b); }
  }
  showScreen('demo-select');
}

function selectDemoCharCard(i){
  document.querySelectorAll('[id^="dcc"]').forEach(el=>{ el.classList.remove('selected'); const b=el.querySelector('.sel-badge'); if(b) b.remove(); });
  const el=document.getElementById('dcc'+i);
  if(el){ el.classList.add('selected'); const b=document.createElement('span'); b.className='sel-badge'; b.textContent='Selected'; el.appendChild(b); }
  S.selectedChar=i;
}

function startDemoFromSelect(){ startGame(); }

// ---- Connect Shared Logic ----

function onConnected() {
  updateHeader();
  const isCorrectNet = wallet.isDemo || (wallet.chainId && wallet.chainId.toLowerCase() === RITUAL_CHAIN_ID.toLowerCase());
  if (!isCorrectNet) {
    showScreen('wrongnet'); setDot('yellow');
    showToast('⚠️ Switch to Ritual Testnet! (Chain: ' + wallet.chainId + ')');
  } else {
    showScreen('menu'); setDot('green');
    const rb = document.getElementById('ritual-bal'); if(rb) rb.style.display = 'block';
    showToast('✅ Wallet connected!' + (wallet.isDemo ? ' (Demo)' : ''));
    renderCustomCharList();
    clearOldNFTData();
    updateCreateCharButton();
    loadNFTCharacter();
    loadPvpEnemyPool();
    loadEventInfo();
    updateEventCardLock();
    var md=document.getElementById('menu-dot'); if(md) md.className='dot green';
    var ma=document.getElementById('menu-addr'); if(ma) ma.textContent=wallet.address?wallet.address.slice(0,6)+'...'+wallet.address.slice(-4):'—';
    var mn=document.getElementById('menu-net'); if(mn) mn.textContent=wallet.isDemo?'Demo':'Ritual';
  }
}

async function addRitualNetwork() {
  const provider = wallet.provider || getProvider(false);
  if (wallet.isDemo || !provider) { showToast('⚠️ Wallet required to add network'); return; }
  try {
    await provider.request({ method: 'wallet_addEthereumChain', params: [RITUAL_CHAIN_PARAMS] });
    showToast('✅ Ritual Testnet added!');
    wallet.chainId = await provider.request({ method: 'eth_chainId' });
    onConnected();
  } catch (e) { showToast('❌ Failed: ' + e.message); }
}

// ---- Disconnect ----

function openDiscModal(){
  const addr = wallet.address ? wallet.address.slice(0,8)+'...'+wallet.address.slice(-6) : (wallet.isDemo ? '0xDEMO (Demo Mode)' : '—');
  document.getElementById('disc-modal-addr').textContent = addr;
  document.getElementById('disc-confirm-view').style.display = 'block';
  document.getElementById('disc-success-view').style.display = 'none';
  document.getElementById('disc-modal').classList.add('show');
}
function closeDiscModal(){ document.getElementById('disc-modal').classList.remove('show'); }

function confirmDisconnect(){
  disconnectWallet();
  document.getElementById('disc-confirm-view').style.display = 'none';
  document.getElementById('disc-success-view').style.display = 'block';
  showScreen('connect');
}

function disconnectWallet() {
  if (wallet.wcProvider) { try { wallet.wcProvider.disconnect(); } catch(e){} }
  if (wallet.provider) {
    try { wallet.provider.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }); } catch(e) {}
  }
  sessionStorage.setItem('wallet_disconnected', '1');
  wallet = { connected: false, address: null, chainId: null, isDemo: false, provider: null, wcProvider: null };
  updateHeader(); setDot('red');
  const rb2 = document.getElementById('ritual-bal'); if(rb2) rb2.style.display = 'none';
  showScreen('connect');
  showToast('🔌 Wallet disconnected');
}

// ---- Auto-reconnect on load ----

window.addEventListener('load', () => {
  setTimeout(() => {
    const allProviders = (window.ethereum && window.ethereum.providers) || [];
    const hasRabby = !!window.rabby || !!(window.ethereum && window.ethereum.isRabby) || allProviders.some(p => p.isRabby);
    const hasMM = !!(window.ethereum && window.ethereum.isMetaMask && !window.ethereum.isRabby) || allProviders.some(p => p.isMetaMask && !p.isRabby) || (!hasRabby && !!window.ethereum);
    const mmEl = document.getElementById('mm-status');
    if(mmEl){ mmEl.textContent = hasMM ? '✓' : '✗'; mmEl.style.color = hasMM ? '#5DCAA5' : '#f09595'; }
    const rabbyEl = document.getElementById('rabby-status');
    if(rabbyEl){ rabbyEl.textContent = hasRabby ? '✓' : '✗'; rabbyEl.style.color = hasRabby ? '#5DCAA5' : '#f09595'; }

    if(sessionStorage.getItem('wallet_disconnected') !== '1' && window.ethereum){
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if(accounts && accounts.length > 0){
          wallet.address = accounts[0];
          wallet.connected = true;
          wallet.isDemo = false;
          wallet.provider = window.ethereum;
          window.ethereum.request({ method: 'eth_chainId' }).then(chainId => {
            wallet.chainId = chainId;
            onConnected();
          }).catch(()=>{});
          window.ethereum.on('accountsChanged', (a) => {
            if(!a.length){ disconnectWallet(); return; }
            wallet.address = a[0]; updateHeader(); showToast('🔄 Account changed');
          });
          window.ethereum.on('chainChanged', (id) => {
            wallet.chainId = id; updateHeader();
            if(id.toLowerCase() !== RITUAL_CHAIN_ID.toLowerCase()){
              showScreen('wrongnet'); setDot('yellow');
            } else { showScreen('menu'); setDot('green'); }
          });
        }
      }).catch(()=>{});
    }
  }, 600);
  if(document.getElementById('lb-list')) loadLeaderboard();
});
