# Rules
- Never run git commit, git add, git push, git branch, git tag.
- After each change, print the exact git commands for me to run myself.
- Never add Co-Authored-By lines.
- Ask before installing any package.
- One task at a time. Small steps.

# Project
MERN marketplace for MSMEs. Roles: buyer, seller, admin.
- msme-backend/ : Express + Mongoose, port 5000
- msme-frontend/ : React 18 + Vite, port 3001
- docker compose up -d --build runs both. Needs msme-backend/.env
- No test framework. Verify by running the servers.
