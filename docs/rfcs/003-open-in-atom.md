# Open in Atom

## Status

Proposed

## Summary

A quick way to switch from github.com to Atom.

## Motivation

There are many ways how a user can discover new pull requests. There are also many ways where a user might save a pull request for later. But something that they all have in common: A URL.

![image](https://user-images.githubusercontent.com/378023/41331997-d8782114-6f16-11e8-9709-9299b250292e.png)

At the time you decide to start working on something, chances are high you are on github.com or can click a link to github.com. Therefore let's make it easy switch from github.com and continue in Atom.

### User Story:

In the morning Jody arrives at the office and checks their email. There are lots of notifications from GitHub. Jody briefly scans through them and stars the ones that look interesting or important. Then Jody keeps working on a new feature they started yesterday. After lunch, Jody decides to go back to their starred emails. A notification that got their interest is about a review request from a co-worker. Jody is eager to take a look and clicks on the link in the email. The browser opens and the PR page is shown. Jody reads through the conversation to understand what the PR is about, then switches to the "Files changed" to look at the code changes. Jody is thinking: "Hmm.. I wonder how it would feel to change the order?".

This is a moment where an "Open in Atom" feature would come in handy. Effortlessly switch from looking at a line on github.com to have the same line open in Atom, ready to be edited and tested locally.

Instead, Jody does the following:

1. Scrolls to the top of the page
2. Clicks on "Conversation"
3. Scrolls to the bottom of the page
4. Clicks on "command line instructions"
5. Copies the `git checkout` part
6. Opens Terminal
7. CDs to the repo's directory
8. Pastes the `git checkout` command
9. Types `atom .`
10. While Atom is opening, goes back to the diff to copy the line.
11. In Atom, does a "Find in project" with the copied line
12. Clicks on the found result
13. Finally is ready to edit the line

How can we improve this "start on github.com, continue in Atom" workflow? How can the dozen of steps in the above example be reduced to just 1-2 clicks?

## Explanation

In various places on github.com a user has the option to "Open in Atom". It's the same idea as the "Open in Desktop" that already exists.

> Note: Out of simplicity, GitHub Desktop or other editors are not shown in the mockups. If multiple options are available, a dropdown could be used to make a choice.

![image](https://user-images.githubusercontent.com/378023/41336470-4fe89d04-6f27-11e8-9d0d-9f5b4682db9b.png)

Once a user authenticates the GitHub package in Atom with their GitHub login, an "Open in Atom" option will be available on github.com in the following places:

### Repo

1. Clones the repo to Atom's "Project Home" (config) directory
2. Opens a new Atom window with the repo as its project

![image](https://user-images.githubusercontent.com/378023/41266162-c59358b6-6e30-11e8-9cf9-3c420fb1c2db.png)

### Pull Request

1. Clones the repo (if needed)
2. Checks out the branch of the PR
3. Opens a new Atom window
    - Or focuses the window if the repo already exists as an opened project
4. Opens the GitHub panel showing the PR details

![image](https://user-images.githubusercontent.com/378023/41266455-e0abfd96-6e31-11e8-9f0e-124a3adc4058.png)


### Merge conflict

1. Clones the repo (if needed)
2. Checks out the branch
3. Opens a new Atom window
    - Or focuses the window if the repo already exists as an opened project
4. Opens the Git panel (showing all conflicting files)
5. Opens the (first) conflicting file
6. Scrolls to the (first) conflict

![image](https://user-images.githubusercontent.com/378023/41271078-6c8e6a6c-6e49-11e8-96ee-5b0b5e55ef3d.png)

### File

1. Clones the repo (if needed)
2. Checks out the branch
3. Opens a new Atom window
    - Or focuses the window if the repo already exists as an opened project
4. Opens the file

![image](https://user-images.githubusercontent.com/378023/41266930-30a24092-6e34-11e8-9c6e-36af97bc2bb3.png)

### Line

1. Clones the repo (if needed)
2. Checks out the branch
3. Opens a new Atom window
    - Or focuses the window if the repo already exists as an opened project
4. Opens the file
5. Scrolls to the line
6. Shows a blinking cursor at the beginning of the line 

![open-in-atom](https://user-images.githubusercontent.com/378023/41338002-ccfe8944-6f2b-11e8-95d7-7e823e6d8643.png)


## Drawbacks

None that come to mind.

## Rationale and alternatives

By reducing the friction for moving from github.com to Atom, we can improve the following:

- Higher quality of code reviews.
    - Sometimes a reviewer might have the urge to suggest something, but they are not sure without testing it first. But since testing locally takes so many steps, they might just leave a comment like "Looks good to me" and move on. 👉 The easier it is to test changes, the better the reviews will become.
- More contributions.
    - If a reviewer tests something locally and makes edits, they might commit the changes and push it back to the PR. 👉 Reviewers that can easily edit and test a PR more likely become collaborators.
- Better integration with other applications.
    - Be able to open files, lines, merge conflicts etc. in Atom isn't just limited to github.com, it's also possible for other applications. For example if there is a merge conflict in GitHub Desktop, instead of manually switching and trying to find the conflict, GitHub Desktop could send you to Atom in a more seamless way.

### Alternatives

An alternative is to let users discover PRs/issues or get notified about changes **within** Atom. This would certainly be nice to have, but it will be a very long road until a "never have to leave Atom" is reached. Especially for our tiny team. We also don't have to pick one or the other and both approaches can complement each other.

An alternative to have an Atom integration directly build into github.com would be to create a **browser extension**. A benefit is that it can be extended to other web sites/apps. For example an "Open in Atom" link inside Gmail for GitHub notifications. Downside: Users have to first install the extension.

## Unresolved questions

- [ ] Is github.com interested in adding an "Open in Atom" option? And possibly other editors? There is already a [Clone in Xcode](https://blog.github.com/2017-06-05-clone-in-xcode/) option.
- [ ] Are there any security risks that need to be investigated beforehand.
- [ ] What could the API (URI) look like? E.g. `atom://github/open?pull=1234`

## Implementation phases

- [ ] Add an "Open in Atom" feature to the GitHub package. These URIs can already be "hand-composed" and for example pasted into Slack. Or used by other applications.
- [ ] Create a Chrome browser extension to first test adoption and get feedback.
- [ ] If it turns out to get a lot of usage, consider integrating directly into github.com.
