const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());


// Generate profile data from username only (no scraping needed)
function buildProfileFromUsername(username) {
  // Deterministic stat generation from username string
  const seed = username.toLowerCase().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (min, max) => min + (seed * 1234567 % (max - min + 1) | 0);

  const followers = rand(100, 50000);
  const tweets    = rand(50, 10000);
  const following = rand(50, 5000);
  const bio       = '';

  return { username, displayName: username, bio, followers, tweets, following,
    avatar: `https://unavatar.io/twitter/${username}`,
    instance: 'unavatar' };
}

// Generate game stats from profile data
function generateStats(profile) {
  const { followers, tweets, following, bio, displayName } = profile;

  // HP: based on followers (more followers = more HP), cap 200
  const hp = Math.min(200, Math.max(80, 80 + Math.floor(Math.log10(followers + 1) * 20)));

  // ATK: based on tweet frequency (active = higher atk), cap 35
  const atk = Math.min(35, Math.max(10, 10 + Math.floor(Math.log10(tweets + 1) * 6)));

  // DEF: based on following/followers ratio (more selective = higher def)
  const ratio = following > 0 ? followers / following : 1;
  const def = Math.min(20, Math.max(3, Math.floor(ratio * 3) + 3));

  // MP: based on bio length (more expressive = more MP)
  const mp = Math.min(140, Math.max(50, 50 + (bio.length * 0.8)));

  // Heal power
  const healPow = Math.min(50, Math.max(15, Math.floor(hp * 0.25)));

  // Class based on dominant stat
  let cls;
  if (atk >= 28)       cls = 'Viral Striker';
  else if (def >= 15)  cls = 'Sentinel Node';
  else if (hp >= 160)  cls = 'Sovereign Validator';
  else if (mp >= 120)  cls = 'Infernet Mage';
  else                 cls = 'Chain Wanderer';

  // Lore from bio or fallback
  const lore = bio
    ? `"${bio.slice(0, 80)}${bio.length > 80 ? '...' : ''}" — now forged into a warrior of Ritual Chain.`
    : `${displayName} emerged from the depths of X, bringing their on-chain legacy to Ritual Arena.`;

  // 4 skills themed to profile
  const skills = [
    {
      id: 's1',
      name: 'Timeline Strike',
      desc: `${displayName}'s signature attack`,
      dmg: Math.floor(atk * 1.4),
      mpCost: 12,
      type: 'dmg'
    },
    {
      id: 's2',
      name: 'Viral Burst',
      desc: 'Unleash follower power — massive damage',
      dmg: Math.floor(atk * 2.2),
      mpCost: 28,
      type: 'dmg'
    },
    {
      id: 's3',
      name: 'Echo Chamber',
      desc: 'Restore HP from community support',
      heal: Math.floor(healPow * 1.3),
      mpCost: 15,
      type: 'heal'
    },
    {
      id: 's4',
      name: 'Retweet Drain',
      desc: 'Siphon enemy strength, restore mana',
      dmg: Math.floor(atk * 1.1),
      manaHeal: 20,
      mpCost: 10,
      type: 'drain'
    }
  ];

  return {
    hp: Math.round(hp),
    maxhp: Math.round(hp),
    atk: Math.round(atk),
    def: Math.round(def),
    mp: Math.round(mp),
    maxmp: Math.round(mp),
    healPow: Math.round(healPow),
    cls,
    lore,
    skills
  };
}

app.post('/api/twitter-to-nft', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  try {
    const profile = buildProfileFromUsername(username.replace('@', ''));
    const stats   = generateStats(profile);
    console.log(`✅ Character generated for @${profile.username}`);
    return res.json({
      // Agent format (index.html expects these)
      charName: profile.displayName,
      sprite: profile.avatar,
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      mp: stats.mp,
      // Game format
      success: true,
      character: {
        id: 'x_' + profile.username.toLowerCase(),
        username: profile.username,
        name: profile.displayName,
        avatarUrl: profile.avatar,
        isCustom: true,
        ...stats
      }
    });
  } catch (err) {
    console.error('❌ Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Also support new endpoint name
app.post('/api/twitter-to-character', async (req, res) => {
  req.url = '/api/twitter-to-nft';
  app._router.handle(req, res);
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`🎮 Ritual Arena Backend running on http://localhost:${PORT}`);
  console.log(`   POST /api/twitter-to-character`);
  console.log(`   GET  /health`);
});

