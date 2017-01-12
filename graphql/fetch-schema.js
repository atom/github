const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const fetch = require('node-fetch');
const {
  buildClientSchema,
  introspectionQuery,
  printSchema,
} = require('graphql/utilities');
const schemaPath = path.join(__dirname, 'schema');

const token = execSync('git config github.token').toString().trim();
const SERVER = 'https://api.github.com/graphql';

// Save JSON of full schema introspection for Babel Relay Plugin to use
fetch(`${SERVER}`, {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': 'bearer ' + token,
  },
  body: JSON.stringify({query: introspectionQuery}),
}).then(res => res.json()).then(schemaJSON => {
  fs.writeFileSync(`${schemaPath}.json`, JSON.stringify(schemaJSON, null, 2));

  // Save user readable type system shorthand of schema
  const graphQLSchema = buildClientSchema(schemaJSON.data);
  fs.writeFileSync(`${schemaPath}.graphql`, printSchema(graphQLSchema));
}).catch(err => console.error(err)); // eslint-disable-line no-console
