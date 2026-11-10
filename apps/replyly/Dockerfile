# Builds Replyly as a standalone app using the published Astryx packages from npm.
# Build context: apps/replyly
FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
# Inside the Astryx monorepo these are workspace links; here we use the published release.
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));for(const k of ['dependencies','devDependencies'])for(const n in p[k])if(n.startsWith('@astryxdesign/'))p[k][n]='0.7.11';fs.writeFileSync('package.json',JSON.stringify(p))"
RUN npm install --no-audit --no-fund
COPY . .
RUN npx vite build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    DATABASE_PATH=/data/replyly.db \
    COOKIE_SECURE=true
COPY --from=build /app/dist ./dist
COPY server ./server
EXPOSE 8787
# Mounted volumes are usually root-owned: fix ownership, then drop to the unprivileged user.
CMD ["sh", "-c", "mkdir -p /data && chown -R node:node /data && exec runuser -u node -- node --disable-warning=ExperimentalWarning server/index.mjs"]
