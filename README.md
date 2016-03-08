# git package

To put a git in some atoms.

## Getting Started

:warning: **Note:** The git package currently depends on some functionality in Atom core that hasn't been released yet. :warning: So for now, you'll need to [build Atom from source](https://github.com/atom/atom/tree/master/docs/build-instructions) to try the package.

```
git clone git@github.com:atom/git.git
cd git
apm install
apm link -d
atom .

cd ../some-dir-with-a-git-repo
atom -d
```

## Development

* `npm run lint` — Lint the codes.
* `npm run check` — Type check the codes.
* `npm run start` — Start Flow in the background. This will let it parse and typecheck incrementally which is much faster for local development.
* `npm run stop` — Stop Flow.

We're using [Flow](http://flowtype.org) to add T Y P E S.

## Keyboard shortcuts

- `cmd-shift-c` Opens changes panel

### Staging Changes

- `right` on a file focuses hunk
- select hunks with `up` or `down`
- `enter` to stage hunk
- `/` to toggle line selection mode
- `shift-up` or `shift-down` to expand line selection
- `a` to select lines
- `enter` to stage selected lines
- `backspace` while on a changed file (not the diff) will prompt to discard changes
- `o` on a changed file or hunk/line will open that file in a tab
