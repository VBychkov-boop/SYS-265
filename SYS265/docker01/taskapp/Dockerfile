WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
FROM node:20-alpine AS build
