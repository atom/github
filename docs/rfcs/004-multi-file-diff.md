# Multi-file Diffs

## Status

Proposed

## Summary

Users can select multiple files in unstaged changes and staged changes pane and see the diffs of selected files in one view, akin to the [`Files changed` tab in pull requests on github.com](https://github.com/atom/github/pull/1752/files).

## Motivation

So that users can view a set of changes with more context before staging or committing those changes.

The ability to display multiple diffs in one view will also serve as a building block for the following planned features:
- [commit pane item](#1655) where it shows all changes in a single commit
- [new PR review flow](https://github.com/atom/github/blob/master/docs/rfcs/003-pull-request-review.md) that shows all changed files proposed in a PR


## Explanation

#### Mock-ups coming soon

#### Unstaged Changes pane
- User can `cmd+click` and select multiple files from the list of unstaged changes, and the pane on the left (see multi-file diff section below) will show diffs of the selected files. That pane will continue to reflect any further selecting/unselecting on the Unstaged Changes pane.
- Once there is at least one file selected, `Stage All` button should be worded as `Stage Selected`.

#### Staged Changes pane
- Same behavior as Unstaged Changes pane.
- Once there is at least one file selected, `Unstage All` button should be worded as `Unstage Selected`.

#### Multi-file diff view
_(note: The following is a summary of what we would like the UX to achieve, but I don't have a clear visuals of what that looks like yet.)_

- Shows diffs of multiple files as a stack.
- Each diff should show up as its own block, and the current functionality should remain independent of each block.
- It should be easy to jump quickly to a specific file you care about, or back to the file list to get to another file. Dotcom does so by creating a `jump to` drop down.
- As user scrolls through a long list of diffs, there should be a sticky heading which remains visible showing the filename of the diff being viewed.


## Drawbacks

- `cmd-click` to select multiple files might not be as universally known as we assume, so that might affect discoverability of this feature.
- There might be performance concerns having to render many diffs at once.

## Rationale and alternatives

An alternative would be to _not_ implement multi-file diff, as other editors like VS Code also only has per-file diff at the time of writing. However, not implementing this would imply that [the proposed new PR review flow](https://github.com/atom/github/blob/master/docs/rfcs/003-pull-request-review.md) will have to find another solution to display all changes in a PR. 

## Unresolved questions

- What unresolved questions do you expect to resolve through the implementation of this feature before it is released in a new version of the package?

TBD

- What related issues do you consider out of scope for this RFC that could be addressed in the future independently of the solution that comes out of this RFC?

TBD

## Implementation phases
TBD

## Definition of done
TBD
