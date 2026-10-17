/** The basic strokes (笔画 bǐhuà), each shown inside a real character, taught at the start of the first lessons. */
export const BASIC_STROKES = [
  { name: '横', py: 'héng', en: 'horizontal', char: '一', stroke: 0, tip: 'Go left → right, nearly flat (a tiny rise).' },
  { name: '竖', py: 'shù', en: 'vertical', char: '十', stroke: 1, tip: 'Go straight down, top → bottom.' },
  { name: '撇', py: 'piě', en: 'left-falling', char: '人', stroke: 0, tip: 'Start at the top and sweep down to the left.' },
  { name: '捺', py: 'nà', en: 'right-falling', char: '人', stroke: 1, tip: 'Sweep down to the right, getting heavier at the end.' },
  { name: '点', py: 'diǎn', en: 'dot', char: '六', stroke: 0, tip: 'A short dab, down and to the right.' },
  { name: '提', py: 'tí', en: 'rising', char: '我', stroke: 3, tip: 'Flick up to the right, quick and light.' },
  { name: '横折', py: 'héngzhé', en: 'turn', char: '口', stroke: 1, tip: 'Go across, then turn sharply and go down — one stroke!' },
  { name: '竖钩', py: 'shùgōu', en: 'hook', char: '小', stroke: 0, tip: 'Go down, then flick up-left at the bottom. Don’t forget the hook!' },
];

/** Which basic strokes each lesson teaches, before its first writing step. */
export const STROKES_IN_LESSON: Record<string, number[]> = {
  greetings: [0, 1, 2, 3],
  numbers: [4, 5, 6, 7],
};

/** Stroke-order rules, shown as tips on writing steps that follow them. */
export const ORDER_TIPS: Record<string, string> = {
  十: 'Rule: horizontal before vertical (先横后竖).',
  人: 'Rule: left sweep before right sweep (先撇后捺).',
  三: 'Rule: top to bottom (从上到下).',
  好: 'Rule: left part first, then right (从左到右).',
  你: 'Rule: left part first, then right (从左到右).',
  日: 'Rule: outside, then inside, then close the box (先外后内再封口).',
  四: 'Rule: outside, then inside, then close the box (先外后内再封口).',
  小: 'Rule: middle before the two sides (先中间后两边).',
  水: 'Rule: middle before the two sides (先中间后两边).',
};
