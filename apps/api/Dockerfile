FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build
RUN test -f dist/main.js || (echo "ERROR: dist/main.js not found" && exit 1)

RUN mkdir -p uploads

EXPOSE 8080

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
