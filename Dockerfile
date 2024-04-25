# Set the base image
FROM node:18

# Create and set the working directory
WORKDIR /usr/src/app

# Add dependencies for gl, canvas and xvfb
# Important! These dependencies must be installed before running `npm install`
RUN apt-get update \
    && apt-get install -y build-essential libcairo2-dev libgif-dev libglew-dev libglu1-mesa-dev libjpeg-dev libpango1.0-dev librsvg2-dev libxi-dev pkg-config xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Start the server
EXPOSE 3000
CMD xvfb-run pnpm tsx ./src/test-utils/render/render.js 