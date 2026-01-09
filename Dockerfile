FROM node:22-alpine
WORKDIR /usr/src/app
COPY package*.json ./
COPY . .
RUN npm install && npm run build
RUN mkdir -p data && cp -r node_modules data
EXPOSE 3000
CMD [ "node", "dist/app.js" ]
