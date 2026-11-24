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
