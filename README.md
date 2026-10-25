**Check out the deployed project at https://cognisync.netlify.app**

# Cognisync

AI-powered gamified learning platform. Turn notes, textbooks and PDFs into a chapter path, scenario-based quizzes, spaced-repetition flashcards and real-time co-op study rooms, with superhero companions along the way.

## Overview

Cognisync converts any study material into:

- **Chapter path:** a Duolingo-style zig-zag progression with active, locked and completed chapters.
- **Scenario quizzes:** situational questions that test understanding rather than rote recall, with feedback, aura points and streak bonuses.
- **Hero companions:** a study partner (Spider-Man, Deadpool, Batman and others) that cheers, teases and comments on your answers.
- **Flashcards:** 3D flip cards scheduled with the SM-2 spaced-repetition algorithm.
- **Duo co-op:** live two-player rooms where both companions banter in real time.

## Features

### Dashboard (`/dashboard`)

- Upload a PDF, slides or plain-text notes, or type a topic. Text is extracted with `unpdf`.
- One-click starter topics, plus custom syllabus input.
- Companion HUD with a character selector to switch heroes at any time.
- Resume banner for in-progress courses.

### Chapter path (`/courses/[id]`)

- Alternating stepping-stone nodes connected by an animated path.
- Chapters unlock sequentially; the active chapter is highlighted.
- Each chapter shows its title, objectives and study cards.
- Start a chapter quiz or open flashcard review directly from the path.

### Gameplay (`/play`)

- AI-generated situational challenges.
- Companion reactions to correct and incorrect answers.
- Aura points, streaks and confetti on completion.
- Finishing a chapter returns you to the course map with the next chapter unlocked.

### Flashcards

- 3D flip animation between prompt and explanation.
- Ratings `Again`, `Hard`, `Good` and `Easy` schedule the next review at 1, 2, 4 and 7 days, with an adaptive ease factor.
- Sound effects synthesized with the Web Audio API.

### Co-op arena (`/coop`)

- Create a room with a 6-character code, or share a join link.
- Room state survives tab switches and backgrounding.
- Both players bring their chosen hero; the companions banter over live WebSocket channels.
- Each browser tab gets its own session ID, so you cannot join your own room by accident.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 13 (App Router), React 18, TypeScript |
| Styling and motion | Tailwind CSS, Framer Motion |
| Components and icons | Radix UI, Lucide React, canvas-confetti |
| Backend and realtime | Supabase (Auth, PostgreSQL, Realtime Broadcast and Presence) |
| AI generation | Anthropic Claude via `@anthropic-ai/sdk` |
| Document processing | `unpdf` |
| Audio | HTML5 Audio and Web Audio API |

## Project Structure

```
├── app/
│   ├── (auth)/                  Sign in, sign up, auth callbacks
│   ├── api/
│   │   ├── chat/                Companion conversation endpoint
│   │   ├── coop-banter/         Banter between two player heroes
│   │   ├── extract/             Text extraction (PDF, TXT, Markdown)
│   │   ├── generate/            Chapters, situations and flashcards
│   │   └── streak/              Daily streak and aura calculation
│   ├── coop/                    Real-time duo arena
│   ├── courses/[id]/            Chapter path and flashcards
│   ├── dashboard/               Study dashboard and launcher
│   ├── play/                    Scenario quiz runner
│   ├── globals.css              Tailwind base and design tokens
│   └── layout.tsx               Root layout and auth provider
├── components/
│   ├── coop/                    Room modals, player status, scoreboard
│   ├── courses/                 Chapter path visualization
│   ├── flashcards/              Flip cards with SM-2 controls
│   ├── mascot/                  Animated heroes, dialogue, character selector
│   ├── sessions/                Saved sessions and history
│   └── ui/                      Shared buttons, dialogs, drawers, cards
├── lib/
│   ├── audio.ts                 Sound effects
│   ├── auth-context.tsx         Supabase auth state and profile
│   ├── characters.ts            Hero profiles and dialogue
│   ├── sm2.ts                   SM-2 spaced-repetition algorithm
│   ├── study-session-service.ts Session, chapter and flashcard persistence
│   ├── supabase-client.ts       Browser Supabase client
│   └── types.ts                 Shared TypeScript types
└── public/
    └── heroes/                  Hero avatars and illustrations
```

## Getting Started

### Prerequisites

- Node.js 18 or later (20+ recommended)
- npm or pnpm
- A Supabase project (authentication and realtime)
- An Anthropic API key

### Installation

```bash
git clone <your-repo-url>
cd cognisync
npm install
```

### Environment variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Anthropic (content and quiz generation)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Development

```bash
npm run dev
```

Open [https://cognisync.netlify.app].

### Production build

```bash
npm run build
npm run start
```

## Deployment

The app uses API routes (`/api/*`), so it needs a server runtime. Do not set `output: 'export'` in `next.config`; static export does not support API routes.

On Netlify:

- Build command: `npm run build`
- Publish directory: leave blank so Netlify uses its Next.js support
- Environment variables: add the same variables as `.env.local`

## Walkthrough

1. **Generate a course.** Go to `/dashboard`, enter a topic or upload a PDF, and start generation.
2. **Open the path.** You are redirected to `/courses/[id]`. Chapter 1 is active; the rest are locked.
3. **Play a chapter.** Answer the scenario questions at `/play` and watch your companion react. On completion, Chapter 1 is marked done and Chapter 2 unlocks.
4. **Review flashcards.** In the Flashcards tab, flip a card and rate your recall.
5. **Try co-op.** Open `/coop`, create a room, and join from a second window or another device. Both players pick a hero and play through questions together.

## License

MIT
