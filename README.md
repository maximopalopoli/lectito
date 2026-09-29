# Aleph

Aleph is a personal reading app: a private library for tracking reading sessions, progress, and habits. The original idea is a "Strava for readers" without a social network. Its promise is simple: add books quickly, track how much you read, and keep a record of your reading journey.

## Current features

- A library with **Want to Read**, **Reading**, **Read**, and **Did Not Finish** shelves, plus custom lists. Search by title or author and filter by tags and rating.
- Add books by ISBN or text using Open Library and Google Books, scan barcodes, or import ePub files.
- Timed reading sessions with pause, focus mode, pages read, and optional notes; per-book progress and session history.
- Statistics for reading time, sessions, pages, streaks, a heatmap, books per month, and configurable goals.
- Ratings, reviews, tags, quotes, and highlights; shareable cards without a social network.
- An ePub reader with themes, typography, saved position, and highlights. JSON backups include books, custom lists, sessions, quotes, goals, reader settings, and ePub files.

Data is stored on the device. There are no accounts or cross-device sync yet; manual backups can be used to move data. See [ROADMAP.md](ROADMAP.md) for feature status and priorities.

## Tech stack and structure

- React Native + Expo SDK 54, Expo Router v6, and strict TypeScript.
- Zustand for state management; AsyncStorage for local persistence.
- Open Library for ISBN lookup and search, with Google Books as an alternative.
- `app/`: screens and routes; `components/`: shared components; `store/`: state and persistence; `types/`: data models; `lib/`: APIs, ePub, statistics, and backups; `assets/`: icons and images.
- The `@/*` import alias points to the project root. The app follows the system light/dark theme; the ePub reader has its own theme.

The core models are `Book` (metadata, shelf, current page, review, and tags), `Session` (book, start and end times, duration, pages, and note), and `Quote` (text, note, color, and location). Daily statistics are derived from sessions. The definitions in `types/` are the source of truth for the current schema.

## Run and verify

```bash
npm install
npm start
```

| Command | Purpose |
| --- | --- |
| `npm run android` | Open on Android |
| `npm run ios` | Open on iOS |
| `npm run web` | Open in a browser |
| `npm run lint` | Lint screens and components |
| `npm run typecheck` | Type-check the whole project |
| `npm test -- --runInBand` | Run tests |

CI runs lint, type-checking, and tests. Book lookups use `https://openlibrary.org/isbn/{isbn}.json` and `https://www.googleapis.com/books/v1/volumes?q={query}`. The app remains local-first; Firebase and Supabase are possible future options, not current dependencies.

Navigation follows the file structure in `app/`. Update [ROADMAP.md](ROADMAP.md) when product plans or acceptance criteria change. Expo documentation is available at [docs.expo.dev](https://docs.expo.dev/).
