**_Part 1 - Required information_**

# Pull Request Review -- Reviewer Flow

## :memo: Summary

Provide code review to an existing pull request within Atom.

*Note*: This RFC is an iteration of the [original RFC for Pull Request Review](./003-pull-request-review.md).

## :checkered_flag: Motivation

We already have an innovative review-comments-in-dock (RCID) workflow built out for the receiving end of pull request reviews. In order to complete the full code review experience within Atom, we should also build out a workflow for users to author pull request reviews.

## 🤯 Workflow Explanation

This is a high level overview of what the workflow of a PR Review author should look like. More on the functionality and behaviour of each component in the next section.

#### 1. Start a review

There are three ways to start a review:
1. Click "Start a review" button on the header of review dock, or footer of PR detail item, or on the empty state of review dock
2. Respond to an existing review thread by clicking "Start a review"
3. Click on a "add comment" icon on the gutter

#### 2. Continue a review

Once a pending review has been started, user can add more comments to it by:
1. Responding to an existing review thread
2. Clicking "add comment" icon on the gutter

#### 3. Submit a review
- The only way to submit a review within Atom is by using the "Submit review" button in the Pending Review tab.


### "All Reviews" tab
This tab shows all review summaries and review comments, including the ones that are part of a _pending review_ that has not been submitted yet.

#### Header
| current header | proposed header | proposed header with pending review |
|---|---| --- |
|<img width="380" alt="old header" src="https://user-images.githubusercontent.com/6842965/56446925-7f027600-62d3-11e9-8635-e17b946f3b1b.png">|<img width="380" alt="new header" src="https://user-images.githubusercontent.com/6842965/56446924-7f027600-62d3-11e9-98f5-0ea1e2826343.png">|<img width="380" alt="new header" src="https://user-images.githubusercontent.com/6842965/56447078-4911c180-62d4-11e9-8543-4935ba587b38.png">|

- When there is no pending review, button reads "Start a review", clicking on which will take you to the Pending Review tab in its empty state.
- When there is already a pending review, the button reads "Resume review (2)". The number is a counter of comments currently in the pending review. When adding more pending comments _within the All Reviews tab_ (more on that flow below), there should be some emphasis on the counter changing -- akin to the button on dotcom. Clicking on this button takes user to the Pending Review tab.

##### Alternative: footer
An alternative would be to add a footer bar at the bottom and place the add review button there. The caveat is that it might not be as noticeable as the header, and "start a new review" is an arguably more important action than "checkout".

#### Responding to a comment thread
![responding to a comment thread](https://user-images.githubusercontent.com/6842965/56689748-cdd05700-66a9-11e9-90e8-266c69cbc589.png)

User can respond to a comment thread by adding a single line comment (current implementation) or starting a new review. The two buttons should only show up when the comment textbox is in focus, or is _not_ empty.

When there is already an existing pending review, there should only be **one** `btn-primary` button that reads "Comment".

#### Pending comments

![image](https://user-images.githubusercontent.com/6842965/56692893-2ce59a00-66b1-11e9-81cc-bc7956bc8bec.png)

Pending comments within the All Reviews tab are styled differently from the already published comments. Pending comments contain a badge, and when clicked, it will take user to the Pending Review tab.


### "Pending Review" tab
This tab shows *a subset* of all reviews -- only the summary and comments of a pending review. Since a user is only allowed to have one pending review at a time, there should also only be maximum one Pending Review tab.

#### Header
The header looks very similar to the one of All Reviews tab, with the exception that the primary button now reads "See all reviews", and will send users back to the All Reviews tab.


#### Summary section

- sticky
- drop down to select review type
- button to submit review

#### Comments section

- empty state


### New Comment
![image](https://user-images.githubusercontent.com/6842965/56695406-fdd22700-66b6-11e9-9e7e-fe85e2507a66.png)


### "Add comment" gutter icon

A user can start a review or add a comment to an existing pending review by clicking on the "add comment" icon which shows up on hover over the gutter of:

1. MultiFilePatch view within Files tab in `PullRequestDetailView`
2. an editor *if on a checked out PR branch*

The flow of starting a review or adding a comment from the gutter varies a bit depending on the state of reviews:

* If there is no reviews at all
  1. User clicks on "add comment" icon in gutter
  2. *Pending reiview* dock opens in empty state
  3. New comment block is added to the pending review dock


* If there are existing reviews and no pending review
  1. User clicks on "add comment" icon in gutter
  2. *All reviews* dock open
  3. New comment block is added to the all reviews dock
  4. User can choose between "Add a single comment" or "start a review"
  5. a) "add single comment": comment is added to the all reviews dock
     b) "start a review": user is redirected to the pending dock with the newly added pending comment there


* If there is a pending review
  1. User clicks on "add comment" icon in gutter
  2. *Pending reviews* dock open
  3. New comment block is added to the pending review dock


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
- The only way to submit a review within Atom is by using the "Submit review" button in the Pending Review tab.
- The button will be disabled if a review type has not been chosen from the dropdown menu.
- If there is any new comment that has not been added to the pending review, a warning modal should pop up.
- After publishing, the Pending Review tab will be destroyed. User will be led back to the All Reviews tab, which will immediately reflect the just published review.

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
