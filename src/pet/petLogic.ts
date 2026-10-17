/** The virtual panda: its saved state, the shop, and how its mood changes over time. */

export type PetState = {
  name: string;
  /** 0–100: 100 = completely full. */
  hunger: number;
  /** 0–100 */
  happiness: number;
  /** When hunger/happiness were last updated (ms). They drop slowly over time. */
  lastUpdate: number;
  coins: number;
  /** Toys and outfits the learner has bought. */
  owned: string[];
  /** Outfits the panda has on. */
  wearing: string[];
  feedCount: number;
  /** Day (YYYY-MM-DD) the daily-goal reward was last claimed. */
  lastRewardDate: string | null;
};

export type ItemKind = 'food' | 'toy' | 'outfit';
export type PetItem = {
  id: string;
  kind: ItemKind;
  emoji: string;
  zh: string;
  py: string;
  en: string;
  price: number;
  /** How much a food fills the panda up, or how much a toy cheers it up. */
  food?: number;
  joy?: number;
};

export const SHOP: PetItem[] = [
  { id: 'bamboo', kind: 'food', emoji: '🎋', zh: '竹子', py: 'zhúzi', en: 'bamboo', price: 10, food: 30, joy: 5 },
  { id: 'apple', kind: 'food', emoji: '🍎', zh: '苹果', py: 'píngguǒ', en: 'apple', price: 8, food: 20, joy: 5 },
  { id: 'dumplings', kind: 'food', emoji: '🥟', zh: '饺子', py: 'jiǎozi', en: 'dumplings', price: 15, food: 40, joy: 10 },
  { id: 'bubbletea', kind: 'food', emoji: '🧋', zh: '奶茶', py: 'nǎichá', en: 'bubble tea', price: 20, food: 20, joy: 25 },
  { id: 'mooncake', kind: 'food', emoji: '🥮', zh: '月饼', py: 'yuèbing', en: 'mooncake', price: 25, food: 50, joy: 20 },
  { id: 'ball', kind: 'toy', emoji: '⚽', zh: '球', py: 'qiú', en: 'ball', price: 15, joy: 25 },
  { id: 'kite', kind: 'toy', emoji: '🪁', zh: '风筝', py: 'fēngzheng', en: 'kite', price: 25, joy: 40 },
  { id: 'scarf', kind: 'outfit', emoji: '🧣', zh: '围巾', py: 'wéijīn', en: 'scarf', price: 40 },
  { id: 'bow', kind: 'outfit', emoji: '🎀', zh: '蝴蝶结', py: 'húdiéjié', en: 'bow', price: 50 },
  { id: 'hat', kind: 'outfit', emoji: '🧢', zh: '帽子', py: 'màozi', en: 'hat', price: 60 },
  { id: 'glasses', kind: 'outfit', emoji: '🕶️', zh: '墨镜', py: 'mòjìng', en: 'sunglasses', price: 60 },
  { id: 'lantern', kind: 'outfit', emoji: '🏮', zh: '灯笼', py: 'dēnglong', en: 'lantern', price: 80 },
  { id: 'crown', kind: 'outfit', emoji: '👑', zh: '皇冠', py: 'huángguān', en: 'crown', price: 150 },
];

export const NAME_IDEAS = [
  { zh: '圆圆', py: 'Yuányuan', en: 'Roundy' },
  { zh: '胖胖', py: 'Pàngpang', en: 'Chubby' },
  { zh: '小白', py: 'Xiǎobái', en: 'Little White' },
  { zh: '大宝', py: 'Dàbǎo', en: 'Big Treasure' },
];

export const START_COINS = 30;
const HUNGER_PER_DAY = 15;
const JOY_PER_DAY = 10;
const DAY = 24 * 60 * 60 * 1000;

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function newPet(name: string, now = Date.now()): PetState {
  return { name, hunger: 80, happiness: 80, lastUpdate: now, coins: START_COINS, owned: [], wearing: [], feedCount: 0, lastRewardDate: null };
}

/** Hunger and happiness right now (they drop slowly while you're away; the panda never dies). */
export function current(pet: PetState, now = Date.now()): PetState {
  const days = Math.max(0, now - pet.lastUpdate) / DAY;
  return { ...pet, hunger: clamp(pet.hunger - days * HUNGER_PER_DAY), happiness: clamp(pet.happiness - days * JOY_PER_DAY), lastUpdate: now };
}

export type Mood = 'happy' | 'okay' | 'hungry' | 'sad';
export function moodOf(pet: PetState): Mood {
  if (pet.hunger < 25) return 'hungry';
  if (pet.happiness < 30) return 'sad';
  if (pet.hunger >= 60 && pet.happiness >= 60) return 'happy';
  return 'okay';
}

/** Coins for reaching the daily goal: 20, plus 2 per streak day (up to +20). */
export function rewardFor(streak: number) {
  return 20 + Math.min(20, 2 * Math.max(0, streak));
}

export type Line = { zh: string; py: string; en: string };
export const LINES: Record<string, Line> = {
  yummy: { zh: '好吃！', py: 'hǎo chī!', en: 'Yummy!' },
  thanks: { zh: '谢谢你！', py: 'xièxie nǐ!', en: 'Thank you!' },
  fun: { zh: '好玩！', py: 'hǎo wán!', en: 'So fun!' },
  pretty: { zh: '好看吗？', py: 'hǎo kàn ma?', en: 'Do I look good?' },
  hungry: { zh: '我饿了。', py: 'wǒ è le.', en: "I'm hungry." },
  starving: { zh: '我好饿啊！', py: 'wǒ hǎo è a!', en: "I'm so hungry!" },
  missed: { zh: '我想你了！', py: 'wǒ xiǎng nǐ le!', en: 'I missed you!' },
  hello: { zh: '你好！今天学中文了吗？', py: 'nǐ hǎo! jīntiān xué Zhōngwén le ma?', en: 'Hi! Did you study Chinese today?' },
  happy: { zh: '我很开心！', py: 'wǒ hěn kāixīn!', en: "I'm very happy!" },
  cheer: { zh: '加油！', py: 'jiāyóu!', en: 'You can do it!' },
  awesome: { zh: '你真棒！', py: 'nǐ zhēn bàng!', en: "You're awesome!" },
  bamboo: { zh: '我爱竹子！', py: 'wǒ ài zhúzi!', en: 'I love bamboo!' },
  together: { zh: '我们一起学中文吧！', py: 'wǒmen yìqǐ xué Zhōngwén ba!', en: "Let's learn Chinese together!" },
  full: { zh: '我吃饱了！', py: 'wǒ chī bǎo le!', en: "I'm full!" },
};

/** Something for the panda to say when you tap it. */
export function chatLine(pet: PetState, goalReached: boolean): Line {
  const mood = moodOf(pet);
  if (mood === 'hungry') return Math.random() < 0.5 ? LINES.hungry : LINES.starving;
  const pool = goalReached
    ? [LINES.happy, LINES.awesome, LINES.bamboo, LINES.thanks]
    : [LINES.hello, LINES.cheer, LINES.together, LINES.bamboo];
  if (pet.wearing.length) pool.push(LINES.pretty);
  return pool[Math.floor(Math.random() * pool.length)];
}
