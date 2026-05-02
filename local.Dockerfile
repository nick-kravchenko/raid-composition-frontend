FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4200

CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--poll", "500", "--allowed-hosts"]
