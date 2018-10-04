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

### Review information in Pull Request list

Review progress is indicated for open pull requests listed in the GitHub panel. The pull request corresponding to the checked out branch gets special treatment in it's own section at the top of the list.

<img width="339" alt="pull request list with review progress bars" src="https://user-images.githubusercontent.com/7910250/46391240-ad4e9a00-c690-11e8-904b-e4cfd2c0f667.png">

Clicking a pull request in the list opens a `PullRequestDetailItem` in the workspace center.

For PRs that are not listed in the panel, users can use the `github:open-issue-or-pull-request` command:

<img width="679" alt="opening a pull request by URL" src="https://user-images.githubusercontent.com/7910250/46391629-c8baa480-c692-11e8-8010-0cceb69394b1.png">

### PullRequestDetailItem

Each `PullRequestDetailItem` opened on a pull request displays the full, multi-file diff associated with the pull request. Review comments are shown within the diff. See ["Comment decorations"](#comment-decorations) for description of review comments.

![pull request detail item](https://user-images.githubusercontent.com/7910250/46391711-1df6b600-c693-11e8-87f3-ad4cdbe8ebd8.png)

> :construction: Update mock to have "Start review button" and "Add single comment"

Diffs are editable _only_ if the pull request branch is checked out and the local branch history has not diverged from the remote branch history.

A panel at the bottom of the pane offers various options for sorting and filtering the diff. It also has a "Review Changes" button.

#### Sort Options

<img width="731" alt="sort by" src="https://user-images.githubusercontent.com/7910250/46392358-f6551d00-c695-11e8-8ed4-c7aa95044b06.png">

> :construction: We probably want to find better verbiage than "sort". Let's also consider a dropdown menu UX to select different views of the data.

The default view is sorted by files. This is akin to the "Files changed" tab on dotcom. It displays the diff for all changed files in the PR.

Sorting by reviews is akin to the review summaries that appear on the "Conversation" tab on dotcom. The comments are displayed grouped by review along with some context lines.

![sorted by reviews](https://user-images.githubusercontent.com/7910250/46394598-6ebfdc00-c69e-11e8-84eb-39ccbcccf736.png)

> :construction: Show multiple reviews stacked

Sorting by commits is akin to the "Commits" tab on dotcom. A list of commits is displayed in chronological order, oldest commit on top. Clicking a commit expands the diff contents below. If there is a commit message body this is displayed as well. Commit diffs are not editable.

> :construction: Include commit sort mockup

A banner at the bottom of the pane offers navigation to individual files within the diff and to individual review comments, allows each review to be hidden or shown with a filter control, and shows a progress bar that counts "resolved" review comments. The banner remains visible as you scroll the pane.

#### Filter Options

<img width="731" alt="filter options" src="https://user-images.githubusercontent.com/7910250/46392373-03720c00-c696-11e8-9a1b-fe6bc6238769.png">

The default is to show all files, all authors, and unresolved comments.

Filtering based on file type limits the diff view to displaying only that file type.

> :construction: Consider adding a "Find" input field that allows us to filter based on search term (which could be a file name, an author, a variable name, etc).

Clicking an author's avatar displays only their review information.

Clicking "unresolved" shows only resolved comments, helping users stay focused on comments that need to be addressed.

Clicking "resolved" shows only resolved comments. This allows users to quickly see what has already been addressed.

Checking "all comments" shows both resolved and unresolved comments.

Clicking "none" hides all comments, in the event that users want to see diff information only.

#### Submitting a Review

<img width="731" alt="review changes button" src="https://user-images.githubusercontent.com/7910250/46392672-03264080-c697-11e8-8fe4-04605a4d5b13.png">

Clicking the "Review Changes" button reveals a UI much like dotcom's:

<img width="354" alt="review changes panel" src="https://user-images.githubusercontent.com/7910250/46392764-5c8e6f80-c697-11e8-8121-87e659ab8d15.png">

> :construction: Update the Review Changes mockup

* The review summary is a TextEditor that may be used to compose a summary comment.
* Choosing "Cancel" dismisses the review and any comments made. If there are local review comments that will be lost, a confirmation prompt is shown first.
* Choosing "Submit review" submits the drafted review to GitHub.

#### Summary Box

At the top of the pane is the existing summary box:

<img width="600" alt="pull request details pane summary box" src="https://user-images.githubusercontent.com/17565/46370334-57a7cc80-c653-11e8-8272-2eb51c761599.png">

> :construction: Add conversation/timeline icon and progress bar

Clicking on the "22 commits" opens the commit view and changes the bottom panel to indicate sort by commits.

Clicking on the "1 changed files" opens the files view and changes the bottom panel to indicate sort by files and "all files" checked.

Clicking on the build status summary icon (green checkmark, donut chart, or X) expands an ephemeral panel beneath the summary box showing build review status. Clicking the icon again or clicking on "dismiss" dismisses it.

<img width="722" alt="emphemeral checks panel" src="https://user-images.githubusercontent.com/7910250/46391893-fbb16800-c693-11e8-88e7-ffe73448f8a8.png">

Clicking on the conversation/timeline icon expands an ephemeral panel beneath the summary box showing a very timeline view. The PR description and PR comments are displayed here. Other note-worthy timeline events are displayed in a very minimal fashion. At the bottom is an input field to add a new PR comment.

> :construction: Add conversation/timeline popover mockup

Clicking the "expand" icon on the top right opens this information in a new pane to the right for easy side-by-side viewing with the diff (much like our current markdown preview opens in a separate pane).

> :construction: Add conversation/timeline pane item

Clicking on the a commit takes you to the commit view and expands the selected commit, centering it in view.

> :construction: Add commit view mockup

Clicking on a review reference takes you to the review view and expands the selected review, centering it in view.

> :construction: Add review mockup

### In-editor decorations

When opening a TextEditor on a file that has been annotated with review comments on the current pull request, a block decoration is used to show the comment content at the corresponding position within the file content. Also, a gutter decoration is used to reveal lines that are included within the current pull requests' diff and may therefore include comments.

![in-editor review comment decoration](https://user-images.githubusercontent.com/378023/44790482-69bcc800-abda-11e8-8a0f-922c0942b8c6.png)

> :construction: Add gutter decoration?

* The comment's position is calculated from the position acquired by the GitHub API response, modified based on the git diff of that file (following renames) between the owning review's attached commit and the current state of the working copy (including any local modifications). Once created, the associated marker will also track unsaved modifications to the file in real time.
* The up and down arrow buttons navigate to the next and previous review comments within this review within their respective TextEditors.
* The "diff" button navigates to the corresponding pull request's detail item and scrolls to center the same comment within that view.

### Comment decorations

Within the multi-file diff view or a TextEditor, a block decoration is used to show the comment content at the corresponding position within the file content.

* The comment's position is calculated from the position acquired by the GitHub API response, modified based on the git diff of that file (following renames) between the owning review's attached commit and the current state of the working copy (including any local modifications). Once created, the associated marker will also track unsaved modifications to the file in real time.
* The up and down arrow buttons navigate to the next and previous review comments.
* For comment decorations in the `PullRequestDetailItem`, clicking the "code" (`<>`) button opens the corresponding file in a TextEditor and scrolls to the review comment decoration there.
  * If the current pull request is not checked out, the "code" button is disabled, and a tooltip prompts the user to check out the pull request to edit the source.
* For comment decorations within a `TextEditor`, clicking the "diff" button opens the corresponding `PullRequestDetailItem` and scrolls to focus the equivalent comment.
* Reaction emoji may be added to each comment with the "emoji" button. Existing emoji reaction tallies are included beneath each comment.

### Line comment creation

Hovering along the gutter within a pull request diff region in a `TextEditor` or a `PullRequestDetailItem` reveals a `+` icon, which may be clicked to begin a new review:

![plus-icon](https://user-images.githubusercontent.com/378023/40348708-6698b2ea-5ddf-11e8-8eaa-9d95bc483fb1.png)

Clicking the `+` reveals a new comment box, which may be used to submit a single comment or begin a multi-comment review:

![single-review](https://user-images.githubusercontent.com/378023/40351475-78a527c2-5de7-11e8-8006-72d859514ecc.png)

* If a draft review is already in progress, the "Add single comment" button is disabled and the "Start a review" button reads "Add review comment".
* Clicking "Add single comment" submits a non-review diff comment and does not create a draft review. This button is disabled unless the "reply" editor is expanded and has non-whitespace content.
* Clicking "Start a review" creates a draft review and attaches the authored comment to it. This button is disabled unless the "reply" editor is expanded and has non-whitespace content.
* Clicking "mark as resolved" marks the comment as resolved with on GitHub. If the "reply..." editor has non-whitespace content, it is submitted as a final comment first.

## Drawbacks

This adds a substantial amount of complexity to the UI, which is only justified for users that use GitHub pull request reviews.

Rendering pull request comments within TextEditors can be intrusive: if there are many, or if your reviewers are particularly verbose, they could easily crowd out the code that you're trying to write and obscure your context.

## Rationale and alternatives

Our original design looked and felt very dotcom-esque:

![changes-tab](https://user-images.githubusercontent.com/378023/46287431-6e9bdf80-c5bd-11e8-99eb-f3f81ba64e81.png)

We decided to switch to an editor-first approach and build the code review experience around an actual TextEditor item with a custom diff view. We are breaking free of the dotcom paradigm and leveraging the fact that we are in the context of the user's working directory, where we can easily update code.

We discussed displaying review summary information in the GitHub panel in a ["Current pull request tile"](https://github.com/atom/github/blob/2ab74b59873c3b5bccac7ef679795eb483b335cf/docs/rfcs/XXX-pull-request-review.md#current-pull-request-tile). The current design encapsulates all of the PR information and functionality within a `PullRequestDetailItem`. Keeping the GitHub panel free of PR details for a specific PR rids us of the problem of having to keep it updated when the user switches active repos (which can feel jarring). This also avoids confusing the user by showing PR details for different PRs (imagine the checked out PR info in the panel and a pane item with PR info for a separate repo). We also free up space in the GitHub panel, making it less busy/overwhelming and leaving room for other information we might want to provide there in the future (like associated issues, say).

## Unresolved questions

### Questions I expect to address before this is merged

Can we access "draft" reviews from the GitHub API, to unify them between Atom and GitHub?

* _Yes, the `reviews` object includes it in a `PENDING` state._

How do we represent the resolution of a comment thread? Where can we reveal this progress through each review, and of all required reviews?

* _We'll show a progress bar on a sticky header at the top of the `PullRequestDetailItem`._

Are there any design choices we can make to lessen the emotional weight of a "requests changes" review? Peer review has the most value when it discovers issues for the pull request author to address, but accepting criticism is a vulnerable moment.

* _Choosing phrasing and iconography carefully for "recommend changes"._

Similarly, are there any ways we can encourage empathy within the review authoring process? Can we encourage reviewers to make positive comments or demonstrate humility and open-mindedness?

* _Emoji reactions on comments :cake: :tada:_
* _Enable integration with Teletype for smoother jumping to a synchronous review_

### Questions I expect to resolve throughout the implementation process

When there are working directory changes or local commits on the PR branch, how do we clearly indicate them within the diff view? Do we need to make them visually distinct from the PR changes? Things might get confusing for the user when the diff in the editor gets out of sync with the diff on dotcom. For example: a pull request author reads a comment pointing out a typo in an added line. The author edits text within the multi-file diff which modifies the working directory. Should this line now be styled differently to indicate that it has deviated from the original diff?

Review comment positioning within live TextEditors will be a tricky problem to address satisfactorily. What are the edge cases we need to handle there?

* _Review comments on deleted lines._
* _Review comments on deleted files._

The GraphQL API paths we need to interact with all involve multiple levels of pagination: pull requests, pull request reviews, review comments. How do we handle these within Relay? Or do we interact directly with GraphQL requests?

How do we handle comment threads?

When editing diffs:

* Do we edit the underlying buffer or file directly, or do we mark the `PullRequestDetailItem` as "modified" and require a "save" action to persist changes?
* Do we disallow edits of removed lines, or do we re-introduce the removed line as an addition on modification?

### Questions I consider out of scope of this RFC

What other pull request information can we add to the GitHub pane item?

How can we notify users when new information, including reviews, is available, preferably without being intrusive or disruptive?

## Implementation phases

![dependency-graph](https://user-images.githubusercontent.com/17565/46475622-019e6a80-c7b4-11e8-9bf5-8223d5c6631f.png)

## Related features out of scope of this RFC

* "Find" input field for filtering based on search term (which could be a file name, an author, a variable name, etc)
