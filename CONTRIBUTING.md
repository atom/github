# Contributing to the Atom GitHub Package

For general contributing information, see the [Atom contributing guide](https://github.com/atom/atom/blob/master/CONTRIBUTING.md); however, right now, contributing to the GitHub package differs from contributing to other core Atom packages in some ways.

In particular, the GitHub package is under constant development by a portion of the core Atom team, and there is currently a clear vision for short- to medium-term features and enhancements. That doesn't mean we won't merge pull requests or fix other issues, but it *does* mean that you should consider discussing things with us first so that you don't spend time implementing things in a way that differs from the patterns we want to establish or build a feature that we're already working on.

Feel free to [open an issue](https://github.com/atom/github/issues) if you want to discuss anything with us. If you're curious what we're working on and will be working on in the near future, you can take a look at [our short-term roadmap](https://github.com/atom/github/projects/8).

## Technical Contribution Tips

### React and Etch

Early in the project's life, we used [Etch](https://github.com/atom/etch) to manage DOM updates via a virtual-DOM mechanism very similar to React. Eventually we migrated to using [React](https://facebook.github.io/react/) itself. During the transition, we implemented a React component called `EtchWrapper` to allow us to render Etch components from within React; however, all new UI work should be done using React, and we are working to migrate all existing UI components to fully use React.

### Updating the GraphQL Schema

This project uses [Relay](https://github.com/facebook/relay) for its GitHub integration. There's a source-level transform that depends on having a local copy of the GraphQL schema available. If you need to update the local schema to the latest version, run

```bash
GITHUB_TOKEN=abcdef0123456789 npm run fetch-schema
```

where `abcdef0123456789` is a token generated as per the [Creating a personal access token for the command line](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/) help article.

Please check in the two generated files (`graphql/schema.js` and `graphql/schema.graphql`) together in their own commit.

### Async Tests

Sometimes it's necessary to test async operations. For example, imagine the following test:

```javascript
// Fails
let value = 0;
setTimeout(() => value = 1)
assert.equal(value, 1)
```

You could write this test using a promise along with the `test-until` library:

```javascript
// Passes, but not ideal
import until from 'test-until'

let value = 0;
setTimeout(() => value = 1)
await until(() => value === 1)
```

However, we lose the information about the failure ('expected 0 to equal 1') and the test is harder to read (you have to parse the `until` expression to figure out what the assertion really is).

The GitHub package includes a Babel transform that makes this a little nicer; just add `.async` to your `assert` (and don't forget to `await` it):

```javascript
// Passes!
let value = 0;
setTimeout(() => value = 1)
await assert.async.equal(value, 1)
```

This transpiles into a form similar to the one above, so is asynchronous, but if the test fails, we'll still see a message that contains 'expected 0 to equal 1'.

When writing tests that depend on values that get set asynchronously, prefer `assert.async.x(...)` over other forms.
