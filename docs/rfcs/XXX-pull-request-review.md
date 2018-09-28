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

### Non-current pull request tiles

Pull request tiles other than the current pull request display a one-line review summary, showing the number of accepting, comment, and change-request reviews made on each. Clicking the review summary opens the `IssueishPaneItem` for that pull request and opens the reviews tab.

> TODO: sketch here

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

### IssueishPaneItem "Reviews" tab

Additionally, each has a "Reviews" tab that shows all reviews associated with this pull request in an accordion-style list. Unexpanded, each review is shown as its full summary comment and chosen outcome (comment, approve, or request changes). Expanded, its associated review comments are listed as well on their proximate diffs.

> TODO: sketch here

* The "Mark as resolved" and "comment" buttons and the "reply" text areas match their behavior in the "Changes" tab.
* The up and down arrow buttons and :hamburger: button are not present here.
* The "code" (`<>`) button also behaves as it does on the "Changes" tab.

### In-editor decorations

When opening a TextEditor on a file that has been annotated with review comments on the current pull request, a block decoration is used to show the comment content at the corresponding position within the file content. Also, a gutter decoration is used to reveal lines that are included within the current pull requests' diff and may therefore include comments.

![in-editor](https://user-images.githubusercontent.com/378023/44790482-69bcc800-abda-11e8-8a0f-922c0942b8c6.png)

> TODO: add gutter decoration?

* The comment's position is calculated from the position acquired by the GitHub API response, modified based on the git diff of that file (following renames) between the owning review's attached commit and the current state of the working copy (including any local modifications). Once created, the associated marker will also track unsaved modifications to the file in real time.
* The up and down arrow buttons navigate to the next and previous review comments within this review within their respective TextEditors.
* The "diff" button navigates to the "Reviews" tab of the corresponding pull request's `IssueishPaneItem`, expands the owning review, and scrolls to center the same comment within that view.

## Drawbacks

<!--
Why should we *not* do this?
-->

## Rationale and alternatives

<!--
- Why is this approach the best in the space of possible approaches?
- What other approaches have been considered and what is the rationale for not choosing them?
- What is the impact of not doing this?
-->

## Unresolved questions

<!--
- What unresolved questions do you expect to resolve through the RFC process before this gets merged?
- What unresolved questions do you expect to resolve through the implementation of this feature before it is released in a new version of the package?
- What related issues do you consider out of scope for this RFC that could be addressed in the future independently of the solution that comes out of this RFC?
-->

## Implementation phases

<!--
- Can this functionality be introduced in multiple, distinct, self-contained pull requests?
- A specification for when the feature is considered "done."
-->
