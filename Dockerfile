FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

# Public directory already exists with index.html in the repo

EXPOSE 3000

CMD ["node", "server.js"]
