FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=512"
RUN npm run build -- --configuration production
FROM nginx:alpine
COPY --from=build /app/dist/ercopac-frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf