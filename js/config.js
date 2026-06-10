// ============================================================
// config.js — Network & Contract Configuration
// ============================================================

// Ritual Chain
const RITUAL_CHAIN_ID = '0x7BB'; // 1979
const RITUAL_CHAIN_PARAMS = {
  chainId: RITUAL_CHAIN_ID,
  chainName: 'Ritual Testnet',
  nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: ['https://rpc.ritualfoundation.org'],
  blockExplorerUrls: ['https://explorer.ritualfoundation.org']
};

// WalletConnect Project ID — get yours at cloud.walletconnect.com
const WC_PROJECT_ID = 'b56e18d47c72ab683b10814fe9495694';

// Backend (for AI character generation)
const BACKEND_URL = 'https://ritualarena1.vercel.app';

// ============================================================
// Score Contract (Classic Leaderboard)
// ============================================================
const CONTRACT_ADDRESS = '0xB96Cf73c7D528E95F2AaD71fCE938B98989275B3';
const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType":"uint256","name":"score","type":"uint256"},
      {"internalType":"uint256","name":"xp","type":"uint256"},
      {"internalType":"uint256","name":"wins","type":"uint256"},
      {"internalType":"uint8","name":"level","type":"uint8"},
      {"internalType":"string","name":"charName","type":"string"}
    ],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType":"address","name":"player","type":"address"}],
    "name": "getScore",
    "outputs": [
      {"internalType":"uint256","name":"score","type":"uint256"},
      {"internalType":"uint256","name":"xp","type":"uint256"},
      {"internalType":"uint256","name":"wins","type":"uint256"},
      {"internalType":"uint8","name":"level","type":"uint8"},
      {"internalType":"string","name":"charName","type":"string"},
      {"internalType":"uint256","name":"timestamp","type":"uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTopScores",
    "outputs": [
      {"internalType":"address[]","name":"players","type":"address[]"},
      {"internalType":"uint256[]","name":"scores","type":"uint256[]"},
      {"internalType":"uint256[]","name":"xps","type":"uint256[]"},
      {"internalType":"uint8[]","name":"levels","type":"uint8[]"},
      {"internalType":"string[]","name":"charNames","type":"string[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed":true,"internalType":"address","name":"player","type":"address"},
      {"indexed":false,"internalType":"uint256","name":"score","type":"uint256"},
      {"indexed":false,"internalType":"uint256","name":"xp","type":"uint256"}
    ],
    "name": "ScoreSubmitted",
    "type": "event"
  }
];

// ============================================================
// NFT Character Contract
// ============================================================
const NFT_CONTRACT_ADDRESS = '0x592d75AC5aB1B04cA4109FBa9f08A69fDc2D566C';
const NFT_ABI = [
  'function mintCharacter(string username, string avatarUrl, string charName, string cls, string lore, uint16 hp, uint16 atk, uint16 def, uint16 mp, uint16 healPow) external',
  'function hasCharacter(address wallet) external view returns (bool)',
  'function usernameTaken(string username) external view returns (bool)',
  'function getCharacterByWallet(address wallet) external view returns (tuple(string username, string avatarUrl, string charName, string cls, string lore, uint16 hp, uint16 atk, uint16 def, uint16 mp, uint16 healPow, uint256 mintedAt, address owner))',
  'function getAllCharacters() external view returns (tuple(string username, string avatarUrl, string charName, string cls, string lore, uint16 hp, uint16 atk, uint16 def, uint16 mp, uint16 healPow, uint256 mintedAt, address owner)[])',
  'function getRandomEnemies(address caller, uint256 count) external view returns (tuple(string username, string avatarUrl, string charName, string cls, string lore, uint16 hp, uint16 atk, uint16 def, uint16 mp, uint16 healPow, uint256 mintedAt, address owner)[])',
  'function burnCharacter() external',
];

// ============================================================
// Event Contract (Rank Event)
// ============================================================
const EVENT_CONTRACT_ADDRESS = '0xc06D367E65Fcc8D87E4Df9Be6ff925468F63751B';
const EVENT_ABI = [
  'function getEventInfo() external view returns (bool active, string name, string description, string bannerColor, uint256 startTime, uint256 endTime, uint256 totalPlayers)',
  'function submitScore(uint256 score, uint256 wave, string username, string avatarUrl, string charName) external',
  'function getLeaderboard(uint256 limit) external view returns (tuple(address player, string username, string avatarUrl, string charName, uint256 score, uint256 wave, uint256 timestamp)[])',
  'function getMyScore() external view returns (tuple(address player, string username, string avatarUrl, string charName, uint256 score, uint256 wave, uint256 timestamp))',
];

// ============================================================
// Game Data
// ============================================================
const CHARS = [
  {id:'node',name:'Jez Runner',cls:'Strong Fighter',hp:130,maxhp:130,mp:80,maxmp:80,atk:18,def:8,healPow:30,
   icon:'<img src="https://raw.githubusercontent.com/arifhidayat1/ritualarena1/main/jezzCharArena.gif" style="width:48px;height:48px;image-rendering:pixelated">',
   skills:[
    {id:'s1',name:'Infernet Strike',desc:'Infernet node strike',dmg:28,mpCost:15,type:'dmg'},
    {id:'s2',name:'AI Compute',desc:'Summon AI model — massive damage',dmg:50,mpCost:30,type:'dmg'},
    {id:'s3',name:'Regen Node',desc:'Restore HP and refill mana — 9 turn cooldown',heal:25,manaHeal:15,mpCost:0,cooldown:9,type:'cooldown'},
    {id:'s4',name:'Fork Network',desc:'Attack twice in a row',dmg:22,mpCost:25,type:'multi'}
  ]},
  {id:'val',name:'Mad Steel',cls:'Strong Guardian',hp:170,maxhp:170,mp:60,maxmp:60,atk:22,def:16,healPow:40,
   icon:'<img src="https://raw.githubusercontent.com/arifhidayat1/ritualarena1/main/madCharArena.gif" style="width:48px;height:48px;image-rendering:pixelated">',
   skills:[
    {id:'s1',name:'Slash TX',desc:'Punish enemy with a rogue transaction',dmg:32,mpCost:18,type:'dmg'},
    {id:'s2',name:'Consensus Blast',desc:'Consensus power explosion',dmg:55,mpCost:35,type:'dmg'},
    {id:'s3',name:'Epoch Regen',desc:'Fully restore HP & Mana, 12 turn cooldown',heal:50,manaHeal:40,mpCost:0,cooldown:12,type:'cooldown'},
    {id:'s4',name:'Finality Strike',desc:'Always hits, never misses',dmg:38,mpCost:28,type:'sure'}
  ]},
  {id:'mage',name:'Flash Shadow',cls:'Strong Mage',hp:95,maxhp:95,mp:130,maxmp:130,atk:29,def:5,healPow:20,
   icon:'<img src="https://raw.githubusercontent.com/arifhidayat1/ritualarena1/main/flashCharArena.gif" style="width:48px;height:48px;image-rendering:pixelated">',
   skills:[
    {id:'s1',name:'Deploy Contract',desc:'Throw a smart contract as a bomb',dmg:22,mpCost:10,type:'dmg'},
    {id:'s2',name:'Reentrancy Bug',desc:'Exploit a vulnerability — massive damage',dmg:65,mpCost:40,type:'dmg'},
    {id:'s3',name:'Audit Shield',desc:'Code audit protection',heal:18,mpCost:12,type:'heal'},
    {id:'s4',name:'MEV Drain',desc:'Drain enemy HP, restore your mana',dmg:32,manaHeal:20,mpCost:18,type:'drain'}
  ]}
];

const ENEMIES = [
  {name:'Sybil Bot',type:'Spam Attacker',hp:85,maxhp:85,atk:13,def:4,xp:30,icon:'🤖',moves:['Spam Flood','Bot Attack','Network Noise']},
  {name:'Double Signer',type:'Byzantine Node',hp:120,maxhp:120,atk:19,def:9,xp:50,icon:'⚡',moves:['Double Sign','Fork Chaos','Byzantine Strike']},
  {name:'Rug Puller',type:'Malicious DEX',hp:155,maxhp:155,atk:26,def:13,xp:80,icon:'💸',moves:['Liquidity Drain','Exit Scam','Rug Pull!']},
  {name:'51% Attacker',type:'Chain Threat',hp:210,maxhp:210,atk:33,def:19,xp:120,icon:'💀',moves:['Reorg Attack','Double Spend','Chain Takeover']},
  {name:'Flash Loan Bot',type:'DeFi Predator',hp:140,maxhp:140,atk:29,def:7,xp:70,icon:'🌊',moves:['Flash Loan','Arbitrage Strike','Price Manipulation']}
];

const CHAR_ICONS = {'Jez Runner':'⚙️','Mad Steel':'🛡️','Flash Shadow':'⚡'};
const LB_KEY = 'ritual_arena_leaderboard_v2';

// Local event config fallback
const LOCAL_EVENT = {
  active: false,
  name: 'Rank Event Season 1',
  description: 'NFT holders only - compete for the top rank!',
  bannerColor: '#ff4040',
};
