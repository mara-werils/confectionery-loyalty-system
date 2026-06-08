# Project Instructions for Claude

## Deployment

### Frontend — Vercel (auto-deploy)
- Merging to `main` triggers Vercel auto-deploy to production.
- **After every feature/fix in this repo, push to `main` (via PR squash merge) — Vercel deploys automatically.**
- No manual `vercel --prod` needed; just merge to main.

### Backend — SSH server
```
ssh -p 2222 intern@192.168.124.23 -i ~/.ssh/id_ed25519
```
- Backend runs on the SSH server above.
- After backend changes, SSH in and restart the service (e.g. `pm2 restart all` or `docker-compose up -d`).

## Git Workflow
- Always create a feature branch → open PR → squash merge into `main`.
- Never commit directly to `main`.
- Always push immediately after completing any task — do not wait for the user to ask.

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Framer Motion + heroicons — deployed on Vercel
- **Backend**: Node.js + Express + Prisma — deployed on SSH server `192.168.124.23:2222`
- **Blockchain**: TON smart contracts

## Theming
- Use CSS variables for all colors: `--sweet-text`, `--sweet-card`, `--sweet-border`, `--sweet-input`, `--sweet-text-muted`, `--sweet-text-secondary`, `--sweet-text-faint`, `--sweet-card-hover`, `--sweet-accent`
- Never use hardcoded Tailwind color classes (`text-white`, `bg-stone-900`, etc.) — always use `style={{ color: 'var(--sweet-text)' }}` etc.
- Light and dark themes must both work.
