# Editable Diff

## :memo: Summary

Inline editing within a diff view.

## :checkered_flag: Motivation

- is a part of the bigger PR review workflow we want to implement
- saves user the trouble of needing to toggle to an editor and back again when you notice typos, console.log() statements, or .only() tests when reviewing unstaged changes.

## 🤯 Explanation

- what is editable?
    - staged/unstaged?
    - deleted lines?
    - *should be only unstaged diff and only on added lines*
- how do we indicate which diff is editable?
    - VS code uses tooltip upon user trying to type something (but typing cursor thing still shows)
- at what point do we write the changes to disk?
- how much of the diff should be editable at a time?
    - one hunk at a time


## :anchor: Drawbacks

- the diff tool in Atom is a fundamental and also old component of the package, so changing the behaviour and UI of such carries a relatively higher risk.
- no prior art to editable diffs in unified diff view (as opposed to split view discussed below.)

## :thinking: Rationale and alternatives

All of the prior arts I could find on editable diffs implement this feature with the use of "split screen diff".

This is a gif of how it works in VS code, but other diff and/or merge tools have similar implementations:
 - split screen with one side editable (the copy on disk) and the other side readonly
 - both sides show unmodified lines
 - readonly side shows deleted lines
 - editable side shows added/modified lines
 - use grey blocks to reconcile the line differences between the two sides so they line up properly

##### Pros:
 -

##### Cons:


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
