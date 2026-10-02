FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
RUN npm install
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build --workspace=@sneakdrop/shared
RUN npm run build --workspace=@sneakdrop/api
EXPOSE 3001
CMD ["npm", "run", "start", "--workspace=@sneakdrop/api"]
