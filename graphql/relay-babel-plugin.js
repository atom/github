const getBabelRelayPlugin = require('babel-relay-plugin');
const schemaData = require('./schema.json');
const plugin = getBabelRelayPlugin(schemaData.data);

module.exports = plugin;
