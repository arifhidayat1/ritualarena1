// Vercel Serverless Function
// Deploy: taruh file ini di folder /api/ di repo GitHub
// URL: https://ritualarena1.vercel.app/api/generate

export default function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const clean = username.replace('@', '').toLowerCase().trim();

  // Deterministic stat generation from username
  const seed = clean.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (min, max) => min + (Math.abs(seed * 1234567) % (max - min + 1) | 0);

  const followers = rand(100, 50000);
  const tweets    = rand(50, 10000);
  const following = rand(50, 5000);

  const hp      = Math.min(200, Math.max(80,  80  + Math.floor(Math.log10(followers + 1) * 20)));
  const atk     = Math.min(35,  Math.max(10,  10  + Math.floor(Math.log10(tweets + 1) * 6)));
  const ratio   = following > 0 ? followers / following : 1;
  const def     = Math.min(20,  Math.max(3,   Math.floor(ratio * 3) + 3));
  const mp      = 80;
  const healPow = Math.min(50,  Math.max(15,  Math.floor(hp * 0.25)));
  const cls     = atk >= 28 ? 'Viral Striker'
                : def >= 15 ? 'Sentinel Node'
                : hp  >= 160 ? 'Sovereign Validator'
                : 'Chain Wanderer';

  const avatarUrl = `https://unavatar.io/twitter/${clean}`;
  const lore = `${clean} emerged from X, bringing their legacy to Ritual Arena.`;

  const skills = [
    { id:'s1', name:'Timeline Strike', desc:'Signature attack',        dmg:Math.floor(atk*1.4), mpCost:12, type:'dmg'   },
    { id:'s2', name:'Viral Burst',     desc:'Massive follower power',  dmg:Math.floor(atk*2.2), mpCost:28, type:'dmg'   },
    { id:'s3', name:'Echo Chamber',    desc:'Restore HP',             heal:Math.floor(healPow*1.3), mpCost:15, type:'heal'  },
    { id:'s4', name:'Retweet Drain',   desc:'Drain enemy, restore mana', dmg:Math.floor(atk*1.1), manaHeal:20, mpCost:10, type:'drain' },
  ];

  return res.status(200).json({
    success: true,
    // Agent format
    charName:  clean,
    sprite:    avatarUrl,
    hp, atk, def, mp,
    // Game format
    character: {
      id:        'x_' + clean,
      username:  clean,
      name:      clean,
      avatarUrl,
      isCustom:  true,
      hp, maxhp: hp,
      atk, def,
      mp, maxmp: mp,
      healPow, cls, lore, skills,
    }
  });
}
