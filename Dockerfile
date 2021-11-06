#
# Docker image for production
#

#
# Stage 1: App build
#
# This is a dedicated stage so that files required for app build do not
# end up on produciton image.
#

FROM ghcr.io/waytrade/microservice-core/build:latest as build

WORKDIR /usr/src/app

COPY . .

# Build App
RUN yarn install
RUN yarn build

# Delete build and install production dependencies
RUN rm -f -r ./node_modules
RUN yarn install --production


#
# Stage 2: Image creation
#

# We use waytrade/ib-gateway as base image instead of waytrade/microservice-core
# and install microservice deps manually
FROM waytrade/ib-gateway:1010
# Install node.js and yarn
RUN apt-get update -y
RUN apt-get install -y curl ca-certificates
RUN curl --silent --location https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs
RUN npm install --global yarn
# ld-linux-x86-64 is required by uWebsocket
RUN ln -s /lib64/ld-linux-x86-64.so.2 /lib/ld-linux-x86-64.so.2

WORKDIR /usr/src/app

# Copy files
COPY --from=build /usr/src/app/package.json .
COPY --from=build /usr/src/app/config/ ./config
COPY --from=build /usr/src/app/dist/ ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/scripts/run_delayed.sh .
RUN chmod a+x ./run_delayed.sh

# Run app
ENV NODE_ENV=production
CMD ["./run_delayed.sh"]

EXPOSE 3000
