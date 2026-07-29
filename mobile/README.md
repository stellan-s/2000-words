# 2000 Words mobile

Native Expo foundation for the offline-first 2000 Words app.

## Included

- Expo and React Native
- SQLite vocabulary, card-state, and review-log storage
- FSRS-6 scheduling through `ts-fsrs`
- 2,000 machine-validated Spanish lemmas with definitions and bilingual examples
- A minimal native home and review flow

## Commands

Use a supported LTS Node release (Node 24 is recommended for this Expo SDK).

```sh
npm install
npm run data:validate
npm test
npm run typecheck
npm start
```

The source-data repositories must be checked out to `/tmp/words-spanish-data`
and `/tmp/words-6001-spanish` only when rebuilding the vocabulary asset. Their
locations can be overridden with `SPANISH_DATA_DIR` and
`SPANISH_CUSTOM_DIR`.

See [CONTENT-LICENSES.md](./CONTENT-LICENSES.md) before distributing the
vocabulary library.
