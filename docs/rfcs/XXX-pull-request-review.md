# Feature title

Pull Request Review

## Status

Proposed

## Summary

Give and receive code reviews on pull requests within Atom.

## Motivation

Workflows around pull request reviews involve many trips between your editor and your browser. If you check out a pull request locally to test it and want to leave comments, you need to map the issues that you've found in your working copy back to lines on the diff to comment appropriately. Similarly, when you're given a review, you have to mentally correlate review comments on the diff on GitHub with the corresponding lines in your local working copy, then map _back_ to diff lines to respond once you've established context. By revealing review comments as decorations directly within the editor, we can eliminate all of these round-trips and streamline the review process for all involved.

Peer review is also a critical part of the path to acceptance for pull requests in many common workflows. By surfacing progress through code review, we provide context on the progress of each unit of work alongside existing indicators like commit status.

## Explanation

### Current pull request tile

Reviews on the current pull request are rendered as a list on the current pull request tile.

![review-list](https://user-images.githubusercontent.com/378023/44708426-1f582000-aae2-11e8-86bd-3074ae259e2d.png)

* The review summary bubble is elided after the first sentence or N characters if necessary.
* Clicking the review summary bubble opens an `IssueishPaneItem` in the workspace center, open to the reviews tab.
* Clicking a line comment opens or activates an editor on the referenced file and scrolls to center the comment's line, translated according to local changes if appropriate.
* Line comments within the review are rendered: _with a dot_ before the file has been opened and the corresponding decoration is visible; _with no icon_ after the file and decoration have been seen; and _with a checkmark_ after the comment has been marked "resolved" with the control on its decoration.

If a new review has been started locally, it appears at the top of the "Reviews" section within this tile:

![pending-review](https://user-images.githubusercontent.com/378023/40404269-db852df6-5e91-11e8-9e16-bae433d3a5f9.png)

* The review summary is a TextEditor that may be used to compose a summary comment.
* Choosing "Cancel" dismisses the review and any comments made. If there are local review comments that will be lost, a confirmation prompt is shown first.
* Choosing "Submit review" submits the drafted review to GitHub.

### Non-current pull request tiles

Pull request tiles other than the current pull request display a one-line review summary, showing the number of accepting, comment, and change-request reviews made on each. Clicking the review summary opens the `IssueishPaneItem` for that pull request and opens the reviews tab.

![non-current pull request tile](https://user-images.githubusercontent.com/17565/46228625-a2aea080-c330-11e8-945b-72be7824623f.png)

### IssueishPaneItem "Changes" tab

Each `IssueishPaneItem` opened on a pull request has a "Changes" tab that shows the full PR diff, annotated with comments from all reviews.

![changes-tab](https://user-images.githubusercontent.com/378023/44789879-ba332600-abd8-11e8-9247-a19015ccd760.png)

* The up and down arrow buttons quickly scroll to center the next or previous comment within this tab.
* Clicking the :hamburger: button navigates to the "Reviews" tab, expands the owning review, and scrolls to the same comment within that view.
* Clicking the "code" (`<>`) button opens the corresponding file in a TextEditor and scrolls to the review comment decoration there.
* Clicking within the "Reply..." text editor expands the editor to several lines and focuses it.
* Clicking "mark as resolved" marks the comment as resolved with on GitHub. If the "reply..." editor has non-whitespace content, it is submitted as a final comment first.
* The "comment" button is disabled unless the "reply" editor is expanded and has non-whitespace content.
* Clicking "comment" submits the response as a new stand-alone comment on that thread.

Hovering in the diff's gutter reveals a `+` icon that allows users to begin creating a new review with the same UI as described in the "In-editor decorations" section.

### IssueishPaneItem "Reviews" tab

Additionally, each has a "Reviews" tab that shows all reviews associated with this pull request in an accordion-style list. Unexpanded, each review is shown as its full summary comment and chosen outcome (comment, approve, or request changes). Expanded, its associated review comments are listed as well on their proximate diffs.

> TODO: sketch here

* The "Mark as resolved" and "comment" buttons and the "reply" text areas match their behavior in the "Changes" tab.
* The up and down arrow buttons and :hamburger: button are not present here.
* The "code" (`<>`) button also behaves as it does on the "Changes" tab.

A local, pending review created by the user is also shown at the top of this list, with controls to edit its summary comment and choose its final state.

> TODO: sketch here

### In-editor decorations

When opening a TextEditor on a file that has been annotated with review comments on the current pull request, a block decoration is used to show the comment content at the corresponding position within the file content. Also, a gutter decoration is used to reveal lines that are included within the current pull requests' diff and may therefore include comments.

![in-editor](https://user-images.githubusercontent.com/378023/44790482-69bcc800-abda-11e8-8a0f-922c0942b8c6.png)

> TODO: add gutter decoration?

* The comment's position is calculated from the position acquired by the GitHub API response, modified based on the git diff of that file (following renames) between the owning review's attached commit and the current state of the working copy (including any local modifications). Once created, the associated marker will also track unsaved modifications to the file in real time.
* The up and down arrow buttons navigate to the next and previous review comments within this review within their respective TextEditors.
* The "diff" button navigates to the "Reviews" tab of the corresponding pull request's `IssueishPaneItem`, expands the owning review, and scrolls to center the same comment within that view.

Hovering along the gutter within a pull request diff region reveals a `+` icon, which may be clicked to begin a new review:

![plus-icon](https://user-images.githubusercontent.com/378023/40348708-6698b2ea-5ddf-11e8-8eaa-9d95bc483fb1.png)

Clicking the `+` reveals a new comment box, which may be used to submit a single comment or begin a multi-comment review:

![single-review](https://user-images.githubusercontent.com/378023/40351475-78a527c2-5de7-11e8-8006-72d859514ecc.png)

## Drawbacks

This adds a substantial amount of complexity to the UI, which is only justified for users that use GitHub pull request reviews.

Showing all reviews in the current pull request tile can easily overwhelm the other pull request information included there. It also limits our ability to expand the information we provide there in the future (like associated issues, say).

Rendering pull request comments within TextEditors can be intrusive: if there are many, or if your reviewers are particularly verbose, they could easily crowd out the code that you're trying to write and obscure your context.

## Rationale and alternatives

One alternative may be to show review comments _only_ within the "changes" tab of an `IssueishPaneItem`. This simplifies flow considerably, because it removes the need to provide navigation among different views of the same review, and unifies the handling of current and non-current pull requests. However, I believe that the renderings of reviews in all three places each serve a unique purpose:

* Reviews within the "Changes" tab of the `IssueishPaneItem` reveal a narrative formed by all of the reviews on a specific pull request together, as a conversation among reviewers.
* Reviews within the "Review" tab of the `IssueishPaneItem` reveal the narrative flow within each review individually. For example, review comments that refer to other comments within the same review (e.g. "same here" or "and again") become clearer here.
* Review comments within open TextEditors allow the reader to use more context within the source code to evaluate, address, or respond to each individual comment thread: consistency with functions that are not visible within the immediate diff, context within algorithms that span many lines. They also allow the receiver of a review to preserve the mental context of the review communication as they move back and forth between reading the content of a review and applying it to their source.

## Unresolved questions

### Questions I expect to address before this is merged

Can we access "draft" reviews from the GitHub API, to unify them between Atom and GitHub?

How do we represent the resolution of a comment thread? Where can we reveal this progress through each review, and of all required reviews?

Are there any design choices we can make to lessen the emotional weight of a "requests changes" review? Peer review has the most value when it discovers issues for the pull request author to address, but accepting criticism is a vulnerable moment.

Similarly, are there any ways we can encourage empathy within the review authoring process? Can we encourage reviewers to make positive comments or demonstrate humility and open-mindedness?

### Questions I expect to resolve throughout the implementation process

Review comment positioning within live TextEditors will be a tricky problem to address satisfactorily. What are the edge cases we need to handle there?

The GraphQL API paths we need to interact with all involve multiple levels of pagination: pull requests, pull request reviews, review comments. How do we handle these within Relay? Or do we interact directly with GraphQL requests?

How do we handle comment threads?

### Questions I consider out of scope of this RFC

What other pull request information can we add to the GitHub pane item?

Are there other tabs that we need within the `IssueishPaneItem`?

How can we notify users when new information, including reviews, is available, preferably without being intrusive or disruptive?

## Implementation phases

<!--
- Can this functionality be introduced in multiple, distinct, self-contained pull requests?
- A specification for when the feature is considered "done."
-->
