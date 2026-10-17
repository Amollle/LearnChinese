export type Word = {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
};

export type Lesson = {
  id: string;
  emoji: string;
  title: string;
  chineseTitle: string;
  description: string;
  words: Word[];
};

type RawWord = [hanzi: string, pinyin: string, english: string];

function lesson(
  id: string,
  emoji: string,
  title: string,
  chineseTitle: string,
  description: string,
  raw: RawWord[],
): Lesson {
  return {
    id,
    emoji,
    title,
    chineseTitle,
    description,
    words: raw.map(([hanzi, pinyin, english], i) => ({
      id: `${id}-${i + 1}`,
      hanzi,
      pinyin,
      english,
    })),
  };
}

export const lessons: Lesson[] = [
  lesson('greetings', '👋', 'Greetings', '问候', 'Say hello, thank you and goodbye', [
    ['你好', 'nǐ hǎo', 'hello'],
    ['谢谢', 'xièxie', 'thank you'],
    ['不客气', 'bú kèqi', "you're welcome"],
    ['再见', 'zàijiàn', 'goodbye'],
    ['对不起', 'duìbuqǐ', 'sorry'],
    ['没关系', 'méi guānxi', "it's okay"],
    ['早上好', 'zǎoshang hǎo', 'good morning'],
    ['晚安', "wǎn'ān", 'good night'],
    ['请', 'qǐng', 'please'],
  ]),
  lesson('numbers', '🔢', 'Numbers', '数字', 'Count from one to ten', [
    ['一', 'yī', 'one'],
    ['二', 'èr', 'two'],
    ['三', 'sān', 'three'],
    ['四', 'sì', 'four'],
    ['五', 'wǔ', 'five'],
    ['六', 'liù', 'six'],
    ['七', 'qī', 'seven'],
    ['八', 'bā', 'eight'],
    ['九', 'jiǔ', 'nine'],
    ['十', 'shí', 'ten'],
  ]),
  lesson('basics', '💬', 'Everyday Basics', '日常用语', 'Talk about yourself', [
    ['我', 'wǒ', 'I / me'],
    ['你', 'nǐ', 'you'],
    ['他', 'tā', 'he / him'],
    ['她', 'tā', 'she / her'],
    ['是', 'shì', 'to be (am / is / are)'],
    ['不', 'bù', 'not / no'],
    ['喜欢', 'xǐhuan', 'to like'],
    ['我叫…', 'wǒ jiào…', 'my name is…'],
    ['你叫什么名字？', 'nǐ jiào shénme míngzi?', "what's your name?"],
    ['我不懂', 'wǒ bù dǒng', "I don't understand"],
  ]),
  lesson('family', '👨‍👩‍👧', 'Family', '家人', 'Talk about the people you love', [
    ['爸爸', 'bàba', 'dad'],
    ['妈妈', 'māma', 'mom'],
    ['哥哥', 'gēge', 'older brother'],
    ['姐姐', 'jiějie', 'older sister'],
    ['弟弟', 'dìdi', 'younger brother'],
    ['妹妹', 'mèimei', 'younger sister'],
    ['爷爷', 'yéye', "grandpa (dad's dad)"],
    ['奶奶', 'nǎinai', "grandma (dad's mom)"],
    ['家', 'jiā', 'family / home'],
  ]),
  lesson('food', '🥟', 'Food & Drink', '饮食', 'Order food and drinks', [
    ['水', 'shuǐ', 'water'],
    ['茶', 'chá', 'tea'],
    ['咖啡', 'kāfēi', 'coffee'],
    ['米饭', 'mǐfàn', 'rice'],
    ['面条', 'miàntiáo', 'noodles'],
    ['饺子', 'jiǎozi', 'dumplings'],
    ['苹果', 'píngguǒ', 'apple'],
    ['吃', 'chī', 'to eat'],
    ['喝', 'hē', 'to drink'],
    ['好吃', 'hǎochī', 'delicious'],
  ]),
  lesson('colors', '🎨', 'Colors', '颜色', 'Describe the world around you', [
    ['红色', 'hóngsè', 'red'],
    ['蓝色', 'lánsè', 'blue'],
    ['黄色', 'huángsè', 'yellow'],
    ['绿色', 'lǜsè', 'green'],
    ['白色', 'báisè', 'white'],
    ['黑色', 'hēisè', 'black'],
    ['紫色', 'zǐsè', 'purple'],
    ['橙色', 'chéngsè', 'orange'],
  ]),
  lesson('time', '⏰', 'Time & Days', '时间', 'Today, tomorrow and the week', [
    ['今天', 'jīntiān', 'today'],
    ['明天', 'míngtiān', 'tomorrow'],
    ['昨天', 'zuótiān', 'yesterday'],
    ['现在', 'xiànzài', 'now'],
    ['早上', 'zǎoshang', 'morning'],
    ['晚上', 'wǎnshang', 'evening'],
    ['星期一', 'xīngqīyī', 'Monday'],
    ['周末', 'zhōumò', 'weekend'],
    ['几点？', 'jǐ diǎn?', 'what time is it?'],
  ]),
  lesson('travel', '✈️', 'Travel', '旅行', 'Get around in China', [
    ['机场', 'jīchǎng', 'airport'],
    ['酒店', 'jiǔdiàn', 'hotel'],
    ['出租车', 'chūzūchē', 'taxi'],
    ['地铁', 'dìtiě', 'subway'],
    ['左', 'zuǒ', 'left'],
    ['右', 'yòu', 'right'],
    ['多少钱？', 'duōshao qián?', 'how much is it?'],
    ['太贵了', 'tài guì le', 'too expensive'],
    ['洗手间在哪儿？', 'xǐshǒujiān zài nǎr?', 'where is the restroom?'],
  ]),
];

export const allWords: Word[] = lessons.flatMap((l) => l.words);

/** Lessons are grouped into levels. The placement test can skip whole lessons and levels. */
export const levels: { id: number; name: string; lessonIds: string[] }[] = [
  { id: 1, name: 'Beginner', lessonIds: ['greetings', 'numbers', 'basics'] },
  { id: 2, name: 'Elementary', lessonIds: ['family', 'food', 'colors'] },
  { id: 3, name: 'Intermediate', lessonIds: ['time', 'travel'] },
];

export function levelOfLesson(lessonId: string) {
  return levels.find((l) => l.lessonIds.includes(lessonId)) ?? levels[0];
}
