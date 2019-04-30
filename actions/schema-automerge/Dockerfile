FROM node:8-slim

LABEL "com.github.actions.name"="schema-automerge"
LABEL "com.github.actions.description"="Automatically merge schema upgrade pull requests that pass all checks"
LABEL "com.github.actions.icon"="check-circle"
LABEL "com.github.actions.color"="green"

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of your action's code
COPY . .

# Run `node /index.js`
ENTRYPOINT ["node", "/index.js"]
