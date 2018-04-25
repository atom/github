# Interactive Log View

## Status

Proposed

## Summary

Open a pane item displaying a navigable, live 3D model of your git commit graph.

## Motivation

Visualizing the commit graph is an important tool for learning git. A live view of the commit graph can inobtrusively help git newcomers form the correct mental model for commit graph operations (branching, merging, rebasing).

We do not currently have a way to initiate merge, rebase, or cherry-pick operations from the editor. A log view would be the most logical place to do so, because it's where you have the most context about the existing relationship of the refs you'd like to merge or rebase.

A log view would grant us a way to answer the question of where you are relative to nearby refs and tags.

Why 3D? Flat visualizations of git history quickly fall victim to the "guitar hero problem":

[![Git guitar hero](https://user-images.githubusercontent.com/17565/39223169-6f5d6b1e-480e-11e8-809b-60d1dc8261fb.png)](https://twitter.com/henryhoffman/status/694184106440200192)

I'm hopeful that the extra "space" afforded by rendering in WebGL and level-of-detail fading can give us a view that remains functional even in the face of dramatic tangles.

## Explanation

The log view is a pane item launched by:

* The `github:log` command in the command palette.
* An "Open Log" menu item in the context menu on the recent commit history.

When launched, the log view pane uses WebGL to render a 3D model of your commit graph.

* Each commit is rendered as a sphere, possibly with adjacent text (see below).
* A line joins each commit to its parent.
* Refs are rendered as rectangular tags attached to the relevant commits.
* When a remote is present, commits that are not reachable from any remote ref are rendered _[TODO]_. Commits that have been fetched but are not reachable from any local ref are rendered _[TODO]_.

### Level of detail

Commit information quickly becomes visually overwhelming, even in relatively small repositories. To remain useful as repositories grow in size and complexity, we can employ varying _level of detail_ for commits.

The _focused commit_ is the one currently at the center of the field of view. It is annotated with author avatars, a timestamp, and a commit message header. Zero to many _selected commits_ have been chosen by a hotkey to participate in a pending action, so they too have the highest level of detail.

Commits adjacent to the focused one on the same branch (reachable by only a single entry in `refs/heads`, up to a maximum) are "nearby" and rendered with the next highest level of detail. Each has a timestamp and a commit message header in text next to the commit node.

### Layout algorithm

_[TODO]_

### Searching and filtering

### Navigation

### Merge, rebase, cherry-pick

## Drawbacks

## Rationale and alternatives

## Unresolved questions

## Implementation phases
