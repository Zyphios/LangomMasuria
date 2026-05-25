FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json jest.config.ts .env.test ./
COPY prisma ./prisma
COPY src ./src
COPY tests ./tests
RUN npm run prisma:generate && npm run build
EXPOSE 4000
CMD ["npm", "run", "dev"]
