FROM node:carbon-alpine

WORKDIR /usr/src/app
EXPOSE 8888
CMD ["npm", "run", "start"]

RUN echo "@mue:registry=https://drone-npm.neocodenetworks.org" >> .npmrc
COPY package.json /usr/src/app/
COPY package-lock.json /usr/src/app/
RUN npm install --only=production

COPY . /usr/src/app/
