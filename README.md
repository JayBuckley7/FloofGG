# Kanban Application

A simple Kanban board for organizing tasks. Create cards, move them between columns, and track progress through your workflow.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your Convex configuration:
- `CONVEX_DEPLOY_KEY` - Get from your Convex dashboard
- `CONVEX_DEPLOYMENT` - Your deployment name (e.g., `dev:your-deployment-name`)
- `VITE_CONVEX_URL` - Your Convex URL (e.g., `https://your-deployment-name.convex.cloud`)

You can get these values by running `npx convex dev` which will create the `.env.local` file automatically.

## Running the application

Start the development server with:

```bash
npm run dev
```

This will start both the frontend (Vite) and backend (Convex dev server).

## Project structure

- `src/` – client code
- `convex/` – server code
