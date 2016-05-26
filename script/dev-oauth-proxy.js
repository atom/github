// es5 oh nooo

// We'll run a server on a subdomain of atom.io in the future. For now, we'll
// set this up against localhost

var express = require('express')
var GithubOAuth = require('github-oauth')

if (!process.env['GITHUB_CLIENT'] || !process.env[['GITHUB_SECRET']]) {
  console.log('You must run this with GITHUB_SECRET and GITHUB_CLIENT env vars')
  process.exit(1)
}

var hubAuth = GithubOAuth({
  githubClient: process.env['GITHUB_CLIENT'],
  githubSecret: process.env['GITHUB_SECRET'],
  baseURL: 'http://localhost:3210',
  loginURI: '/',
  callbackURI: '/callback',
  scope: 'repo'
})

var app = express()

app.get('/', hubAuth.login)
app.get('/callback', hubAuth.callback)

hubAuth.on('error', function (err) {
  console.log('Login error:', err)
})

hubAuth.on('token', function (token, serverResponse) {
  if (token.error) {
    console.log(token.error);
  }
  serverResponse.send(`<a href="atom://sign-in/token/${token.access_token}"><s>click here to open atom</s></a> <br/> <input size="50" type="text" value="${token.access_token}"></input><p>copy-paste this for now</p>`)
})


console.log('Atom dev OAuth server started')

app.listen(3210)
