FROM node:14
WORKDIR /usr/src/app
COPY package*.json ./
COPY . .
RUN npm install && npm run build
EXPOSE 3000
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
