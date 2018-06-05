# Issueish List

## Status

Proposed

## Summary

Display a list of all open pull requests in the current repository in the GitHub tab.

## Motivation

To provide a navigational element that makes sense even if you aren't on an active feature branch.

To give users a way to see an overview of what's going on in the repository.

As an initial building block toward a pull request review workflow.

## Explanation

### Accordion Lists

Within the GitHub panel, render a vertical stack of two collapsible lists of _issueish_ (pull request or issue) items:

_First list: current pull request_. If the active branch is associated with one or more open pull requests on the GitHub repository, render an item for each.

_Second list: all open pull requests_. List all open pull requests on the GitHub repository.

Each list has a "collapse arrow" in its header. Clicking the collapse arrow toggles the visibility of that list's items, accordion-style.

If either list exceeds 20 items, truncate the list and render a "More" link after its final item. Clicking "more" opens the corresponding search on GitHub.

![Lists](https://user-images.githubusercontent.com/378023/40964722-ceb9d95a-68e6-11e8-90b3-1c155cdc2c00.png)

Each list item renders a tile containing a compact set of information about that pull request:

* Mini author avatar
* Title, truncated if necessary
* Terse relative timestamp (1d, 2h, 30m)
* Pull request state: open, closed, merged
* Status check summary

![List item](https://user-images.githubusercontent.com/378023/40964791-f4b28fbc-68e6-11e8-907b-c7d436d0d315.png)

Clicking on a list item opens an issueish pane item for the chosen issueish in the same pane container as the parent component (by default, the right dock). If the issuish pane item is already open, it is activated instead.

### Issueish Pane Item: Pull Request

For a pull request, the issueish pane shows:

* Author avatar
* Title
* Controls for actions:
  * "Checkout" to fetch (if necessary) and check out the pull request. Only enabled if the current pull request is not the current one.
  * "Browse" to launch a browser on the corresponding GitHub page.
  * "Merge" to merge the pull request on GitHub if it is open.
  * "Close" to close the pull request, unmerged, if it is open.
  * "Re-open" to re-open a pull request if it is closed.
* Pull request overview details: commit count, files changed.
* Full description as rendered markdown.
* Reaction emoji and counts.
* Details and links for all status checks.

![pane](https://user-images.githubusercontent.com/378023/41007709-0f9ba9a0-6962-11e8-8b2f-bf6aee8cf8fc.png)

## Drawbacks

This does not offer a mechanism to create _new_ pull requests, which we have now. We also lose timeline events on the pull request.

## Rationale and alternatives

Our current GitHub panel focuses on showing you stuff about _the pull request that's associated with your current branch._ The problem is, it's difficult to unambiguously determine that in the general case.

The first thing you see today when you open the GitHub panel on the `master` branch of an active repository is not very helpful:

![wat](https://user-images.githubusercontent.com/17565/40857603-99b92304-65a9-11e8-986e-0f14290bda8a.png)

This is a list of _all pull requests on GitHub that have a head ref called "master", from any head repository_. You can then "pin" any of them to see that pull request's details. This isn't useful on master and it's unclear to users what this is supposed to accomplish. Pinning was intended to be an infrequent edge case when we couldn't find the right PR for a given ref, not the first interaction you have with the package.

Showing a PR list instead provides a uniform, more easily understood entry point to the package's GitHub functionality, and paves the way to other pull-request-focused activities in the future. "All open PRs" seems like a reasonable starting point, and "current PRs" preserves the ability to take advantage of your local editor context.

With that said, the choices for the specific lists we show are a bit arbitrary. We'll need to research and iterate on them quite a bit to find what's most useful for the most people, but for now we need to start with something.

## Unresolved questions

### Before RFC merge:

- [ ] How can we still offer "push/publish+new pull request"?
- [ ] What else from the existing issueish pane should we keep? Comments, timeline events?
- [ ] Are there other pull request actions it would be useful to support?

### Out of scope:

- [ ] How can we allow a user to customize the lists?
- [ ] How can we notify a user about updated activity on a visible PR?

## Implementation phases

1. Accordion list infrastructure: search model, collapsible list component.
2. Revisit the issueish pane item and add action controls.
