// Mock conversations: branching dialogues. Each node = what the partner says, key words, and your possible replies.
export type ConvoLine = { zh: string; py: string; en: string };
export type ConvoReply = ConvoLine & { next: string };
export type ConvoNode = { npc: ConvoLine; vocab: ConvoLine[]; replies: ConvoReply[] };
export type Scenario = { id: string; emoji: string; title: string; zhTitle: string; description: string; partner: string; partnerEn: string; start: string; nodes: Record<string, ConvoNode> };

export const scenarios: Scenario[] = [
 {
  "id": "restaurant",
  "emoji": "🍜",
  "title": "Ordering food",
  "zhTitle": "餐厅点菜",
  "description": "Get a table, order dishes and drinks, and pay the bill.",
  "partner": "服务员",
  "partnerEn": "waiter",
  "start": "r1",
  "nodes": {
   "r1": {
    "npc": {
     "zh": "你好！欢迎光临！几位？",
     "py": "Nǐ hǎo! Huānyíng guānglín! Jǐ wèi?",
     "en": "Hello! Welcome! How many people?"
    },
    "vocab": [
     {
      "zh": "欢迎光临",
      "py": "huānyíng guānglín",
      "en": "welcome (to a shop or restaurant)"
     },
     {
      "zh": "几位",
      "py": "jǐ wèi",
      "en": "how many people?"
     }
    ],
    "replies": [
     {
      "zh": "一位。",
      "py": "Yí wèi.",
      "en": "Just one.",
      "next": "r2"
     },
     {
      "zh": "两位。",
      "py": "Liǎng wèi.",
      "en": "Two people.",
      "next": "r2"
     }
    ]
   },
   "r2": {
    "npc": {
     "zh": "请坐。这是菜单。你想吃什么？",
     "py": "Qǐng zuò. Zhè shì càidān. Nǐ xiǎng chī shénme?",
     "en": "Please sit. Here's the menu. What would you like to eat?"
    },
    "vocab": [
     {
      "zh": "请坐",
      "py": "qǐng zuò",
      "en": "please sit"
     },
     {
      "zh": "菜单",
      "py": "càidān",
      "en": "menu"
     },
     {
      "zh": "想",
      "py": "xiǎng",
      "en": "would like to"
     },
     {
      "zh": "吃",
      "py": "chī",
      "en": "to eat"
     }
    ],
    "replies": [
     {
      "zh": "我要饺子。",
      "py": "Wǒ yào jiǎozi.",
      "en": "I'd like dumplings.",
      "next": "r3a"
     },
     {
      "zh": "我要一碗面条。",
      "py": "Wǒ yào yì wǎn miàntiáo.",
      "en": "I'd like a bowl of noodles.",
      "next": "r3b"
     },
     {
      "zh": "有什么好吃的？",
      "py": "Yǒu shénme hǎochī de?",
      "en": "What's good here?",
      "next": "r3c"
     }
    ]
   },
   "r3a": {
    "npc": {
     "zh": "好的。要多少个？",
     "py": "Hǎo de. Yào duōshao ge?",
     "en": "OK. How many would you like?"
    },
    "vocab": [
     {
      "zh": "好的",
      "py": "hǎo de",
      "en": "OK"
     },
     {
      "zh": "多少",
      "py": "duōshao",
      "en": "how many / how much"
     }
    ],
    "replies": [
     {
      "zh": "十个。",
      "py": "Shí ge.",
      "en": "Ten.",
      "next": "r4"
     },
     {
      "zh": "二十个。",
      "py": "Èrshí ge.",
      "en": "Twenty.",
      "next": "r4"
     }
    ]
   },
   "r3b": {
    "npc": {
     "zh": "好的。要辣的吗？",
     "py": "Hǎo de. Yào là de ma?",
     "en": "OK. Do you want it spicy?"
    },
    "vocab": [
     {
      "zh": "辣",
      "py": "là",
      "en": "spicy"
     },
     {
      "zh": "吗",
      "py": "ma",
      "en": "(makes a yes/no question)"
     }
    ],
    "replies": [
     {
      "zh": "要，谢谢。",
      "py": "Yào, xièxie.",
      "en": "Yes, thanks.",
      "next": "r4"
     },
     {
      "zh": "不要辣的。",
      "py": "Bú yào là de.",
      "en": "Not spicy, please.",
      "next": "r4"
     }
    ]
   },
   "r3c": {
    "npc": {
     "zh": "我们的饺子很好吃。",
     "py": "Wǒmen de jiǎozi hěn hǎochī.",
     "en": "Our dumplings are delicious."
    },
    "vocab": [
     {
      "zh": "我们的",
      "py": "wǒmen de",
      "en": "our"
     },
     {
      "zh": "很好吃",
      "py": "hěn hǎochī",
      "en": "very tasty"
     }
    ],
    "replies": [
     {
      "zh": "好，我要饺子。",
      "py": "Hǎo, wǒ yào jiǎozi.",
      "en": "OK, I'll have dumplings.",
      "next": "r3a"
     }
    ]
   },
   "r4": {
    "npc": {
     "zh": "你想喝什么？",
     "py": "Nǐ xiǎng hē shénme?",
     "en": "What would you like to drink?"
    },
    "vocab": [
     {
      "zh": "喝",
      "py": "hē",
      "en": "to drink"
     },
     {
      "zh": "什么",
      "py": "shénme",
      "en": "what"
     }
    ],
    "replies": [
     {
      "zh": "我要一杯茶。",
      "py": "Wǒ yào yì bēi chá.",
      "en": "A cup of tea, please.",
      "next": "r5"
     },
     {
      "zh": "一瓶水，谢谢。",
      "py": "Yì píng shuǐ, xièxie.",
      "en": "A bottle of water, thanks.",
      "next": "r5"
     }
    ]
   },
   "r5": {
    "npc": {
     "zh": "好的，请稍等。",
     "py": "Hǎo de, qǐng shāo děng.",
     "en": "OK, one moment please."
    },
    "vocab": [
     {
      "zh": "请稍等",
      "py": "qǐng shāo děng",
      "en": "please wait a moment"
     }
    ],
    "replies": [
     {
      "zh": "服务员，买单！",
      "py": "Fúwùyuán, mǎidān!",
      "en": "Waiter, the bill please!",
      "next": "r6"
     }
    ]
   },
   "r6": {
    "npc": {
     "zh": "一共五十八块。",
     "py": "Yígòng wǔshíbā kuài.",
     "en": "That's 58 yuan in total."
    },
    "vocab": [
     {
      "zh": "一共",
      "py": "yígòng",
      "en": "in total"
     },
     {
      "zh": "五十八",
      "py": "wǔshíbā",
      "en": "fifty-eight"
     },
     {
      "zh": "块",
      "py": "kuài",
      "en": "yuan (money)"
     }
    ],
    "replies": [
     {
      "zh": "可以用手机付吗？",
      "py": "Kěyǐ yòng shǒujī fù ma?",
      "en": "Can I pay with my phone?",
      "next": "r7"
     },
     {
      "zh": "给你钱。",
      "py": "Gěi nǐ qián.",
      "en": "Here's the money.",
      "next": "r7"
     }
    ]
   },
   "r7": {
    "npc": {
     "zh": "可以。谢谢，欢迎再来！",
     "py": "Kěyǐ. Xièxie, huānyíng zài lái!",
     "en": "Sure. Thank you, please come again!"
    },
    "vocab": [
     {
      "zh": "可以",
      "py": "kěyǐ",
      "en": "can / it's OK"
     },
     {
      "zh": "再来",
      "py": "zài lái",
      "en": "come again"
     }
    ],
    "replies": [
     {
      "zh": "谢谢，再见！",
      "py": "Xièxie, zàijiàn!",
      "en": "Thanks, goodbye!",
      "next": "END"
     }
    ]
   }
  }
 },
 {
  "id": "cafe",
  "emoji": "☕",
  "title": "At a café",
  "zhTitle": "在咖啡店",
  "description": "Order coffee or tea: size, hot or iced, for here or to go.",
  "partner": "店员",
  "partnerEn": "barista",
  "start": "c1",
  "nodes": {
   "c1": {
    "npc": {
     "zh": "你好！你要喝什么？",
     "py": "Nǐ hǎo! Nǐ yào hē shénme?",
     "en": "Hi! What would you like to drink?"
    },
    "vocab": [
     {
      "zh": "要",
      "py": "yào",
      "en": "to want"
     },
     {
      "zh": "喝",
      "py": "hē",
      "en": "to drink"
     }
    ],
    "replies": [
     {
      "zh": "我要一杯咖啡。",
      "py": "Wǒ yào yì bēi kāfēi.",
      "en": "A cup of coffee, please.",
      "next": "c2"
     },
     {
      "zh": "有茶吗？",
      "py": "Yǒu chá ma?",
      "en": "Do you have tea?",
      "next": "c2t"
     }
    ]
   },
   "c2": {
    "npc": {
     "zh": "要大杯还是小杯？",
     "py": "Yào dà bēi háishi xiǎo bēi?",
     "en": "Large or small?"
    },
    "vocab": [
     {
      "zh": "大杯",
      "py": "dà bēi",
      "en": "large cup"
     },
     {
      "zh": "还是",
      "py": "háishi",
      "en": "or (in questions)"
     },
     {
      "zh": "小杯",
      "py": "xiǎo bēi",
      "en": "small cup"
     }
    ],
    "replies": [
     {
      "zh": "大杯。",
      "py": "Dà bēi.",
      "en": "Large.",
      "next": "c3"
     },
     {
      "zh": "小杯，谢谢。",
      "py": "Xiǎo bēi, xièxie.",
      "en": "Small, thanks.",
      "next": "c3"
     }
    ]
   },
   "c2t": {
    "npc": {
     "zh": "有。绿茶还是红茶？",
     "py": "Yǒu. Lǜchá háishi hóngchá?",
     "en": "Yes. Green tea or black tea?"
    },
    "vocab": [
     {
      "zh": "绿茶",
      "py": "lǜchá",
      "en": "green tea"
     },
     {
      "zh": "红茶",
      "py": "hóngchá",
      "en": "black tea (literally “red tea”)"
     }
    ],
    "replies": [
     {
      "zh": "绿茶。",
      "py": "Lǜchá.",
      "en": "Green tea.",
      "next": "c3"
     },
     {
      "zh": "红茶，谢谢。",
      "py": "Hóngchá, xièxie.",
      "en": "Black tea, thanks.",
      "next": "c3"
     }
    ]
   },
   "c3": {
    "npc": {
     "zh": "要热的还是冰的？",
     "py": "Yào rè de háishi bīng de?",
     "en": "Hot or iced?"
    },
    "vocab": [
     {
      "zh": "热的",
      "py": "rè de",
      "en": "hot"
     },
     {
      "zh": "冰的",
      "py": "bīng de",
      "en": "iced / cold"
     }
    ],
    "replies": [
     {
      "zh": "热的。",
      "py": "Rè de.",
      "en": "Hot.",
      "next": "c4"
     },
     {
      "zh": "冰的。",
      "py": "Bīng de.",
      "en": "Iced.",
      "next": "c4"
     }
    ]
   },
   "c4": {
    "npc": {
     "zh": "在这儿喝还是带走？",
     "py": "Zài zhèr hē háishi dàizǒu?",
     "en": "For here or to go?"
    },
    "vocab": [
     {
      "zh": "在这儿",
      "py": "zài zhèr",
      "en": "here"
     },
     {
      "zh": "带走",
      "py": "dàizǒu",
      "en": "to take away / to go"
     }
    ],
    "replies": [
     {
      "zh": "在这儿喝。",
      "py": "Zài zhèr hē.",
      "en": "For here.",
      "next": "c5"
     },
     {
      "zh": "带走。",
      "py": "Dàizǒu.",
      "en": "To go.",
      "next": "c5"
     }
    ]
   },
   "c5": {
    "npc": {
     "zh": "一共二十五块。",
     "py": "Yígòng èrshíwǔ kuài.",
     "en": "That's 25 yuan in total."
    },
    "vocab": [
     {
      "zh": "一共",
      "py": "yígòng",
      "en": "in total"
     },
     {
      "zh": "二十五",
      "py": "èrshíwǔ",
      "en": "twenty-five"
     }
    ],
    "replies": [
     {
      "zh": "好的，给你。",
      "py": "Hǎo de, gěi nǐ.",
      "en": "OK, here you go.",
      "next": "c7"
     },
     {
      "zh": "太贵了！",
      "py": "Tài guì le!",
      "en": "Too expensive!",
      "next": "c6"
     }
    ]
   },
   "c6": {
    "npc": {
     "zh": "对不起，不能再便宜了。",
     "py": "Duìbuqǐ, bù néng zài piányi le.",
     "en": "Sorry, it can't be any cheaper."
    },
    "vocab": [
     {
      "zh": "不能",
      "py": "bù néng",
      "en": "cannot"
     },
     {
      "zh": "便宜",
      "py": "piányi",
      "en": "cheap"
     }
    ],
    "replies": [
     {
      "zh": "好吧，给你。",
      "py": "Hǎo ba, gěi nǐ.",
      "en": "Alright, here you go.",
      "next": "c7"
     }
    ]
   },
   "c7": {
    "npc": {
     "zh": "谢谢！你的咖啡马上好。",
     "py": "Xièxie! Nǐ de kāfēi mǎshàng hǎo.",
     "en": "Thanks! Your drink will be ready right away."
    },
    "vocab": [
     {
      "zh": "马上",
      "py": "mǎshàng",
      "en": "right away"
     }
    ],
    "replies": [
     {
      "zh": "谢谢！",
      "py": "Xièxie!",
      "en": "Thank you!",
      "next": "END"
     }
    ]
   }
  }
 },
 {
  "id": "taxi",
  "emoji": "🚕",
  "title": "Taking a taxi",
  "zhTitle": "坐出租车",
  "description": "Tell the driver your destination, ask how long, and pay.",
  "partner": "司机",
  "partnerEn": "taxi driver",
  "start": "t1",
  "nodes": {
   "t1": {
    "npc": {
     "zh": "你好，你去哪儿？",
     "py": "Nǐ hǎo, nǐ qù nǎr?",
     "en": "Hello, where are you going?"
    },
    "vocab": [
     {
      "zh": "去",
      "py": "qù",
      "en": "to go"
     },
     {
      "zh": "哪儿",
      "py": "nǎr",
      "en": "where"
     }
    ],
    "replies": [
     {
      "zh": "我去机场。",
      "py": "Wǒ qù jīchǎng.",
      "en": "To the airport.",
      "next": "t2a"
     },
     {
      "zh": "我去北京饭店。",
      "py": "Wǒ qù Běijīng Fàndiàn.",
      "en": "To the Beijing Hotel.",
      "next": "t2b"
     },
     {
      "zh": "去火车站。",
      "py": "Qù huǒchēzhàn.",
      "en": "To the train station.",
      "next": "t2a"
     }
    ]
   },
   "t2a": {
    "npc": {
     "zh": "好的。你赶时间吗？",
     "py": "Hǎo de. Nǐ gǎn shíjiān ma?",
     "en": "OK. Are you in a hurry?"
    },
    "vocab": [
     {
      "zh": "赶时间",
      "py": "gǎn shíjiān",
      "en": "to be in a hurry"
     }
    ],
    "replies": [
     {
      "zh": "是的，我很急。",
      "py": "Shì de, wǒ hěn jí.",
      "en": "Yes, I'm in a hurry.",
      "next": "t3"
     },
     {
      "zh": "不急。",
      "py": "Bù jí.",
      "en": "No rush.",
      "next": "t3"
     }
    ]
   },
   "t2b": {
    "npc": {
     "zh": "北京饭店在王府井，对吗？",
     "py": "Běijīng Fàndiàn zài Wángfǔjǐng, duì ma?",
     "en": "The Beijing Hotel is in Wangfujing, right?"
    },
    "vocab": [
     {
      "zh": "在",
      "py": "zài",
      "en": "is at / in"
     },
     {
      "zh": "王府井",
      "py": "Wángfǔjǐng",
      "en": "Wangfujing (a famous street)"
     },
     {
      "zh": "对吗",
      "py": "duì ma",
      "en": "right?"
     }
    ],
    "replies": [
     {
      "zh": "对。",
      "py": "Duì.",
      "en": "Right.",
      "next": "t3"
     },
     {
      "zh": "我不知道。",
      "py": "Wǒ bù zhīdào.",
      "en": "I don't know.",
      "next": "t3"
     }
    ]
   },
   "t3": {
    "npc": {
     "zh": "好，我们走吧。",
     "py": "Hǎo, wǒmen zǒu ba.",
     "en": "OK, let's go."
    },
    "vocab": [
     {
      "zh": "走吧",
      "py": "zǒu ba",
      "en": "let's go"
     }
    ],
    "replies": [
     {
      "zh": "要多长时间？",
      "py": "Yào duō cháng shíjiān?",
      "en": "How long will it take?",
      "next": "t4"
     }
    ]
   },
   "t4": {
    "npc": {
     "zh": "大概半个小时。",
     "py": "Dàgài bàn ge xiǎoshí.",
     "en": "About half an hour."
    },
    "vocab": [
     {
      "zh": "大概",
      "py": "dàgài",
      "en": "about / roughly"
     },
     {
      "zh": "半个小时",
      "py": "bàn ge xiǎoshí",
      "en": "half an hour"
     }
    ],
    "replies": [
     {
      "zh": "好的，谢谢。",
      "py": "Hǎo de, xièxie.",
      "en": "OK, thanks.",
      "next": "t5"
     }
    ]
   },
   "t5": {
    "npc": {
     "zh": "到了。一共六十块。",
     "py": "Dào le. Yígòng liùshí kuài.",
     "en": "We're here. That's 60 yuan."
    },
    "vocab": [
     {
      "zh": "到了",
      "py": "dào le",
      "en": "we've arrived"
     },
     {
      "zh": "六十",
      "py": "liùshí",
      "en": "sixty"
     }
    ],
    "replies": [
     {
      "zh": "可以给我发票吗？",
      "py": "Kěyǐ gěi wǒ fāpiào ma?",
      "en": "Can I have a receipt?",
      "next": "t6"
     },
     {
      "zh": "给你钱，谢谢。",
      "py": "Gěi nǐ qián, xièxie.",
      "en": "Here's the money, thanks.",
      "next": "t6"
     }
    ]
   },
   "t6": {
    "npc": {
     "zh": "好的。再见！",
     "py": "Hǎo de. Zàijiàn!",
     "en": "OK. Goodbye!"
    },
    "vocab": [
     {
      "zh": "再见",
      "py": "zàijiàn",
      "en": "goodbye"
     }
    ],
    "replies": [
     {
      "zh": "再见！",
      "py": "Zàijiàn!",
      "en": "Goodbye!",
      "next": "END"
     }
    ]
   }
  }
 },
 {
  "id": "directions",
  "emoji": "🧭",
  "title": "Asking directions",
  "zhTitle": "问路",
  "description": "Find the subway or the restroom and understand left, right and straight on.",
  "partner": "路人",
  "partnerEn": "passer-by",
  "start": "d1",
  "nodes": {
   "d1": {
    "npc": {
     "zh": "你好，有什么事吗？",
     "py": "Nǐ hǎo, yǒu shénme shì ma?",
     "en": "Hi, can I help you?"
    },
    "vocab": [
     {
      "zh": "有什么事",
      "py": "yǒu shénme shì",
      "en": "what's up? / anything I can do?"
     }
    ],
    "replies": [
     {
      "zh": "请问，地铁站在哪儿？",
      "py": "Qǐngwèn, dìtiězhàn zài nǎr?",
      "en": "Excuse me, where is the subway station?",
      "next": "d2a"
     },
     {
      "zh": "请问，洗手间在哪儿？",
      "py": "Qǐngwèn, xǐshǒujiān zài nǎr?",
      "en": "Excuse me, where is the restroom?",
      "next": "d2b"
     }
    ]
   },
   "d2a": {
    "npc": {
     "zh": "往前走，然后往左拐。",
     "py": "Wǎng qián zǒu, ránhòu wǎng zuǒ guǎi.",
     "en": "Go straight ahead, then turn left."
    },
    "vocab": [
     {
      "zh": "往前走",
      "py": "wǎng qián zǒu",
      "en": "go straight ahead"
     },
     {
      "zh": "然后",
      "py": "ránhòu",
      "en": "then"
     },
     {
      "zh": "往左拐",
      "py": "wǎng zuǒ guǎi",
      "en": "turn left"
     }
    ],
    "replies": [
     {
      "zh": "远吗？",
      "py": "Yuǎn ma?",
      "en": "Is it far?",
      "next": "d3"
     },
     {
      "zh": "往左拐？",
      "py": "Wǎng zuǒ guǎi?",
      "en": "Turn left?",
      "next": "d2c"
     }
    ]
   },
   "d2c": {
    "npc": {
     "zh": "对，往左拐。",
     "py": "Duì, wǎng zuǒ guǎi.",
     "en": "Yes, turn left."
    },
    "vocab": [
     {
      "zh": "对",
      "py": "duì",
      "en": "right / correct"
     }
    ],
    "replies": [
     {
      "zh": "远吗？",
      "py": "Yuǎn ma?",
      "en": "Is it far?",
      "next": "d3"
     }
    ]
   },
   "d2b": {
    "npc": {
     "zh": "在那儿，商店的右边。",
     "py": "Zài nàr, shāngdiàn de yòubian.",
     "en": "Over there, to the right of the shop."
    },
    "vocab": [
     {
      "zh": "那儿",
      "py": "nàr",
      "en": "there"
     },
     {
      "zh": "商店",
      "py": "shāngdiàn",
      "en": "shop"
     },
     {
      "zh": "右边",
      "py": "yòubian",
      "en": "right side"
     }
    ],
    "replies": [
     {
      "zh": "谢谢你！",
      "py": "Xièxie nǐ!",
      "en": "Thank you!",
      "next": "d4"
     }
    ]
   },
   "d3": {
    "npc": {
     "zh": "不远，走路五分钟。",
     "py": "Bù yuǎn, zǒulù wǔ fēnzhōng.",
     "en": "Not far, five minutes on foot."
    },
    "vocab": [
     {
      "zh": "不远",
      "py": "bù yuǎn",
      "en": "not far"
     },
     {
      "zh": "走路",
      "py": "zǒulù",
      "en": "to walk"
     },
     {
      "zh": "五分钟",
      "py": "wǔ fēnzhōng",
      "en": "five minutes"
     }
    ],
    "replies": [
     {
      "zh": "太好了，谢谢！",
      "py": "Tài hǎo le, xièxie!",
      "en": "Great, thanks!",
      "next": "d4"
     }
    ]
   },
   "d4": {
    "npc": {
     "zh": "不客气！",
     "py": "Bú kèqi!",
     "en": "You're welcome!"
    },
    "vocab": [
     {
      "zh": "不客气",
      "py": "bú kèqi",
      "en": "you're welcome"
     }
    ],
    "replies": [
     {
      "zh": "再见！",
      "py": "Zàijiàn!",
      "en": "Goodbye!",
      "next": "END"
     }
    ]
   }
  }
 },
 {
  "id": "hotel",
  "emoji": "🏨",
  "title": "Hotel check-in",
  "zhTitle": "酒店入住",
  "description": "Check in, ask about breakfast and Wi-Fi.",
  "partner": "前台",
  "partnerEn": "receptionist",
  "start": "h1",
  "nodes": {
   "h1": {
    "npc": {
     "zh": "你好！欢迎光临。你有预订吗？",
     "py": "Nǐ hǎo! Huānyíng guānglín. Nǐ yǒu yùdìng ma?",
     "en": "Hello, welcome! Do you have a reservation?"
    },
    "vocab": [
     {
      "zh": "预订",
      "py": "yùdìng",
      "en": "reservation / to book"
     },
     {
      "zh": "有",
      "py": "yǒu",
      "en": "to have"
     }
    ],
    "replies": [
     {
      "zh": "有，我叫安娜。",
      "py": "Yǒu, wǒ jiào Ānnà.",
      "en": "Yes, my name is Anna.",
      "next": "h2"
     },
     {
      "zh": "没有。还有房间吗？",
      "py": "Méiyǒu. Hái yǒu fángjiān ma?",
      "en": "No. Do you still have rooms?",
      "next": "h2n"
     }
    ]
   },
   "h2n": {
    "npc": {
     "zh": "有。你要住几天？",
     "py": "Yǒu. Nǐ yào zhù jǐ tiān?",
     "en": "Yes. How many nights will you stay?"
    },
    "vocab": [
     {
      "zh": "住",
      "py": "zhù",
      "en": "to stay / live"
     },
     {
      "zh": "几天",
      "py": "jǐ tiān",
      "en": "how many days"
     }
    ],
    "replies": [
     {
      "zh": "两天。",
      "py": "Liǎng tiān.",
      "en": "Two nights.",
      "next": "h2"
     },
     {
      "zh": "三天。",
      "py": "Sān tiān.",
      "en": "Three nights.",
      "next": "h2"
     }
    ]
   },
   "h2": {
    "npc": {
     "zh": "好的，请给我你的护照。",
     "py": "Hǎo de, qǐng gěi wǒ nǐ de hùzhào.",
     "en": "OK, may I have your passport please?"
    },
    "vocab": [
     {
      "zh": "给我",
      "py": "gěi wǒ",
      "en": "give me"
     },
     {
      "zh": "护照",
      "py": "hùzhào",
      "en": "passport"
     }
    ],
    "replies": [
     {
      "zh": "给你。",
      "py": "Gěi nǐ.",
      "en": "Here you go.",
      "next": "h3"
     }
    ]
   },
   "h3": {
    "npc": {
     "zh": "你的房间是八零六。",
     "py": "Nǐ de fángjiān shì bā líng liù.",
     "en": "Your room is 806."
    },
    "vocab": [
     {
      "zh": "房间",
      "py": "fángjiān",
      "en": "room"
     },
     {
      "zh": "八零六",
      "py": "bā líng liù",
      "en": "eight-zero-six (806)"
     }
    ],
    "replies": [
     {
      "zh": "早饭几点？",
      "py": "Zǎofàn jǐ diǎn?",
      "en": "What time is breakfast?",
      "next": "h4"
     },
     {
      "zh": "有无线网吗？",
      "py": "Yǒu wúxiàn wǎng ma?",
      "en": "Is there Wi-Fi?",
      "next": "h4w"
     }
    ]
   },
   "h4": {
    "npc": {
     "zh": "早上七点到十点。",
     "py": "Zǎoshang qī diǎn dào shí diǎn.",
     "en": "From 7 to 10 in the morning."
    },
    "vocab": [
     {
      "zh": "早上",
      "py": "zǎoshang",
      "en": "morning"
     },
     {
      "zh": "七点到十点",
      "py": "qī diǎn dào shí diǎn",
      "en": "7 o'clock to 10 o'clock"
     }
    ],
    "replies": [
     {
      "zh": "好的，谢谢！",
      "py": "Hǎo de, xièxie!",
      "en": "OK, thanks!",
      "next": "h5"
     }
    ]
   },
   "h4w": {
    "npc": {
     "zh": "有，是免费的。",
     "py": "Yǒu, shì miǎnfèi de.",
     "en": "Yes, it's free."
    },
    "vocab": [
     {
      "zh": "免费",
      "py": "miǎnfèi",
      "en": "free (no cost)"
     }
    ],
    "replies": [
     {
      "zh": "好的，谢谢！",
      "py": "Hǎo de, xièxie!",
      "en": "OK, thanks!",
      "next": "h5"
     }
    ]
   },
   "h5": {
    "npc": {
     "zh": "不客气，祝你住得愉快！",
     "py": "Bú kèqi, zhù nǐ zhù de yúkuài!",
     "en": "You're welcome, enjoy your stay!"
    },
    "vocab": [
     {
      "zh": "祝你",
      "py": "zhù nǐ",
      "en": "I wish you"
     },
     {
      "zh": "愉快",
      "py": "yúkuài",
      "en": "happy / pleasant"
     }
    ],
    "replies": [
     {
      "zh": "谢谢，再见！",
      "py": "Xièxie, zàijiàn!",
      "en": "Thanks, goodbye!",
      "next": "END"
     }
    ]
   }
  }
 },
 {
  "id": "market",
  "emoji": "🛍️",
  "title": "Shopping & bargaining",
  "zhTitle": "在市场买东西",
  "description": "Buy fruit or clothes, ask the price and bargain.",
  "partner": "老板",
  "partnerEn": "shop owner",
  "start": "m1",
  "nodes": {
   "m1": {
    "npc": {
     "zh": "你好！你想买什么？",
     "py": "Nǐ hǎo! Nǐ xiǎng mǎi shénme?",
     "en": "Hi! What would you like to buy?"
    },
    "vocab": [
     {
      "zh": "买",
      "py": "mǎi",
      "en": "to buy"
     }
    ],
    "replies": [
     {
      "zh": "苹果多少钱一斤？",
      "py": "Píngguǒ duōshao qián yì jīn?",
      "en": "How much are apples per jin (half a kilo)?",
      "next": "m2"
     },
     {
      "zh": "我想买这件衣服。",
      "py": "Wǒ xiǎng mǎi zhè jiàn yīfu.",
      "en": "I'd like to buy this piece of clothing.",
      "next": "m2c"
     }
    ]
   },
   "m2": {
    "npc": {
     "zh": "十块一斤。",
     "py": "Shí kuài yì jīn.",
     "en": "Ten yuan per jin."
    },
    "vocab": [
     {
      "zh": "斤",
      "py": "jīn",
      "en": "jin (half a kilo)"
     },
     {
      "zh": "十块",
      "py": "shí kuài",
      "en": "ten yuan"
     }
    ],
    "replies": [
     {
      "zh": "太贵了！便宜一点吧。",
      "py": "Tài guì le! Piányi yìdiǎn ba.",
      "en": "Too expensive! A bit cheaper, please.",
      "next": "m3"
     },
     {
      "zh": "好，我要两斤。",
      "py": "Hǎo, wǒ yào liǎng jīn.",
      "en": "OK, I'll take two jin.",
      "next": "m4a"
     }
    ]
   },
   "m3": {
    "npc": {
     "zh": "八块一斤，怎么样？",
     "py": "Bā kuài yì jīn, zěnmeyàng?",
     "en": "Eight yuan per jin, how about that?"
    },
    "vocab": [
     {
      "zh": "怎么样",
      "py": "zěnmeyàng",
      "en": "how about it?"
     }
    ],
    "replies": [
     {
      "zh": "好，我要两斤。",
      "py": "Hǎo, wǒ yào liǎng jīn.",
      "en": "OK, I'll take two jin.",
      "next": "m4b"
     }
    ]
   },
   "m4a": {
    "npc": {
     "zh": "好的，一共二十块。",
     "py": "Hǎo de, yígòng èrshí kuài.",
     "en": "OK, that's 20 yuan in total."
    },
    "vocab": [
     {
      "zh": "二十",
      "py": "èrshí",
      "en": "twenty"
     }
    ],
    "replies": [
     {
      "zh": "给你，谢谢！",
      "py": "Gěi nǐ, xièxie!",
      "en": "Here you go, thanks!",
      "next": "END"
     }
    ]
   },
   "m4b": {
    "npc": {
     "zh": "好的，一共十六块。",
     "py": "Hǎo de, yígòng shíliù kuài.",
     "en": "OK, that's 16 yuan in total."
    },
    "vocab": [
     {
      "zh": "十六",
      "py": "shíliù",
      "en": "sixteen"
     }
    ],
    "replies": [
     {
      "zh": "给你，谢谢！",
      "py": "Gěi nǐ, xièxie!",
      "en": "Here you go, thanks!",
      "next": "END"
     }
    ]
   },
   "m2c": {
    "npc": {
     "zh": "这件一百五十块。",
     "py": "Zhè jiàn yìbǎi wǔshí kuài.",
     "en": "This one is 150 yuan."
    },
    "vocab": [
     {
      "zh": "这件",
      "py": "zhè jiàn",
      "en": "this one (for clothes)"
     },
     {
      "zh": "一百五十",
      "py": "yìbǎi wǔshí",
      "en": "one hundred fifty"
     }
    ],
    "replies": [
     {
      "zh": "太贵了！便宜一点吧。",
      "py": "Tài guì le! Piányi yìdiǎn ba.",
      "en": "Too expensive! A bit cheaper, please.",
      "next": "m3c"
     },
     {
      "zh": "有别的颜色吗？",
      "py": "Yǒu bié de yánsè ma?",
      "en": "Do you have other colors?",
      "next": "m2d"
     }
    ]
   },
   "m2d": {
    "npc": {
     "zh": "有红色和黑色。",
     "py": "Yǒu hóngsè hé hēisè.",
     "en": "We have red and black."
    },
    "vocab": [
     {
      "zh": "红色",
      "py": "hóngsè",
      "en": "red"
     },
     {
      "zh": "和",
      "py": "hé",
      "en": "and"
     },
     {
      "zh": "黑色",
      "py": "hēisè",
      "en": "black"
     }
    ],
    "replies": [
     {
      "zh": "我要红色的。",
      "py": "Wǒ yào hóngsè de.",
      "en": "I'll take the red one.",
      "next": "m3c"
     }
    ]
   },
   "m3c": {
    "npc": {
     "zh": "一百二十块，怎么样？",
     "py": "Yìbǎi èrshí kuài, zěnmeyàng?",
     "en": "120 yuan, how about that?"
    },
    "vocab": [
     {
      "zh": "一百二十",
      "py": "yìbǎi èrshí",
      "en": "one hundred twenty"
     }
    ],
    "replies": [
     {
      "zh": "一百块吧。",
      "py": "Yìbǎi kuài ba.",
      "en": "How about 100?",
      "next": "m4c"
     },
     {
      "zh": "好，我买了。",
      "py": "Hǎo, wǒ mǎi le.",
      "en": "OK, I'll buy it.",
      "next": "m4c"
     }
    ]
   },
   "m4c": {
    "npc": {
     "zh": "好吧，给你。谢谢！",
     "py": "Hǎo ba, gěi nǐ. Xièxie!",
     "en": "Alright, here you are. Thank you!"
    },
    "vocab": [
     {
      "zh": "好吧",
      "py": "hǎo ba",
      "en": "alright then"
     }
    ],
    "replies": [
     {
      "zh": "谢谢，再见！",
      "py": "Xièxie, zàijiàn!",
      "en": "Thanks, goodbye!",
      "next": "END"
     }
    ]
   }
  }
 }
];
