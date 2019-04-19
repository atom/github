**_Part 1 - Required information_**

# Pull Request Review -- Reviewer Flow

## :memo: Summary

Provide code review to an existing pull request within Atom.

*Note*: This RFC is an iteration of the [original RFC for Pull Request Review](./003-pull-request-review.md).

## :checkered_flag: Motivation

We already have an innovative review-comments-in-dock (RCID) workflow built out for the receiving end of pull request reviews. In order to complete the full experience of code review within Atom, we should also build out a workflow for users to author pull request reviews.

## 🤯 Explanation

### "All Reviews" tab
This tab shows all review summaries and review comments, including the ones that are part of a _pending review_ that has not been submitted yet.

#### Header
- When there is no pending review, button reads "Start a pending review", clicking on which will take you to the Pending Review tab in its empty state.
- When there is already a pending review, the button reads "Resume review (2)". The number indicates the number of comments currently in the pending review. When adding more pending comments _within the All Reviews tab_, there should be some emphasis on the number changing -- akin to the button on dotcom. Clicking on this button takes user to the Pending Review tab.


- rationale for scaling down the "Checkout" button
- caveats of doing so
- mitigation

#### Responding to a comment thread
start a new review button

#### Pending comments

Pending comments within the All Reviews tab are styled differently from the already published comments. Pending comments contain a way to direct user to the Pending Review tab.




### "Pending Review" tab
This tab shows a *subset* of all reviews -- only the summary and comments of a pending review. Since a user is only allowed to have one pending review at a time, there should also only be one active Pending Review tab.

#### Header
The header looks very similar to the one of All Reviews tab, with the exception that the primary button now reads "See all reviews", and will send users back to the All Reviews tab.


#### Summary section

- sticky
- drop down to select review type
- button to submit review

#### Comments section

- empty state




### Reviewer Workflow

**Note**: In the name of clarity, in this RFC we will differentiate between "new comment" and "pending comment":
- a new comment: _after_ a user decides to add a comment from the gutter, and _before_ the user actually adds it to a pending review. (i.e. a pending-pending comment, if you prefer confusion. :laughing:)
- a pending comment: already added to a pending review

#### 1. Start a review

##### From the gutter

within Files tab in `PullRequestDetailView`
within an editor

If user has checked out a PR branch, an "add comment" icon should show up *on hover* over the gutter of an editor of any file. Clicking on the icon will either activate new comment

Nothing if not on a PR branch.

##### By responding to a thread

#### 2. Continue a review



#### 3. Submit a review
- The only way to submit a review within Atom is by using the "Submit review" button in the Pending Review tab
- the button will be disabled if a review type has not been chosen from the dropdown menu
- if there is any new comment that has not been added to the pending review, a warning modal should pop up
- after publishing, the Pending Review tab will be destroyed. User will be led back to the All Reviews tab, which will immediately reflect the just published review.

--------------------

**_Part 2 - Additional information_**

## :anchor: Drawbacks

Why should we *not* do this?

## :thinking: Rationale and alternatives

- Why is this approach the best in the space of possible approaches?
- What other approaches have been considered and what is the rationale for not choosing them?
- What is the impact of not doing this?

## :question: Unresolved questions

- What unresolved questions do you expect to resolve through the Feature Request process before this gets merged?
- What unresolved questions do you expect to resolve through the implementation of this feature before it is released in a new version of the package?

## :warning: Out of Scope

- What related issues do you consider out of scope for this Feature Request that could be addressed in the future independently of the solution that comes out of this Feature Request?

## :construction: Implementation phases

- Can this functionality be introduced in multiple, distinct, self-contained pull requests?
- A specification for when the feature is considered "done."

## :white_check_mark: Feature description for Atom release blog post

- When this feature is shipped, what would we like to say or show in our Atom release blog post (example: http://blog.atom.io/2018/07/31/atom-1-29.html)
- Feel free to drop ideas and gifs here during development
- Once development is complete, write a blurb for the release coordinator to copy/paste into the Atom release blog
