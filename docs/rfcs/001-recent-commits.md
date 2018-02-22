# Recent commit view

## Status

Proposed

## Summary

Display the most recent few commits in a chronologically-ordered list beneath the mini commit editor. Show commit author and committer usernames and avatars, the commit message, and relative timestamp of each.

## Motivation

Provide useful context about recent work and where you left off.
Allow user to easily revert and reset to recent commits.
Make it easy to undo most recent commit action, supersede amend check box.
Reinforce the visual "flow" of changes through being unstaged, staged, and now committed.
Provide a discoverable launch point for an eventual log feature to explore the full history.

## Explanation

If the active repository has no commits yet, display a short panel with a background message: "Make your first commit".

Otherwise, display a **recent commits** section containing a sequence of horizontal bars for each of the top three commits reachable from the current `HEAD`, with the most recently created commit on top. The user can resize the recent commits section. As it is expanded or shrunk, the number of visible commits is changed responsively.

Each **recent commit** within the recent commits section summarizes that commit's metadata, to include:

* GitHub avatar for both the committer and (if applicable) author. If either do not exist, show a placeholder.
* The commit message (first line of the commit body) elided if it would be too wide.
* A relative timestamp indicating how long ago the commit was created.

On click, reveal a tool-tip containing:

* Additional user information consistently with the GitHub integration's user mention item.
* The full commit message and body.
* The absolute timestamp of the commit.

On the most recent commit, display an "undo" button. Clicking "undo" performs a `git reset` and re-populates the commit message editor with the existing message.

Right-clicking a recent commit reveals a context menu offering interactions with the chosen commit. The context menu contains:

* For the most recent commit only, an "Amend" option. "Amend" is enabled if changes have been staged or the commit message mini-editor contains text. Choosing this applies the staged changes and modified commit message to the most recent commit, in a direct analogue to using `git commit --amend` from the command line.
* A "Revert" option. Choosing this performs a `git revert` on the chosen commit.
* A "Hard reset" option. Choosing this performs a `git reset --hard` which moves `HEAD` and the working copy to the chosen commit. When chosen, display a modal explaining that this action will discard commits and unstaged working directory context. Extra security: If there are unstaged working directory contents, artificially perform a dangling commit, disabling GPG if configured, before enacting the reset. This will record the dangling commit in the reflog for `HEAD` but not the branch itself.
* A "Soft reset" option. Choosing this performs a `git reset --soft` which moves `HEAD` to the chosen commit and populates the staged changes list with all of the cumulative changes from all commits between the chosen one and the previous `HEAD`.

If any of the recent commits have been pushed to a remote, display a divider after the most recently pushed commit that shows an octocat icon. On hover, show the name of the remote tracking branch.

If the Git dock item is dragged to the bottom dock, the recent commit section will remain a vertical list but appear just to the right of the mini commit editor.

## Drawbacks

Consumes vertical real estate in Git panel.

The "undo" button is not a native git concept. This can be mitigated by adding a tooltip to the "undo" button that defines its action: a `git reset` and commit message edit.

The "soft reset" and "hard reset" context menu options are useful for expert git users, but likely to be confusing. It would be beneficial to provide additional information about the actions that both will take.

The modal dialog on "hard reset" is disruptive considering that the lost changes are recoverable from `git reflog`. We may wish to remove it once we visit a reflog view within the package. Optionally add "Don't show" checkbox to disable modal.

## Rationale and alternatives

- Display tracking branch in separator that indicates which commits have been pushed. This could make the purpose of the divider more clear. Drawback is that this takes up space.

## Unresolved questions

- Allow users to view the changes introduced by recent commits. For example, interacting with one of the recent commits could launch a pane item that showed the full commit body and diff, with additional controls for reverting, discarding, and commit-anchored interactions.
- Providing a bridge to navigate to an expanded log view that allows more flexible and powerful history exploration.
- Show an info icon and provide introductory information when no commits exist yet.
- Add a "view diff from this commit" option to the recent commit context menu.

## Implementation phases

- Can this functionality be introduced in multiple, distinct, self-contained pull requests?
- A specification for when the feature is considered "done."
