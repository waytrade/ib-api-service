FROM node:14.16-alpine

# Set app directory
WORKDIR /usr/src/app

# Install git in order to allow installing
# npm packages from Github
RUN set -xe \
  && apk add --no-cache git \
  && apk add libc6-compat \
  && ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY ./package*.json ./
COPY ./yarn.lock ./
COPY ./.npmrc ./

RUN yarn install

# Buld app
COPY . .

RUN yarn build

# Run app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
