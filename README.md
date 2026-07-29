# 2000 Words

The simplest vocabulary-learning app: learn the 2,000 most useful words in a
language through focused, offline-first spaced repetition.

## Projects

- The root project is the responsive, installable React/Vite PWA.
- [`mobile`](./mobile) is the Expo/React Native foundation with SQLite, FSRS-6,
  and a machine-validated 2,000-entry Spanish vocabulary library.

## Web prototype

```sh
npm install
npm run dev
```

Production: [2000-words-stellan.netlify.app](https://2000-words-stellan.netlify.app)

## Native app

Use Node 24, then:

```sh
cd mobile
npm install
npm run data:validate
npm test
npm run typecheck
npm start
```

## Content status

The Spanish library contains exactly 2,000 unique lemmas with definitions and
bilingual examples. It is machine-validated but requires human linguistic
review before public production use.

Vocabulary content has separate Creative Commons attribution and share-alike
requirements. See [`mobile/CONTENT-LICENSES.md`](./mobile/CONTENT-LICENSES.md)
before redistributing it.
