# Aleph

Personal reading tracker app — "Strava for readers".

Book logging, reading sessions with timer, and reading habit statistics. No social component.

## Features

- **Personal library** — Shelves: Want to Read, Reading, Read, Did Not Finish
- **Add books by ISBN** — Search via Open Library API with Google Books fallback
- **Reading sessions** — Timer with pause/stop, focus mode (keep screen awake)
- **Progress tracking** — Pages read, optional notes, automatic book progress update
- **Session history** — Visible on each book's detail screen

## Stack

- React Native + Expo SDK 54
- TypeScript (strict)
- Expo Router v6 (file-based routing)
- Zustand (global state with localStorage persistence)

## Setup

```bash
npm install
npm start
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run web` | Run on web |
| `npm run lint` | Run ESLint |
