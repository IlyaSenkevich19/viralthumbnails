FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg python3 python3-pip \
  && pip3 install --break-system-packages --no-cache-dir yt-dlp \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN yarn install --frozen-lockfile

COPY apps/backend apps/backend

RUN yarn workspace backend build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["yarn", "workspace", "backend", "start:prod"]
