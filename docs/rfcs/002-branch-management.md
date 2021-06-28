# Branch Management From Command Palette

## Status

Proposed

## Summary

Efficient branch management that is in line with existing Atom conventions.

## Motivation

Current branch management is incomplete (e.g. no deleting of branches) and not consistent with other conventions found in the Atom UI for comparable actions. It is hard to switch or create new branches with just keyboard input.

## Explanation

The new branch selector exists largely in the [command palette](https://github.com/atom/command-palette). The only UI element is the pre-existing `branch-view` tile in the status bar:

![existing branch view tile](https://cldup.com/CE_61W1uBk.png)

### Command Palette

The command palette contains the following new commands:
- Create new branch (`github:create-new-branch`)
- Checkout branch (`github:checkout-branch`)
- Delete branch (`github:delete-branch`)
- Rename branch (`github:rename-branch`)

#### `github:create-new-branch`

Executing `github:create-new-branch` opens a text input dialog, similar to when creating a new file asks for the filename. When pressing "Escape", the dialog closes without creating a branch, when pressing "Return" a branch of that name is created and switched to.

![Branch name input](https://cldup.com/GhKgFE_zTy.png)

#### `github:checkout-branch`

Executing `github:checkout-branch` opens a filterable command palette list of local branches, similar to the list of available grammars when executing `grammar-selector:show`. Selecting a branch from that list switches to that branch.

![Local branch selector](https://cldup.com/GYfUP3TG8O.png)


#### `github:delete-branch`

Executing `github:delete-branch` opens a filterable command palette list of local branches, the same as executing `github:checkout-branch`. Selecting a branch from that list will show a prompt asking for confirmation to delete _[named branch_], including information whether that branch's merge status (e.g. _'test3' has been merged to 'refs/remotes/origin/test3', but not yet merged to HEAD._).

When pressing "Escape", the dialog closes without deleting that branch, when pressing "Return" that branch is deleted.


#### `github:rename-branch`

Executing `github:rename-branch` opens a filterable command palette list of local branches, the same as executing `github:checkout-branch`. Selecting a branch from that list will show a text input dialog, the same as executing `github:create-new-branch` but with the to-be-renamed branch's name pre-filled.

When pressing "Escape", the dialog closes without renaming that branch, when pressing "Return" that branch is renamed.


### Branch view tile in status bar

- Clicking the branch view tile executes the `github:checkout-branch` command and adds a "Create new branch…" entry to the list of local branches (for discoverability).
- Cmd/Ctrl-clicking the branch view tile executes the `github:create-new-branch` command.
- Right-clicking the branch view tile brings up a context menu with  the following items:
   - Create new branch
   - Checkout branch
   - Delete branch
   - Rename branch
- A tooltip for the status bar tile explains these options.

## Drawbacks

No drawbacks compared to the current branch management solution come to mind.

## Rationale and alternatives

- This approach uses established UI conventions to carry out common branch management commands.
- A [different proposal for branch management #556](https://github.com/atom/github/issues/556) has been made in the past that has a larger scope than this proposal. This proposal could be a step into the right direction of branch management without taking on the full scope of #556.


## Unresolved questions

- Is this a worthwhile undertaking when proposals like #556 exist?
- Should deletion of branches be possible from the UI?
- What kind of warnings should branch deletion trigger?
- How harmful or confusing is renaming of branches in real life?
- How much user education about deleting and renaming should be in the UI? And where?

## Future Features

- Checkout remote branches.
- Prune merged branches.

## Implementation phases

1. Extract "Create branch" from current `branch-menu-view` into command palette.
1. Replace branch switching in `branch-menu-view` with command palette, removing `branch-menu-view`.
1. Add branch renaming feature.
1. Add branch deleting feature.
