export type Pictograph = {
  hanzi: string;
  pinyin: string;
  english: string;
  emoji: string;
  /** Unsplash photo id (free to use under the Unsplash License). */
  photo: string;
  story: string;
  group: 'picture' | 'combo' | 'animal';
};

export function photoUrl(id: string, width = 400) {
  // fm=jpg: always ask for a plain JPEG (auto-format can send WebP/AVIF that some phones can't show)
  return `https://images.unsplash.com/${id}?fm=jpg&q=70&w=${width}&fit=crop&ixlib=rb-4.1.0`;
}

export const pictographGroups: { key: Pictograph['group']; title: string; subtitle: string }[] = [
  {
    key: 'picture',
    title: 'Drawings',
    subtitle: 'About 3,000 years ago these were simple sketches of real things. Over time the lines got straighter and simpler.',
  },
  {
    key: 'combo',
    title: 'Put together',
    subtitle: 'Two or three simple pictures are combined to show a new idea.',
  },
  {
    key: 'animal',
    title: 'Animals',
    subtitle:
      'Ancient animal characters look the most like the real thing. They were drawn standing upright to fit on narrow strips of bone — look for the horns, trunks, antlers and tails.',
  },
];

export const pictographs: Pictograph[] = [
  { hanzi: '人', pinyin: 'rén', english: 'person', emoji: '🚶', photo: 'photo-1487956382158-bb926046304a', group: 'picture', story: 'Two strokes like a person walking, seen from the side — the legs stride apart.' },
  { hanzi: '大', pinyin: 'dà', english: 'big', emoji: '🙆', photo: 'photo-1499509599374-00853a315a10', group: 'picture', story: 'A person (人) standing with arms stretched out wide, as if saying “It was THIS big!”' },
  { hanzi: '口', pinyin: 'kǒu', english: 'mouth', emoji: '👄', photo: 'photo-1648204068800-cfcfb9d814ac', group: 'picture', story: 'A square, like a wide-open mouth. It also appears in many words about speaking and eating.' },
  { hanzi: '目', pinyin: 'mù', english: 'eye', emoji: '👁️', photo: 'photo-1483519173755-be893fab1f46', group: 'picture', story: 'An eye turned on its side so it fits in a tall space. The lines inside are the iris and pupil.' },
  { hanzi: '日', pinyin: 'rì', english: 'sun / day', emoji: '☀️', photo: 'photo-1594315590298-329f49c8dcb9', group: 'picture', story: 'Once drawn as a circle with a dot in the middle. Brushes make square corners easier than circles, so it became a box.' },
  { hanzi: '月', pinyin: 'yuè', english: 'moon / month', emoji: '🌙', photo: 'photo-1527842891421-42eec6e703ea', group: 'picture', story: 'A crescent moon standing up tall. Since a month follows the moon’s cycle, it also means “month”.' },
  { hanzi: '山', pinyin: 'shān', english: 'mountain', emoji: '⛰️', photo: 'photo-1605462858193-12b5e9c860f4', group: 'picture', story: 'Three mountain peaks rising from the ground — the middle one is the tallest.' },
  { hanzi: '水', pinyin: 'shuǐ', english: 'water', emoji: '💧', photo: 'photo-1437482078695-73f5ca6c96e2', group: 'picture', story: 'A stream flowing down the middle, with splashes and ripples on both sides.' },
  { hanzi: '火', pinyin: 'huǒ', english: 'fire', emoji: '🔥', photo: 'photo-1464808646948-8f732deb6e4b', group: 'picture', story: 'Flames leaping upward from a fire, with sparks flying off each side.' },
  { hanzi: '木', pinyin: 'mù', english: 'tree / wood', emoji: '🌳', photo: 'photo-1502082553048-f009c37129b9', group: 'picture', story: 'A tree trunk: the top strokes are branches reaching up, the bottom strokes are roots spreading down.' },
  { hanzi: '雨', pinyin: 'yǔ', english: 'rain', emoji: '🌧️', photo: 'photo-1620385019253-b051a26048ce', group: 'picture', story: 'The top line is the sky, the frame is a cloud, and the four dots are raindrops falling.' },
  { hanzi: '田', pinyin: 'tián', english: 'field', emoji: '🌾', photo: 'photo-1728895604559-a4e16081504e', group: 'picture', story: 'A farm seen from above, divided into four plots by little paths.' },
  { hanzi: '女', pinyin: 'nǚ', english: 'woman', emoji: '👩', photo: 'photo-1544005313-94ddf0286df2', group: 'picture', story: 'From an ancient drawing of a woman kneeling with her arms folded in front of her.' },
  { hanzi: '子', pinyin: 'zǐ', english: 'child', emoji: '👶', photo: 'photo-1617331140180-e8262094733a', group: 'picture', story: 'A baby wrapped up in a blanket, with a big head and arms reaching out.' },
  { hanzi: '门', pinyin: 'mén', english: 'door / gate', emoji: '🚪', photo: 'photo-1516551633610-2e498bfc3ee8', group: 'picture', story: 'The outline of a doorway. The old form (門) showed two swinging doors side by side.' },
  { hanzi: '马', pinyin: 'mǎ', english: 'horse', emoji: '🐎', photo: 'photo-1553284965-83fd3e82fa5a', group: 'animal', story: 'Once a detailed horse with a flowing mane and four legs. Today it is simplified to just a few strokes.' },
  { hanzi: '鱼', pinyin: 'yú', english: 'fish', emoji: '🐟', photo: 'photo-1522069169874-c58ec4b76be5', group: 'animal', story: 'A fish standing on its nose: head on top, scaly body in the middle, tail at the bottom.' },
  { hanzi: '林', pinyin: 'lín', english: 'woods', emoji: '🌳🌳', photo: 'photo-1672873886341-6b294dbb06b7', group: 'combo', story: 'Two trees (木 + 木) side by side make a small wood.' },
  { hanzi: '森', pinyin: 'sēn', english: 'forest', emoji: '🌳🌳🌳', photo: 'photo-1448375240586-882707db888b', group: 'combo', story: 'Three trees (木 + 木 + 木) — so many trees it becomes a whole forest!' },
  { hanzi: '休', pinyin: 'xiū', english: 'to rest', emoji: '😌', photo: 'photo-1746160780384-73c991ff5119', group: 'combo', story: 'A person (亻, a narrow form of 人) leaning against a tree (木) to take a rest.' },
  { hanzi: '明', pinyin: 'míng', english: 'bright', emoji: '✨', photo: 'photo-1503939313441-d753b6c7eb91', group: 'combo', story: 'The sun (日) and the moon (月) shining together — the brightest thing imaginable.' },
  { hanzi: '好', pinyin: 'hǎo', english: 'good', emoji: '🤱', photo: 'photo-1560707854-fb9a10eeaace', group: 'combo', story: 'A woman (女) holding her child (子). A mother with her baby — that is good!' },
  { hanzi: '牛', pinyin: 'niú', english: 'ox / cow', emoji: '🐂', photo: 'photo-1676322559474-91c24a7e6a1c', group: 'animal', story: 'An ox’s head seen from the front: two big horns on top, ears below, and a line down the middle of the face.' },
  { hanzi: '羊', pinyin: 'yáng', english: 'sheep', emoji: '🐑', photo: 'photo-1484557985045-edf25e08da73', group: 'animal', story: 'A sheep’s head with its horns curling down on both sides, and a pointed face below.' },
  { hanzi: '鸟', pinyin: 'niǎo', english: 'bird', emoji: '🐦', photo: 'photo-1572065134352-af1a6aa45e7f', group: 'animal', story: 'A bird seen from the side: beak and eye at the top, a feathered body, then tail and feet at the bottom.' },
  { hanzi: '虎', pinyin: 'hǔ', english: 'tiger', emoji: '🐅', photo: 'photo-1549480017-d76466a4b7e8', group: 'animal', story: 'A tiger standing on its tail: wide-open jaws with sharp teeth, a striped body, legs, and a curling tail.' },
  { hanzi: '象', pinyin: 'xiàng', english: 'elephant', emoji: '🐘', photo: 'photo-1557050543-4d5f4e07ef46', group: 'animal', story: 'An elephant with its long trunk curling at the top, a tusk, big body and legs. Elephants really lived in ancient China!' },
  { hanzi: '龟', pinyin: 'guī', english: 'turtle', emoji: '🐢', photo: 'photo-1437622368342-7a3d73a34c8f', group: 'animal', story: 'A turtle seen from above: head, a round patterned shell, four legs and a little tail. Oracle bones were often turtle shells!' },
  { hanzi: '鹿', pinyin: 'lù', english: 'deer', emoji: '🦌', photo: 'photo-1484406566174-9da000fda645', group: 'animal', story: 'A deer with big branching antlers on top of its head, a slim body and legs.' },
  { hanzi: '犬', pinyin: 'quǎn', english: 'dog', emoji: '🐕', photo: 'photo-1561037404-61cd46aa615b', group: 'animal', story: 'A dog standing upright: head and pointy ear on top, a thin body, legs, and a tail curling up. Today people usually say 狗 (gǒu) for dog, but 犬 still appears in many words.' },
];
