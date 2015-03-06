# git package

```
git clone git@github.com:atom/git.git
cd git
apm install
apm link -d
atom .

cd ../some-dir-with-a-git-repo
atom -d
```

## Keyboard shortcuts

- `cmd-shift-c` Opens changes
- `cmd-shift-h` Opens history

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
