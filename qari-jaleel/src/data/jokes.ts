// Short, clean one-liners for Endless Mohalla banter. Keep each under ~60 characters so bubbles stay tidy.

/** Generic cousin trash talk, said by a random cousin on screen */
export const COUSIN_TAUNTS: string[] = [
  'I told Mummy I was getting milk!',
  "My cousin's cousin is bigger than you!",
  'I only came for the free chai!',
  'Wait, is this the wedding?',
  "I'm not fighting, I'm stretching!",
  'My WiFi is faster than you!',
  'You hit like my Nani!',
  'I have a degree in beating people up!',
  'This is for the last cricket match!',
  'Who stole my slippers? YOU?!',
  "I'll tell your Mummy!",
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
  lowhp: ["I'm fine! Totally fine!", 'Tell my Mummy I tried!', 'Just a scratch!', 'Chai break soon, please?'],
  bossdown: ['And STAY down!', 'That was for the Mohalla!', 'Boss? More like Bore-ss!', 'Next!'],
  flawless: ['Not a scratch! Look at this hair!', 'Perfect! Like my biryani!', 'Spotless, bhai!'],
  chai: ['Chai! Life saver!', 'Extra sugar, thank you!', 'Now THAT is medicine!'],
  snack: ['Samosa power!', 'Snack time is fight time!', 'Crunchy and powerful!'],
  tag: ['Your turn, bhai!', 'Tag, you are it!', 'Hold my chai!'],
};

export function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Each fighter's own random chatter during fights (keyed by profile id). Bleeps and mild innuendo only. */
export const FIGHTER_LINES: Record<string, string[]> = {
  // Fady: constant Punjabi
  qari_jaleel: [
    'Oye balle balle!',
    'Chak de phatte!',
    'Ki haal aa, paaji?',
    'Oye hoye, ki karda pea?',
    'Kamaal kar ditta, yaar!',
    'Roti kha lai pehlan, fer ladai!',
    'Tusi great ho, par main greater!',
    'Ajj mood vich aan, oye!',
    'Shava shava, bhaiyo!',
    'Ohh teri, eh ki ho gaya!',
    'Chal oye, kam shuru kar!',
    'Lassi peeni aa, fight baad vich!',
  ],
  // Saf: love everybody
  rebel_aviator: [
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
  // Jav: swears, but it is all bleeped
  rebel_tactician: [
    'What the #£&@ is this?!',
    'Not another one, ##£&!',
    'Who woke me up, you #£&@?!',
    "I'm too sleepy for this ##£&!",
    'Oh for #£&@\'s sake, more of them?!',
    'Move, you #£&@ cousin!',
    '#£&@ me, that was loud!',
    'Five more minutes, you ##£&!',
    "That's it, I'm #£&@ annoyed now!",
  ],
  // Jam: wants a lift home, plus dad jokes
  rebel_enforcer: [
    'Bro drop me off, my uncle from Pakistan has a cousin in Poland who needs to go to a shaadi tomorrow.',
    'Bro, drop me home, my aunt\'s neighbour\'s goat is getting married!',
    'Can you drop me? My mum\'s WhatsApp group needs urgent tech support.',
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
  // Immy: cheeky and crude (PG-13)
  immy_girls: [
    'Careful, I bite. Sometimes.',
    'Is that a lathi or are you just happy to see me?',
    "Your uncle called. He wants his pride back.",
    "I've handled bigger men. Before breakfast.",
    "Size isn't everything, but it's something, bhai.",
    "Come closer, I won't bite... hard.",
    'Spicy? I invented spicy!',
    "You call that a punch? My Nani's slap has more oomph!",
    'Boys, boys, take a number!',
    "That's what she said!",
    'You sweat like a buffalo in a sauna!',
  ],
};
