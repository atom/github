# Feature title

Pull Request Review

## Status

Proposed

## Summary

Give or receive code reviews on pull requests within Atom.

## Motivation

Workflows around pull request reviews involve many trips between your editor and your browser. If you check out a pull request locally to test it and want to leave comments, you need to map the issues that you've found in your working copy back to lines on the diff to comment appropriately. Similarly, when you're given a review, you have to mentally correlate review comments on the diff on GitHub with the corresponding lines in your local working copy, then map _back_ to diff lines to respond once you've established context. By revealing review comments as decorations directly within the editor, we can eliminate all of these round-trips and streamline the review process for all involved.

## Explanation

### Entry points

Reviews on the current pull request are rendered as a list on the current pull request tile.

![review-list](https://user-images.githubusercontent.com/378023/44708426-1f582000-aae2-11e8-86bd-3074ae259e2d.png)

* The review summary bubble is elided after the first sentence or N characters if necessary.
* Clicking the review summary bubble opens an `IssueishPaneItem` in the workspace center, open to the reviews tab.
* Clicking a line comment opens or activates an editor on the referenced file and scrolls to center the comment's line, translated according to local changes if appropriate.
* Line comments within the review are rendered: _with a dot_ before the file has been opened and the corresponding decoration is visible; _with no icon_ after the file and decoration have been seen; and _with a checkmark_ after the comment has been marked "resolved" with the control on its decoration.

Pull request tiles other than the current pull request display a one-line review summary, showing the number of accepting, comment, and change-request reviews made on each. Clicking the review summary opens the `IssueishPaneItem` for that pull request and opens the review tab.

> TODO: sketch here

Each `IssueishPaneItem` opened on a pull request has a "Reviews" tab that shows the active reviews.

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
