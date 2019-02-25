module.exports = {
  sourceMaps: "inline",
  plugins: [
    "babel-plugin-relay",
    "./assert-messages-plugin.js",
    "@atom/babel-plugin-chai-assert-async",
    "@babel/plugin-proposal-class-properties",
  ],
  presets: [
    ["@babel/preset-env", {
      "targets": {"electron": process.versions.electron}
    }],
    "@babel/preset-react"
  ],
  env: {
    coverage: {
      plugins: ["babel-plugin-istanbul"]
    }
  }
}
