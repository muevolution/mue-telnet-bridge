FROM node:carbon-alpine

WORKDIR /usr/src/app
EXPOSE 8888
CMD ["npm", "run", "start"]

COPY .npmrc /usr/src/app/
COPY package.json /usr/src/app/
COPY package-lock.json /usr/src/app/
RUN npm install --only=production

COPY . /usr/src/app/
