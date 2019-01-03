# Editable Diff

## :memo: Summary

Inline editing within a diff view (i.e. `MultiFilePatchView`).

## :checkered_flag: Motivation

This can save user the trouble of needing to toggle to an editor and back again when they notice typos, `console.log()` statements, or `.only()` in tests when reviewing changes right before committing.

This also serves as a building block of the bigger PR review workflow we want to eventually implement.

## 🤯 Explanation

The flow of using editable diff is as followed:

#### 1. Entry point of editable state
On any given diff view, a user can get a diff hunk into an __editable state__ by:
1. double-clicking on any line within a hunk
2. clicking on a new "edit hunk" button on hunk header
3. if the hunk is selected, pressing specific keys (exact key binding TBD)
4. "edit" from context menu

#### 2. Within an editable state
- Only one hunk is editable at a time
- Visually, it should be very clear when a hunk is in editable state. Maybe put the whole block in a box? :thinking:
- The editable state behaves almost like it's a normal editor, except that the green background of added lines and red background of deleted lines will be kept.
- A deleted line will still be visible within the editable state, but it __should not be editable__. That should be communicated to user in a very clear visual manner. When navigating with keyboard, deleted lines should be skipped as if they don't exist.

#### 3. Exiting editable state:
A user can exit the editable state by:
  - clicking outside of the editable area
  - pressing `esc` or `cmd-s`
  - performing actions such as stage/unstage, jump to file, etc.

Upon exiting editable state, the changes should be immediately written to the corresponding file on disk. And the diff view would re-render with the new file patch, and scroll position should remain unchanged.

#### What is editable?

Currently we use diff view in several places; which ones of them are editable?
  - Unstaged Changes: *editable*
  - Staged Changes: *editable* but with unresolved questions
  - All staged changes (aka Commit Preview): *editable* but with unresolved questions
  - Commit Detail Item: *NOT editable*
  - Changed File Tab in PR: *editable **only** if it's a checked out PR*, also with unresolved questions


## :anchor: Drawbacks

The diff tool in Atom is a fundamental component of the github package, so changing the behaviour and UI of such carries a relatively higher risk.

In my research, I have found no prior art of editable diffs in *unified diff view*; in contrast, there are abundant examples of editable diffs in *split diff view* (see section below). And I think there's a reason this hasn't been done before -- making unified diff view editable could make the UI jarring and unapproachable. Some specific examples:

- editing a previously unchanged line will result in the new file patch being longer, since we now have an newly "deleted" line.

- editing end of a hunk might result in two hunks being joint into one (and vice versa where a hunk might get split into two).

**The biggest UX challenge here is to elegantly transition from old file patch -> editable state -> new file patch.**


## :thinking: Rationale and alternatives

All of the prior arts I could find on editable diffs implement this feature with the use of "split screen diff".

This is a gif of how it works in VS code, but other diff and/or merge tools have similar implementations:
 - split screen with one side editable (the file on disk) and the other side readonly
 - both sides show unmodified lines
 - readonly side shows deleted lines
 - editable side shows added/modified lines
 - use grey/void blocks to reconcile the line differences between the two sides so they line up properly

##### Pros:
 - it's easy to understand that one side is editable, and the other is not.
 - adding and deleting lines are not jarring
 - able to avoid the hunk separating/joining issue (mentioned above in Drawbacks section)

##### Cons:
 - soft-wrap mostly doesn't work well with this view
 - split view takes up a lot of screen real estate

##### Rationale for not going this route:
Despite the editable split diff view being the more conventional and relatively easier approach, it diverges way too much from our existing unified diff view,  and hence would not be a good direction for us.

## :question: Unresolved questions

- Currently, if a user make changed to a staged file, the new changes show up in Unstaged Changes, but are not applied to the already staged file. If we allow staged file to be edited, should the new changes apply to both file on disk as well as the staged entry?

- The PR comments we are implementing in #1856 already add consierable complexity to the diff view. Should the comments be visible when the diff is in editable state?

## :warning: Out of Scope

#### TBD

- What related issues do you consider out of scope for this Feature Request that could be addressed in the future independently of the solution that comes out of this Feature Request?

## :construction: Implementation phases

#### TBD

- Can this functionality be introduced in multiple, distinct, self-contained pull requests?
- A specification for when the feature is considered "done."

## :white_check_mark: Feature description for Atom release blog post

#### TBD

- When this feature is shipped, what would we like to say or show in our Atom release blog post (example: http://blog.atom.io/2018/07/31/atom-1-29.html)
- Feel free to drop ideas and gifs here during development
- Once development is complete, write a blurb for the release coordinator to copy/paste into the Atom release blog
