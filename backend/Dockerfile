FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json jest.config.ts .env.test ./
COPY prisma ./prisma
COPY src ./src
COPY tests ./tests
RUN npm run prisma:generate && npm run build
EXPOSE 4000
CMD sh -c "npx prisma migrate deploy && (npm run prisma:seed || true) && npm run dev"
