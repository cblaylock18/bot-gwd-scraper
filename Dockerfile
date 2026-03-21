FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN mkdir -p /app/output && chown -R pptruser:pptruser /app/output

CMD ["node", "app.js"]