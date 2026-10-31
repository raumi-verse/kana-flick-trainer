export interface Word {
  kana: string;
  meaning: string;
}

// Common beginner (≈JLPT N5) vocabulary, hiragana only. Format: "kana|meaning".
const RAW = `
あさ|morning
あめ|rain
あし|leg, foot
あたま|head
あたらしい|new
あつい|hot
あなた|you
あに|older brother
あね|older sister
あまい|sweet
あるく|to walk
いえ|house
いく|to go
いけ|pond
いす|chair
いぬ|dog
いま|now
いもうと|younger sister
いりぐち|entrance
うえ|above
うしろ|behind
うた|song
うみ|sea
えき|station
えんぴつ|pencil
おかね|money
おちゃ|tea
おとうと|younger brother
おとこ|man
おなか|stomach
おんな|woman
おんがく|music
かお|face
かさ|umbrella
かぜ|wind; a cold
かぞく|family
かばん|bag
かみ|paper; hair
からだ|body
かわ|river
きた|north
きって|postage stamp
きっぷ|ticket
きのう|yesterday
きょう|today
きょうしつ|classroom
ぎんこう|bank
くすり|medicine
くだもの|fruit
くつ|shoes
くに|country
くるま|car
けさ|this morning
げんき|healthy, well
こうえん|park
こえ|voice
ここ|here
ことば|word, language
こども|child
ごはん|rice; meal
さかな|fish
さくら|cherry blossom
ざっし|magazine
さとう|sugar
さむい|cold
しお|salt
しごと|work
じしょ|dictionary
した|below
しつもん|question
じてんしゃ|bicycle
しゃしん|photo
しゅくだい|homework
じょうず|skilful
しんぶん|newspaper
すし|sushi
せんせい|teacher
せんたく|laundry
そと|outside
そら|sky
たいせつ|important
たかい|tall; expensive
たべもの|food
たまご|egg
だれ|who
ちかい|near
ちかてつ|subway
ちず|map
ちゃわん|rice bowl
つくえ|desk
つめたい|cold (to touch)
てがみ|letter
でぐち|exit
てんき|weather
でんしゃ|train
でんわ|telephone
とけい|clock, watch
ところ|place
としょかん|library
ともだち|friend
とり|bird
なつ|summer
なまえ|name
にく|meat
にし|west
にほんご|Japanese language
にわ|garden
ねこ|cat
ねる|to sleep
のみもの|drink
はい|yes
はがき|postcard
はこ|box
はし|chopsticks; bridge
はな|flower; nose
はなし|story, talk
はる|spring
ばんごはん|dinner
ひがし|east
ひこうき|aeroplane
ひと|person
びょういん|hospital
ひる|noon
ふく|clothes
ふゆ|winter
ぶんしょう|sentence, text
へや|room
べんきょう|study
ぼうし|hat
ほん|book
まいにち|every day
まち|town
まど|window
みず|water
みせ|shop
みち|road
みみ|ear
みんな|everyone
むずかしい|difficult
め|eye
めがね|glasses
もの|thing
やさい|vegetables
やすみ|holiday, rest
やま|mountain
ゆうびんきょく|post office
ゆき|snow
ゆっくり|slowly
よる|night
らいしゅう|next week
りょうり|cooking
りょこう|travel
りんご|apple
れいぞうこ|refrigerator
れんしゅう|practice
ろうか|corridor
わたし|I, me
コーヒー|coffee
ケーキ|cake
ゲーム|game
ノート|notebook
ラーメン|ramen
`;

const PHRASES = `
おはようございます|good morning
こんにちは|hello
こんばんは|good evening
ありがとうございます|thank you
すみません|excuse me
いただきます|let's eat
ごちそうさまでした|thanks for the meal
おやすみなさい|good night
はじめまして|nice to meet you
よろしくおねがいします|please treat me well
いってきます|I'm off
ただいま|I'm home
おかえりなさい|welcome back
わかりました|understood
だいじょうぶです|it's okay
きょうはいいてんきですね|nice weather today, isn't it
にほんごをべんきょうしています|I'm studying Japanese
えきはどこですか|where is the station?
これはいくらですか|how much is this?
みずをください|water, please
`;

const parse = (raw: string): Word[] =>
  raw
    .trim()
    .split('\n')
    .map((l) => {
      const [kana, meaning] = l.split('|');
      return { kana: kana.trim(), meaning: meaning?.trim() ?? '' };
    });

export const WORDS: Word[] = parse(RAW);
export const PHRASES_LIST: Word[] = parse(PHRASES);
