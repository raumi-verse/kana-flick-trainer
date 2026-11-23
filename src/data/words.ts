export interface Word {
  kana: string;
  /** Usual written form with kanji; undefined for words normally written in kana. */
  kanji?: string;
  meaning: string;
}

// Common beginner (≈JLPT N5) vocabulary. Format: "kana|kanji|meaning" (kanji empty when the word is normally written in kana).
const RAW = `
あさ|朝|morning
あめ|雨|rain
あし|足|leg, foot
あたま|頭|head
あたらしい|新しい|new
あつい|暑い|hot (weather)
あなた||you
あに|兄|older brother
あね|姉|older sister
あまい|甘い|sweet
あるく|歩く|to walk
いえ|家|house
いく|行く|to go
いけ|池|pond
いす|椅子|chair
いぬ|犬|dog
いま|今|now
いもうと|妹|younger sister
いりぐち|入口|entrance
うえ|上|above
うしろ|後ろ|behind
うた|歌|song
うみ|海|sea
えき|駅|station
えんぴつ|鉛筆|pencil
おかね|お金|money
おちゃ|お茶|tea
おとうと|弟|younger brother
おとこ|男|man
おなか|お腹|stomach
おんな|女|woman
おんがく|音楽|music
かお|顔|face
かさ|傘|umbrella
かぜ|風|wind
かぞく|家族|family
かばん||bag
かみ|紙|paper
からだ|体|body
かわ|川|river
きた|北|north
きって|切手|postage stamp
きっぷ|切符|ticket
きのう|昨日|yesterday
きょう|今日|today
きょうしつ|教室|classroom
ぎんこう|銀行|bank
くすり|薬|medicine
くだもの|果物|fruit
くつ|靴|shoes
くに|国|country
くるま|車|car
けさ|今朝|this morning
げんき|元気|healthy, well
こうえん|公園|park
こえ|声|voice
ここ||here
ことば|言葉|word, language
こども|子供|child
ごはん|ご飯|rice; meal
さかな|魚|fish
さくら|桜|cherry blossom
ざっし|雑誌|magazine
さとう|砂糖|sugar
さむい|寒い|cold
しお|塩|salt
しごと|仕事|work
じしょ|辞書|dictionary
した|下|below
しつもん|質問|question
じてんしゃ|自転車|bicycle
しゃしん|写真|photo
しゅくだい|宿題|homework
じょうず|上手|skilful
しんぶん|新聞|newspaper
すし|寿司|sushi
せんせい|先生|teacher
せんたく|洗濯|laundry
そと|外|outside
そら|空|sky
たいせつ|大切|important
たかい|高い|tall; expensive
たべもの|食べ物|food
たまご|卵|egg
だれ|誰|who
ちかい|近い|near
ちかてつ|地下鉄|subway
ちず|地図|map
ちゃわん|茶碗|rice bowl
つくえ|机|desk
つめたい|冷たい|cold (to touch)
てがみ|手紙|letter
でぐち|出口|exit
てんき|天気|weather
でんしゃ|電車|train
でんわ|電話|telephone
とけい|時計|clock, watch
ところ|所|place
としょかん|図書館|library
ともだち|友達|friend
とり|鳥|bird
なつ|夏|summer
なまえ|名前|name
にく|肉|meat
にし|西|west
にほんご|日本語|Japanese language
にわ|庭|garden
ねこ|猫|cat
ねる|寝る|to sleep
のみもの|飲み物|drink
はい||yes
はがき|葉書|postcard
はこ|箱|box
はし|箸|chopsticks
はな|花|flower
はなし|話|story, talk
はる|春|spring
ばんごはん|晩ご飯|dinner
ひがし|東|east
ひこうき|飛行機|aeroplane
ひと|人|person
びょういん|病院|hospital
ひる|昼|noon
ふく|服|clothes
ふゆ|冬|winter
ぶんしょう|文章|sentence, text
へや|部屋|room
べんきょう|勉強|study
ぼうし|帽子|hat
ほん|本|book
まいにち|毎日|every day
まち|町|town
まど|窓|window
みず|水|water
みせ|店|shop
みち|道|road
みみ|耳|ear
みんな||everyone
むずかしい|難しい|difficult
め|目|eye
めがね|眼鏡|glasses
もの|物|thing
やさい|野菜|vegetables
やすみ|休み|holiday, rest
やま|山|mountain
ゆうびんきょく|郵便局|post office
ゆき|雪|snow
ゆっくり||slowly
よる|夜|night
らいしゅう|来週|next week
りょうり|料理|cooking
りょこう|旅行|travel
りんご||apple
れいぞうこ|冷蔵庫|refrigerator
れんしゅう|練習|practice
ろうか|廊下|corridor
わたし|私|I, me
コーヒー||coffee
ケーキ||cake
ゲーム||game
ノート||notebook
ラーメン||ramen
`;

const PHRASES = `
おはようございます||good morning
こんにちは||hello
こんばんは||good evening
ありがとうございます||thank you
すみません||excuse me
いただきます||let's eat
ごちそうさまでした||thanks for the meal
おやすみなさい|お休みなさい|good night
はじめまして||nice to meet you
よろしくおねがいします||please treat me well
いってきます||I'm off
ただいま||I'm home
おかえりなさい||welcome back
わかりました|分かりました|understood
だいじょうぶです|大丈夫です|it's okay
きょうはいいてんきですね|今日はいい天気ですね|nice weather today, isn't it
にほんごをべんきょうしています|日本語を勉強しています|I'm studying Japanese
えきはどこですか|駅はどこですか|where is the station?
これはいくらですか||how much is this?
みずをください|水をください|water, please
`;

const parse = (raw: string): Word[] =>
  raw
    .trim()
    .split('\n')
    .map((l) => {
      const [kana, kanji, meaning] = l.split('|').map((x) => x?.trim() ?? '');
      return { kana, kanji: kanji || undefined, meaning };
    });

export const WORDS: Word[] = parse(RAW);
export const PHRASES_LIST: Word[] = parse(PHRASES);
