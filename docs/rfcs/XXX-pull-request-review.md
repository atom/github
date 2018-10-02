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

![review-list](https://user-images.githubusercontent.com/378023/46273505-b9533280-c590-11e8-840e-a8eac8023cad.png)

* The review summary bubble is elided after the first sentence or N characters if necessary.
* Clicking the review summary bubble opens an `IssueishDetailItem` in the workspace center.
* Clicking a line comment opens or activates an editor on the referenced file and scrolls to center the comment's line, translated according to local changes if appropriate.
* Line comments within the review are rendered: _with a vertical blue bar_ before the file has been opened and the corresponding decoration is visible; _with a vertical grey bar_ after the file and decoration have been seen; and _with a vertical green bar_ after the comment has been marked "resolved" with the control on its decoration.
* The review summary bubble and line comment lists are greyed out if a different `IssueishDetailItem` is activated.

If a new review has been started locally, it appears at the top of the "Reviews" section within this tile:

![pending-review](https://user-images.githubusercontent.com/378023/46275946-9bd69680-c599-11e8-9889-66c35458286a.png)

* The review summary is a TextEditor that may be used to compose a summary comment.
* Choosing "Cancel" dismisses the review and any comments made. If there are local review comments that will be lost, a confirmation prompt is shown first.
* Choosing "Submit review" submits the drafted review to GitHub.

### IssueishPaneItem "Changes" tab

Each `IssueishPaneItem` opened on a pull request has a "Changes" tab that shows the full PR diff, annotated with comments from all reviews.

Summary comments for each existing review appear in a list before the PR diff's body. A banner at the top of the diff offers navigation to individual files within the diff and to individual review comments, allows each review to be hidden or shown with a filter control, and shows a progress bar that counts "resolved" review comments.

![changes-tab](https://user-images.githubusercontent.com/378023/46287431-6e9bdf80-c5bd-11e8-99eb-f3f81ba64e81.png)

* The navigation and filter banner remains visible as the "Changes" tab is scrolled.
* The up and down arrow buttons quickly scroll to center the next or previous comment within this tab.
* Clicking the "code" (`<>`) button opens the corresponding file in a TextEditor and scrolls to the review comment decoration there. If the current pull request is not checked out, the "code" button is disabled, and a tooltip prompts the user to check out the pull request to edit the source.
* Reaction emoji may be added to each comment with the "emoji" button. Existing emoji reaction tallies are included beneath each comment.
* Clicking "mark as resolved" marks the comment as resolved with on GitHub. If the "reply..." editor has non-whitespace content, it is submitted as a final comment first.
* The "comment" button is disabled unless the "reply" editor is expanded and has non-whitespace content.
* Clicking "comment" submits the response as a new stand-alone comment on that thread.

Hovering in the diff's gutter reveals a `+` icon that allows users to begin creating a new review, or making an isolated comment, using the same UI described in ["In-editor decorations"](#in-editor-decorations). If a pending review is present, its comments are also shown and editable here. A pending review may be finalized by submitting a form that appears at the end of the existing review summary comment list.

### In-editor decorations

When opening a TextEditor on a file that has been annotated with review comments on the current pull request, a block decoration is used to show the comment content at the corresponding position within the file content. Also, a gutter decoration is used to reveal lines that are included within the current pull requests' diff and may therefore include comments.

![in-editor](https://user-images.githubusercontent.com/378023/44790482-69bcc800-abda-11e8-8a0f-922c0942b8c6.png)

> TODO: add gutter decoration?

* The comment's position is calculated from the position acquired by the GitHub API response, modified based on the git diff of that file (following renames) between the owning review's attached commit and the current state of the working copy (including any local modifications). Once created, the associated marker will also track unsaved modifications to the file in real time.
* The up and down arrow buttons navigate to the next and previous review comments within this review within their respective TextEditors.
* The "diff" button navigates to the corresponding pull request's `IssueishDetailItem` and scrolls to center the same comment within that view.

Hovering along the gutter within a pull request diff region reveals a `+` icon, which may be clicked to begin a new review:

![plus-icon](https://user-images.githubusercontent.com/378023/40348708-6698b2ea-5ddf-11e8-8eaa-9d95bc483fb1.png)

Clicking the `+` reveals a new comment box, which may be used to submit a single comment or begin a multi-comment review:

![single-review](https://user-images.githubusercontent.com/378023/40351475-78a527c2-5de7-11e8-8006-72d859514ecc.png)

* If a draft review is already in progress, the "Add single comment" button is disabled and the "Start a review" button reads "Add review comment".
* Clicking "Add single comment" submits a non-review diff comment and does not create a draft review.
* Clicking "Start a review" creates a draft review and attaches the authored comment to it.

## Drawbacks

This adds a substantial amount of complexity to the UI, which is only justified for users that use GitHub pull request reviews.

Showing all reviews in the current pull request tile can easily overwhelm the other pull request information included there. It also limits our ability to expand the information we provide there in the future (like associated issues, say).

Rendering pull request comments within TextEditors can be intrusive: if there are many, or if your reviewers are particularly verbose, they could easily crowd out the code that you're trying to write and obscure your context.

## Rationale and alternatives

<!-- Ongoing --->

## Unresolved questions

### Questions I expect to address before this is merged

Can we access "draft" reviews from the GitHub API, to unify them between Atom and GitHub?

* _Yes, the `reviews` object includes it in a `PENDING` state._

How do we represent the resolution of a comment thread? Where can we reveal this progress through each review, and of all required reviews?

* _We'll show a progress bar on a sticky header at the top of the `IssueishDetailItem`._

Are there any design choices we can make to lessen the emotional weight of a "requests changes" review? Peer review has the most value when it discovers issues for the pull request author to address, but accepting criticism is a vulnerable moment.

* _Chosing phrasing and iconography carefully for "recommend changes"._

Similarly, are there any ways we can encourage empathy within the review authoring process? Can we encourage reviewers to make positive comments or demonstrate humility and open-mindedness?

* _Emoji reactions on comments :cake: :tada:_
* _Enable integration with Teletype for smoother jumping to a synchronous review_

### Questions I expect to resolve throughout the implementation process

Review comment positioning within live TextEditors will be a tricky problem to address satisfactorily. What are the edge cases we need to handle there?

* _Review comments on deleted lines._
* _Review comments on deleted files._

The GraphQL API paths we need to interact with all involve multiple levels of pagination: pull requests, pull request reviews, review comments. How do we handle these within Relay? Or do we interact directly with GraphQL requests?

How do we handle comment threads?

### Questions I consider out of scope of this RFC

What other pull request information can we add to the GitHub pane item?

Are there other tabs that we need within the `IssueishDetailItem`?

How can we notify users when new information, including reviews, is available, preferably without being intrusive or disruptive?

## Implementation phases

![dependency-graph](https://user-images.githubusercontent.com/17565/46361100-d47a7c80-c63a-11e8-83de-4a548be9cb9c.png)
