# Multi-file Diffs

## Status

Proposed

## Summary

Users can select multiple files in unstaged changes and staged changes pane and see the diffs of selected files in one view, akin to the [`Files changed` tab in pull requests on github.com](https://github.com/atom/github/pull/1753/files).

## Motivation

So that users can view a full set of changes with more context before staging or committing those changes.

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

![staged changes](https://user-images.githubusercontent.com/378023/47497740-0a0b3200-d896-11e8-85af-7c644af9ca37.png)

#### Multi-file diff view

- Shows diffs of multiple files as a stack.
- Each diff should show up as its own block, and the current functionality should remain independent of each block.
- It should be easy to jump quickly to a specific file you care about, or back to the file list to get to another file. Dotcom does so by creating a `jump to` drop down.
- As user scrolls through a long list of diffs, there should be a sticky heading which remains visible showing the filename of the diff being viewed.
Nice-to-have UX that doesn't necessarily need to be implemented
- Each file diff can be collapsed (this can potentially be )

All files collapsed | Some files collapsed
--- | ---
![all collapsed](https://user-images.githubusercontent.com/378023/47497741-0a0b3200-d896-11e8-90b5-4153009f80b4.png) | ![some collapsed](https://user-images.githubusercontent.com/378023/47498408-27410000-d898-11e8-8e4b-c02dafe7e35a.png)


## Drawbacks

- `cmd-click` to select multiple files might not be as universally known as we assume, so that might affect discoverability of this feature.
- There might be performance concerns having to render many diffs at once.

## Rationale and alternatives

An alternative would be to _not_ implement multi-file diff, as other editors like VS Code also only has per-file diff at the time of writing. However, not implementing this would imply that [the proposed new PR review flow](https://github.com/atom/github/blob/master/docs/rfcs/003-pull-request-review.md) will have to find another solution to display all changes in a PR. Additionally users would have to do a lot more clicking to view all of their changes. Imagine there was a variable rename and only 10 lines are changed, but they are each in a different file. It'd be a bit of a pain to click through to view each one. Also, if we didn't implement multi-file diffs then we couldn't show commit contents since they often include changes across multiple files.

## Unresolved questions

- What unresolved questions do you expect to resolve through the implementation of this feature before it is released in a new version of the package?

How exactly do we construct the multi-file diffs? Do we have one TextEditor component that has different sections for each file. Or do we create a new type of pane item that contains multiple TextEditor components stacked on top of one another, one for each file diff... If we do the former we could probably get something shipped sooner (we could just get the diff of the staged changes from Git, add a special decoration for file headers, and present all the changes in one editor). But to pave the way for a more complex code review UX I think taking extra time to do the latter will serve us well. For example, I can imagine reviewers wanting to collapse some files, or mark them as "Done", in which case it would be easier if we treated each diff as its own component.

- What related issues do you consider out of scope for this RFC that could be addressed in the future independently of the solution that comes out of this RFC?

It would be cool if each diff was collapsable. Especially for when we start using the multi-file diff for code review and the reviewers may want to hide the contents of a file once they're done addressing the changes in it. "Collapse/Expand All" capabilities would be nice as well. I don't see this as a critical feature for this particular RFC.

## Implementation phases
TBD

## Definition of done
TBD
