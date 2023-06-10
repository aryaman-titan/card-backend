FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the application code to the working directory
COPY . .

# Expose the port that your Express app is listening on
EXPOSE 3000

# Start the application
CMD [ "node", "index.js" ]
