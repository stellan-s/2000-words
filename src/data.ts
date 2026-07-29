export type LanguageId = "es" | "fr" | "de" | "sv" | "ja";

export type Word = {
  id: string;
  term: string;
  translation: string;
  example: string;
  exampleTranslation: string;
};

export type Language = {
  id: LanguageId;
  name: string;
  locale: string;
  marker: string;
  words: Word[];
};

export const languages: Language[] = [
  {
    id: "es",
    name: "Spanish",
    locale: "es-ES",
    marker: "✣",
    words: [
      { id: "casa", term: "casa", translation: "house", example: "La casa está cerca del río.", exampleTranslation: "The house is near the river." },
      { id: "tiempo", term: "tiempo", translation: "time", example: "No tenemos mucho tiempo.", exampleTranslation: "We do not have much time." },
      { id: "mundo", term: "mundo", translation: "world", example: "El mundo parece pequeño.", exampleTranslation: "The world seems small." },
      { id: "agua", term: "agua", translation: "water", example: "Quiero un vaso de agua.", exampleTranslation: "I want a glass of water." },
      { id: "trabajo", term: "trabajo", translation: "work", example: "Voy al trabajo temprano.", exampleTranslation: "I go to work early." },
      { id: "amigo", term: "amigo", translation: "friend", example: "Es un buen amigo.", exampleTranslation: "He is a good friend." },
      { id: "día", term: "día", translation: "day", example: "Hoy es un buen día.", exampleTranslation: "Today is a good day." },
      { id: "camino", term: "camino", translation: "way", example: "Este es el camino correcto.", exampleTranslation: "This is the right way." },
    ],
  },
  {
    id: "fr",
    name: "French",
    locale: "fr-FR",
    marker: "A",
    words: [
      { id: "maison", term: "maison", translation: "house", example: "La maison est près de la rivière.", exampleTranslation: "The house is near the river." },
      { id: "temps", term: "temps", translation: "time", example: "Nous avons encore du temps.", exampleTranslation: "We still have time." },
      { id: "monde", term: "monde", translation: "world", example: "Le monde change vite.", exampleTranslation: "The world changes quickly." },
      { id: "eau", term: "eau", translation: "water", example: "Je voudrais de l’eau.", exampleTranslation: "I would like some water." },
      { id: "travail", term: "travail", translation: "work", example: "Le travail commence à neuf heures.", exampleTranslation: "Work starts at nine." },
      { id: "ami", term: "ami", translation: "friend", example: "C’est mon meilleur ami.", exampleTranslation: "He is my best friend." },
    ],
  },
  {
    id: "de",
    name: "German",
    locale: "de-DE",
    marker: "▥",
    words: [
      { id: "haus", term: "Haus", translation: "house", example: "Das Haus steht am Fluss.", exampleTranslation: "The house stands by the river." },
      { id: "zeit", term: "Zeit", translation: "time", example: "Wir haben genug Zeit.", exampleTranslation: "We have enough time." },
      { id: "welt", term: "Welt", translation: "world", example: "Die Welt ist groß.", exampleTranslation: "The world is big." },
      { id: "wasser", term: "Wasser", translation: "water", example: "Ich trinke gern Wasser.", exampleTranslation: "I like drinking water." },
      { id: "arbeit", term: "Arbeit", translation: "work", example: "Die Arbeit ist heute leicht.", exampleTranslation: "The work is easy today." },
      { id: "freund", term: "Freund", translation: "friend", example: "Er ist ein alter Freund.", exampleTranslation: "He is an old friend." },
    ],
  },
  {
    id: "sv",
    name: "Swedish",
    locale: "sv-SE",
    marker: "♞",
    words: [
      { id: "hus", term: "hus", translation: "house", example: "Huset ligger nära floden.", exampleTranslation: "The house is near the river." },
      { id: "tid", term: "tid", translation: "time", example: "Vi har gott om tid.", exampleTranslation: "We have plenty of time." },
      { id: "värld", term: "värld", translation: "world", example: "Världen känns liten.", exampleTranslation: "The world feels small." },
      { id: "vatten", term: "vatten", translation: "water", example: "Kan jag få ett glas vatten?", exampleTranslation: "May I have a glass of water?" },
      { id: "arbete", term: "arbete", translation: "work", example: "Jag går till arbetet.", exampleTranslation: "I am going to work." },
      { id: "vän", term: "vän", translation: "friend", example: "Hon är min bästa vän.", exampleTranslation: "She is my best friend." },
    ],
  },
  {
    id: "ja",
    name: "Japanese",
    locale: "ja-JP",
    marker: "〒",
    words: [
      { id: "ie", term: "家", translation: "house", example: "家は川の近くです。", exampleTranslation: "The house is near the river." },
      { id: "jikan", term: "時間", translation: "time", example: "まだ時間があります。", exampleTranslation: "There is still time." },
      { id: "sekai", term: "世界", translation: "world", example: "世界は広いです。", exampleTranslation: "The world is wide." },
      { id: "mizu", term: "水", translation: "water", example: "水を飲みます。", exampleTranslation: "I drink water." },
      { id: "shigoto", term: "仕事", translation: "work", example: "仕事は九時に始まります。", exampleTranslation: "Work starts at nine." },
      { id: "tomodachi", term: "友達", translation: "friend", example: "彼は私の友達です。", exampleTranslation: "He is my friend." },
    ],
  },
];
