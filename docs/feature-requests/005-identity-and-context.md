**_Part 1 - Required information_**

# Identity and Context Tiles

## :memo: Summary

Add a small tile to the top of the Git and GitHub dock items to display and manage contextual information like the currently authenticated user and the active git repository.

## :checkered_flag: Motivation

All of our Git and GitHub actions and displayed information track a "current repository" that follows the path of your active pane item. Historically, this has been a source of confusion for users:

* If you have no changes and are on the default branch in two repositories, there is no visual indication of which repository is the "active" one. _(This has bitten me personally more than once when I create a new branch in the wrong repository by mistake, and I wrote the damn thing.)_
* When adding a new project folder, the current repository remains the previous one until you open a file within the new folder.
* Opening a new file that isn't within a git repository causes the git panel to revert to its "initialize here?" state, which is jarring when you want to make quick external edits.

We also have a host of long-standing issues related to identity management:

* There is no way to configure your git username and email address on first install. This means that a new user who doesn't have git installed on their machine already still needs to do so, even though we bundle a git binary as part of Atom! _(Okay, technically, you can create a `~/.gitconfig` with the appropriate values by hand. That kind of sucks though.)_ [#932](https://github.com/atom/github/issues/932)
* Our Git item provides no indication of what identity it's going to use to create a new commit. This can cause friction for users who use different email addresses for work and personal projects or who wish to use masked `@noreply` email addresses.
* Our GitHub item provides no indication of the current GitHub user. While I don't expect that managing multiple GitHub accounts is a common need, it can arise in situations like shared machines.
* Our GitHub item gives you no way to log out or re-authenticate as a different user. _(You can do it by running `GitHub: Logout` from the command palette, but this is not discoverable.)_ [#1693](https://github.com/atom/github/issues/1693)

And, finally, the mechanism to refresh the GitHub tab with new data is completely hidden.

## 🤯 Explanation

### Git context and identity tile

The Git tab has a _context and identity tile_ at its top that displays:

* The GitHub avatar corresponding to your current git identification, as read by `git config user.email`. If no GitHub account is associated with the configured email address, a placeholder is shown instead. On hover, your full git identification is shown in a tooltip (_Real Name <email@address.com>_). Clicking your avatar opens the "introduction" view to allow you to change your configuration.
* The path to the currently active git repository, shortened in a way [consistent with the way project folders appear in tree-view](https://github.com/atom/tree-view/blob/master/lib/tree-view.coffee#L336). If multiple repositories are available, this is a drop-down menu allowing you to change the active repository.

> "Available" repositories are discovered by taking the set of paths from:
> * Project root folders
> * Paths of open pane items
> * `getWorkingDirectoryPath()` results from open github package pane items
> Then locating the set of git repositories containing each (if any) using `git rev-parse --show-toplevel` and
> `git rev-parse --absolute-git-dir`.

![git](https://user-images.githubusercontent.com/378023/52548367-abe86780-2e10-11e9-9dc1-8c4e3c2ad098.png)

### GitHub context and identity tile

The GitHub tab has a _context and identity tile_ at its top that displays:

* The GitHub avatar corresponding to the currently logged-in GitHub user. On hover, the GitHub username is displayed in a tooltip (_@smashwilson_). Clicking your avatar reveals the `GithubLoginView`.
* The path to the currently active git repository, as in the Git context tile.
* A refresh button. On click, the information displayed in the GitHub tab is re-fetched.

![github](https://user-images.githubusercontent.com/378023/52548380-b86cc000-2e10-11e9-9899-110306c2153c.png)

### Git introduction view

If you haven't configured `user.email` and `user.name`, the Git tab displays the _introduction view_. This view allows you to see and enter your name and email address.

![identity](https://user-images.githubusercontent.com/378023/52549612-59f71000-2e17-11e9-84ff-c6c36bf5c015.png)

### GitHub login view

![login](https://user-images.githubusercontent.com/378023/52549614-5a8fa680-2e17-11e9-984a-f7eaf20c0f48.png)

**_Part 2 - Additional information_**

## :anchor: Drawbacks

This occupies prime vertical graphical real estate in our already-small dock item display area, which users will likely not need to interact with often.

Not all users have GitHub accounts. Displaying a GitHub avatar on the Git tab item may be off-putting.

## :thinking: Rationale and alternatives

_TBD_

## :question: Unresolved questions

* If only one git repository is available, should we bother rendering it in the drop-down menus, or omit it to save visual noise?
* Is the avatar-with-tooltip pattern a reasonable compromise to save space?
* Should we make an attempt to differentiate between multiple git repository paths that share the same basename?
* Can we detect when a user has configured GitHub's email anonymity and populate their `git user.email` accordingly?

## :warning: Out of Scope

* Configuring different identities for different git repositories. We should read the git user information with `git config`, but always write with `git config --global`.

## :construction: Implementation phases

_TBD_

## :white_check_mark: Feature description for Atom release blog post

_TBD_

<!--
- When this feature is shipped, what would we like to say or show in our Atom release blog post (example: http://blog.atom.io/2018/07/31/atom-1-29.html)
- Feel free to drop ideas and gifs here during development
- Once development is complete, write a blurb for the release coordinator to copy/paste into the Atom release blog
-->
