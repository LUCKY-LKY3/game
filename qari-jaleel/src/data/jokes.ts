// Short, clean one-liners for Endless Mohalla banter. Keep each under ~60 characters so bubbles stay tidy.

/** Generic cousin trash talk, said by a random cousin on screen */
export const COUSIN_TAUNTS: string[] = [
  'I told Uncle I was getting milk!',
  "My cousin's cousin is bigger than you!",
  'I only came for the free chai!',
  'Wait, is this the wedding?',
  "I'm not fighting, I'm stretching!",
  'My WiFi is faster than you!',
  'You hit like my Nani!',
  'I have a degree in beating people up!',
  'This is for the last cricket match!',
  'Who stole my slippers? YOU?!',
  "I'll tell your Aunty!",
  'Come here, I will sell you insurance!',
  "My horoscope said don't fight today...",
  'Brother, I am just the intern!',
  'Where is the DJ? I need a theme song!',
  "I've got three uncles who are lawyers!",
  'Is that all? My ceiling fan hits harder!',
  "Hold my chai, I'm going in!",
  'I ate seven jalebis for this!',
  'Mohalla WhatsApp group will hear about this!',
];

/** Lines tied to a particular cousin */
export const SPECIFIC_TAUNTS: Record<string, string[]> = {
  bunty: ["Bunty is here! Everyone clap!", 'I am the main character!'],
  golu: ['Golu does not do running!', 'Do not call me chubby!'],
  tinku: ["Tinku's got a new haircut. Notice?", 'I am small but my ego is XL!'],
  chintu: ['Chintu goes zoom zoom!', "I'm late for my own fight!"],
  pappu: ['Pappu passed! Barely!', 'Pappu can fix this with duct tape!'],
  lathi_lala: ["Lala's lathi has a name. Karen.", 'Mind the lathi, it bites!'],
  kalu_goon: ['Kalu loves a good scuffle!', 'Kalu skipped breakfast for this!'],
  chappal_chacha: ['Chappal incoming! Uncle style!', 'Catch my slipper, beta!'],
  thali_tiwari: ['My thali is dishwasher safe!', 'Hit the plate, I dare you!'],
  moti_pehelwan: ['Moti has entered the chat!', 'I train on samosas!'],
  raju_bike: ['Beep beep! Raju delivery!', 'Raju has no brakes!'],
  bullhorn_bhai: ['TESTING TESTING, ONE TWO!', 'MY MIC IS ON, YOUR EARS ARE OFF!'],
  jeb_katra: ['Nice power bar you have there...', "Just borrowing it, bro!"],
  chappal_chaudhary: ['Chaudhary has chappals for days!', 'Slipper storm warning!'],
  dhol_daku: ['Dhol Daku is here, dance or else!', "I'll drum you into next week!"],
  bade_tau: ['Back in my day we fought uphill!', 'Tau always wins, beta!'],
};

/** What the heroes say now and then. Keyed by moment. */
export const HERO_QUIPS: Record<'dodge' | 'streak' | 'lowhp' | 'bossdown' | 'flawless' | 'chai' | 'snack' | 'tag', string[]> = {
  dodge: ['Too slow, bro!', 'Missed me, cousin!', 'Not today!', 'Was that your best?', 'Whoosh!'],
  streak: ["I'm on fire! Not literally!", "Can't touch this!", 'Smooth like ghee!', 'Is this too easy?'],
  lowhp: ["I'm fine! Totally fine!", 'Tell my Aunty I tried!', 'Just a scratch!', 'Chai break soon, please?'],
  bossdown: ['And STAY down!', 'That was for the Mohalla!', 'Boss? More like Bore-ss!', 'Next!'],
  flawless: ['Not a scratch! Look at this hair!', 'Perfect! Like my biryani!', 'Spotless, bhai!'],
  chai: ['Chai! Life saver!', 'Extra sugar, thank you!', 'Now THAT is medicine!'],
  snack: ['Samosa power!', 'Snack time is fight time!', 'Crunchy and powerful!'],
  tag: ['Your turn, bhai!', 'Tag, you are it!', 'Hold my chai!'],
};

/** Tacked onto Jav's generic quips so he never says anything politely */
export const JAV_GAALIS: string[] = ['Khotey!', 'Ullu da pattha!', 'Kutteya!', 'Saaleya!', 'Chawal!', 'Kanjar!', 'Gadheya!', 'Bewakoof!'];

export function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Each fighter's own random chatter during fights (keyed by profile id). Bleeps and mild innuendo only. */
export const FIGHTER_LINES: Record<string, string[]> = {
  // Fady: a silver-tongued orator. Never swears. Ever.
  qari_jaleel: [
    'Gentlemen, I implore you, reconsider this folly.',
    'Violence is the last refuge of the incompetent. Alas.',
    'Permit me a brief rebuttal. With my fists.',
    'How exquisitely clumsy of you, dear cousin.',
    'One does so detest unpleasantness before chai.',
    'I put it to you, sir, that you are losing.',
    'Your technique is, regrettably, pedestrian.',
    'Allow me to elucidate. Briefly. Forcefully.',
    'A most unfortunate decision on your part.',
    'Do mind your posture as you fall.',
    'I find your argument unpersuasive. And your jaw.',
    'Ladies and gentlemen of the mohalla, observe.',
    'Splendid effort. Entirely futile, but splendid.',
    'Pray, do take a seat. On the ground.',
    'Such vulgarity is beneath us all.',
    'I rest my case. On your face.',
    'Eloquence and elbows, my dear fellow.',
    'Might I trouble you to fall over?',
  ],
  // Saf: love everybody
  rebel_aviator: [
    'Hugs fix everything. Except that guy. He needs a punch.',
    'Spread love, not chappals!',
    'Everyone gets a samosa, even you!',
    'Be kind, rewind, then kick!',
    'You are all valid. Duck, though.',
    'Smile, my friends, life is beautiful!',
    'I love you all, even the tiny cousin!',
    'Peace, love and biryani, everybody!',
    'Group hug after this, yeah?',
    "Everyone's beautiful! Even the guy I'm hitting!",
    'Sending love and a flying kick!',
    'No hate, only samosas!',
    'You are all my brothers! Brothers who need hitting!',
    'The world needs more hugs!',
    'I forgive you before I punch you!',
    'Love is the real power, bhai!',
  ],
  // Jav: Punjabi gaaliyan nonstop, rude to everyone (no mum/sister insults)
  rebel_tactician: [
    'Cricket is coming to Olympics, khotey!',
    'Oye khotey da puttar, I just sat down!',
    'Ullu da pattha! Who woke me up?!',
    'Chal dafa ho, kutteya!',
    'Kanjar cousin, move your face!',
    'Oye saaleya, five more minutes!',
    'Tera kakh na rahe, chawal!',
    'Lakh di laanat tere te, gadheya!',
    'Hatt oye, bewakoof da jawaai!',
    'Is this the best the mohalla has? Khotey saare!',
    'Bandar di shakal, kutte di akal!',
    'Oye ganjeya, your head is blinding me!',
    'Chawal maarda pea, chup kar!',
    'Pehlan nahake aa, badbudaar!',
    'Ki chawal ae? Fight like a man, gadheya!',
    'Main sutta piya si, haramkhor!',
    'Forget the fight, cricket in Olympics, ullu!',
    'Teri shakal te chappal maaran, khotey!',
    'Tu kutta, tera cousin kutta, saare kutte!',
    'Oye chawal, I punch slower than you think. Still hurts!',
  ],
  // Jam: wants a lift home, plus dad jokes
  rebel_enforcer: [
    'Bro drop me off, my neighbour\'s uncle\'s parrot has a driving test.',
    'Drop me home, I think I left my soul in Karachi.',
    'Quick drop? My uncle thinks I am still seven.',
    'Bro, can you drop me? The biryani is calling my name.',
    'Why did the cousin bring a ladder? To reach a higher level of fighting!',
    'I used to hate facial hair, but then it grew on me.',
    'What do you call fake spaghetti? An impasta!',
    'Bro drop me off, my uncle from Pakistan has a cousin in Poland who needs to go to a shaadi tomorrow.',
    'Bro, drop me home, my aunt\'s neighbour\'s goat is getting married!',
    'Can you drop me? My aunty\'s WhatsApp group needs urgent tech support.',
    'Drop me home bro, I left the gas on in 2019.',
    'Bro drop me off, my cousin\'s friend\'s dog has a visa interview.',
    'Drop me, my Nani\'s cat is stuck in a lift in Lahore.',
    "Bro, quick drop? It's an emergency. I forgot why.",
    'I told my wife she drew her eyebrows too high. She looked surprised.',
    "I'm reading a book on anti-gravity. Impossible to put down!",
    "Why don't eggs tell jokes? They'd crack up!",
    'Why did the scarecrow win? Outstanding in his field!',
    "Parallel lines have so much in common. Shame they'll never meet.",
    'I would tell you a chemistry joke, but I know I would get no reaction.',
  ],
  // Chet: investments
  rebel_striker: [
    'Inflation is high, so is my kick.',
    'Never put all your eggs in one punch.',
    'Dividends are paid in knockouts.',
    'This fight is a long-term hold.',
    'Let me check my stocks. Oh, you are down.',
    'Tax-free punches. My favourite kind.',
    'Buy the dip, sell the cousin!',
    'Diversify your punches, bro.',
    'My portfolio is up 12%. So is my fist.',
    'Cousins are overvalued. Short them!',
    'That hit had great returns.',
    'Crypto? No. Kung Fu? Blue chip.',
    'Compound interest works on combos too.',
    'Risk management: duck first, punch later.',
    "I'd invest in you, but you're a bad asset.",
    'Bull market for fists, bear market for you!',
  ],
  // Immy: smooth-talking sleazy charmer (PG-13)
  rebel_shadow: [
    "Is it hot in here, or is it just my charm?",
    'I would say God bless you, but He clearly already did.',
    "Baby, are you a lathi? Because you're striking!",
    'Careful, my smile is a registered weapon.',
    "Hey beautiful, wanna see my moves? Fighting ones. Mostly.",
    "I'm not saying I'm a catch. Ask my mirror.",
    'My love language is flying kicks and compliments.',
    'Mind if I stand next to you? Makes me look taller.',
    "Come here often? I do. I'm a local legend.",
    'I introduce myself as Immy. Your aunty already knows me.',
    'Fight later, dinner first? I know a great chaat stall.',
    'You, me, a moonlit rickshaw ride. Think about it.',
    'Smooth? I invented smooth. Ghee took notes.',
    "Don't worry, I only punch men. Ladies get the full charm.",
  ],
};

/** Immy chatting up the crowd that runs through the background (cheeky, never nasty) */
export const IMMY_CHATUP: string[] = [
  "Hello ladies, I'm Immy. Yes, THE Immy.",
  'Did it hurt when you fell from heaven? Asking for a friend.',
  "Slow down, beautiful! Nobody's chasing you. Except me.",
  "Aunty ji, you look 25 today!",
  'You dropped something. My jaw.',
  'Is your WiFi free? Asking for my heart.',
  'Uncle ji, teach me your dance moves!',
  'Jalebi-ji, I mean Aunty-ji, your smile is sweeter!',
  "Don't run, I only want to talk! And maybe a phone number.",
];
export const CROWD_SCREAMS: string[] = ['EEEEK!', 'AAAH!', 'OMG!!', 'KYAAA!', 'WOOHOO!'];

/** Lines about the tag partner ({p} = partner nickname). Said by the active fighter, keyed by their id. */
export const PARTNER_LINES: Record<string, string[]> = {
  qari_jaleel: ['{p}, my esteemed colleague, your assistance, please.', '{p}, together we shall prevail. Splendidly.', 'A word of thanks, {p}. Truly.'],
  rebel_aviator: ['I love you, {p}! No homo, just bro-love!', '{p}, you are my favourite person ever!', 'Hug me after this, {p}!'],
  rebel_tactician: ['{p}, oye khotey, watch my back!', 'Cover me, {p}, ullu, I am sleepy!', '{p}, you useless kanjar, I love you.'],
  rebel_enforcer: ['{p}, bro, can you drop me home after this?', '{p}, I know a joke about you. It is long.', "{p}, my uncle's cousin knows your cousin!"],
  rebel_striker: ['{p}, I would invest in you any day.', '{p}, our partnership has great returns.', 'Diversify, {p}! Do not stand there!'],
  rebel_shadow: ['{p}, relax, I will handle the charming.', "{p}, you're welcome for my presence.", 'Stay close, {p}, I make everyone look good.'],
};

/** Taunts at the opponent in 1v1 fights ({p} = opponent nickname) */
export const RIVAL_LINES: string[] = [
  '{p}, you are going down!',
  'Say goodbye to your face, {p}!',
  '{p}, I have seen scarecrows with more talent!',
  'Is that all you got, {p}?',
  '{p}, my Nani hits harder!',
  'Ready to lose, {p}?',
  '{p}, today is your unlucky day!',
];

/** "Sher 'Jam' Thakur" -> "Jam" */
export function nickOf(name: string): string {
  const m = name.match(/'([^']+)'/);
  return m ? m[1] : name.split(' ')[0];
}
