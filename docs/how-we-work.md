# How we work

:sparkles: _Fabulously_ :sparkles:

This is an attempt to make explicit the way that the core team plans, designs, and works day to day on the GitHub package. Our goal is to reduce ambiguity and uncertainty and improve communication, while avoiding artificial confinement and ceremony for ceremony's sake.

Process should serve the developers who use it and not the other way around. This is a live document! As our needs change and as we find that something here isn't bringing us the value we want, we should send pull requests to change it.

## Planning

Our short-term planning is done in a series of [Project boards on this repository](https://github.com/atom/github/projects). Each project board is associated with a three-week period of time and a target version of the package. Our goal is to release a minor version of the package to atom/atom corresponding to the "Merged" column of its project board - in other words, it is less important to us to have an accurate Planned column before the sprint begins than it is to have an accurate Merged column after it's complete.

## Kinds of change

One size does not fit all, and accordingly, we do not prescribe the same amount of rigor for every pull request. These options lay out a spectrum of approaches to be followed for changes of increasing complexity and scope. Not everything will fall neatly into one of these categories; we trust each other's judgement in choosing which is appropriate for any given effort. When in doubt, ask and we can decide together.

### Minor or cosmetic

This includes work like typos in comments or documentation, localized work, or rote mechanical changes.

##### Examples

* Changing or upgrading dependencies.
* Renaming components.
* Minor refactoring that only touches a file or two.

##### Process

1. Isolate work on a feature branch in the `atom/github` repository and open a pull request. Title-only pull requests are fine. If it's _really_ minor, like a one-line diff, committing directly to `master` is also perfectly acceptable.
2. Ensure that our CI remains green across platforms.
3. Merge your own pull request; no code review necessary.

### Bug fixes

Addressing unhandled exceptions, lock-ups, or correcting other unintended behavior in established functionality follows this process. For bug fixes that have UX, substantial UI, or package scope implications or tradeoffs, consider following [the new feature RFC process](#new-features) instead, to ensure we have a chance to collect design and community feedback before we proceed with a fix.

##### Process

1. Open an issue on `atom/github` describing the bug if there isn't one already.
2. Identify the root cause of the bug and leave a description of it as an issue comment. If necessary, modify the issue body and title to clarify the bug as you go.
3. When you're ready to begin writing the fix, assign the issue to yourself and move it to the "in progress" column on the [short-term roadmap project](https://github.com/atom/github/projects/8). :rainbow: _This signals to the team and to the community that it's actively being addressed, and keeps us from colliding._
4. Work on a feature branch in the `atom/github` repository and open a pull request.
5. Write a failing test case that demonstrates the bug (or a rationale for why it isn't worth it -- but bias toward writing one).
6. Iteratively make whatever changes are necessary to make the test suite pass on that branch.
7. Merge your own pull request and close the issue.
8. _Depending on the severity of the bug:_ consider releasing a new version of the GitHub package and hot-fixing beta or stable with the fix. See ["How we ship"](#how-we-ship) for our criteria for each.

### Re-architecting

Major, cross-cutting refactoring efforts fit within this category. Our goals with work like this are to address technical debt, to improve our ability to comprehend the codebase, to ease the burdens of new contributors, and to make other planned features and bug fixes simpler to enact in the future.

##### Examples

* Porting the package from Etch to React.
* Introducing additional diagnostics or metrics.
* Restructuring an entire component tree.

##### Process

1. Propose these changes first in a conversation in Slack, a stand-up, or another synchronous channel. The decisions to be made here are:
    * Does this change make sense to people other than me?
    * Will this impact other work in flight?
2. Capture the context of the change in an issue, which can then be prioritized accordingly within our normal channels.
    * Should we stop or delay existing work in favor of a refactoring?
    * Should we leave it as-is until we complete other work that's more impactful?
3. When you're ready to begin refactoring, assign the issue to yourself and move it to "in progress" column on the [short-term roadmap project](https://github.com/atom/github/projects/8).
4. Work in a feature branch in the `atom/github` repository and open a pull request to track your progress.
5. Iteratively change code and tests until the change is complete and CI builds are green.
6. Merge your own pull request and close the issue.

### New features

To introduce brand-new functionality into the package, follow this guide.

##### Process

1. On a feature branch, write a proposal as a markdown document beneath [`docs/rfcs`](/docs/rfcs) in this repository. Copy the [template](/docs/rfcs/000-template.md) to begin. Open a pull request. The RFC document should include:
   * A description of the feature, written as though it already exists;
   * An analysis of the risks and drawbacks;
   * A specification of when the feature will be considered "done";
   * Unresolved questions or possible follow-on work;
   * A sequence of discrete phases that can be used to realize the full feature;
   * The acceptance criteria for the RFC itself, as chosen by your current understanding of its scope and impact. Some options you may use here include _(a)_ you're satisfied with its state; _(b)_ the pull request has collected a predetermined number of :+1: votes from core team members; or _(c)_ unanimous :+1: votes from the full core team.
2. @-mention @simurai on the open pull request for design input. Begin hashing out mock-ups, look and feel, specific user interaction details, and decide on a high-level direction for the feature.
3. The RFC's author is responsible for recognizing when its acceptance criteria have been met and merging its pull request. :rainbow: _Our intent here is to give the feature's advocate the ability to cut [bikeshedding](https://en.wiktionary.org/wiki/bikeshedding) short and accept responsibility for guiding it forward._
4. Work on the RFC's implementation is performed in one or more pull requests.
   * Consider gating your work behind a feature flag or a configuration option.
   * Write tests for your new work.
   * Optionally [request reviewers](#how-we-review) if you want feedback. Ping @simurai for ongoing UI/UX considerations if appropriate.
   * Merge your pull request yourself when CI is green and any reviewers you have requested have approved the PR.
   * As the design evolves and opinions change, modify the existing RFC to stay accurate.
5. When the feature is complete, update the RFC to a "completed" state.

### Expansions or retractions of package scope

As a team, we maintain a [shared understanding](/docs/vision) of what we will and will not build as part of this package, which we use to guide our decisions about accepting new features. Like everything else, this understanding is itself fluid.

##### Process

1. Open a pull request that modifies a `docs/vision/*.md` file in this repository. Mention @atom/github-package for discussion.
2. When the full core team have left :+1: votes on the pull request, merge it.

## How we review

Code review is useful to validate the decisions you've made in the course of performing some work and to disseminate knowledge about ongoing changes across the team. We do **not** require review of all changes; instead, we prefer to allow each team member to use their own discretion about when a review would feel useful, considering the time and context switching it involves.

Review comments are stream-of-consciousness style. Not every comment needs to be addressed before merge - they can include discussions of alternatives, possible refactorings or follow-on work, and things that you like. As a reviewer, err on the side of providing more information and making your expectations for each comment explicit. Remember that while egoless code is the ideal, we are human and should be mindful of one another in our writing.

If you believe an issue _should_ be addressed before merge, mark that comment with a :rotating_light:.

When finalizing your review:

* "Approve" means "click merge whenever you're ready, I'm okay with this shipping exactly as I see it here if you are."
* "Comment" means "I've noted things that you may want to consider doing differently. Feel free to merge if you disagree, but further conversation might be useful to bring me on board."
* "Request changes" means "I believe that merging this right now would break something. Dismiss my review once you've addressed the urgent issues that I've identified."

## How we ship

The github package ships as a bundled part of Atom, which affects the way that our progress is delivered to users. After using `apm` to publish a new version, we also need to add a commit to [Atom's `package.json` file](https://github.com/atom/atom/blob/master/package.json#L114) to make our work available.

When the team is preparing to ship a new version of Atom, run `apm publish minor` and update `package.json` on Atom's master branch to reference the new version. This will ship our work to Atom's [beta channel](https://atom.io/beta) and allow a smaller subset of our users to discover regressions before we release it to the full Atom user population.

When you update Atom's `package.json`, make sure you wait for Atom to build before you merge your changes. In particular, we've had issues with snapshot tests. You can either do `apm publish pre` on the branch with the fix, then modify `package.json` in your local atom and try a `script/build`.  Or you can open a pull requests and let the CI tests run for you.

When you've merged substantial new functionality, consider running `apm publish minor` and updating `package.json` on Atom's master branch outside of the Atom release cycle, to give the rest of the Atom team time to dogfood the change internally and weigh in with opinions.

After shipping a minor version release for either of the above situations, create and push a release branch from that version's tag:

```sh
$ apm publish minor
version 0.11.0
$ git branch 0.11-releases && git push -u origin 0.11-releases
```

When you merge a fix for a bug, cherry-pick the merge commit onto to the most recent release branch, then run `apm publish patch` and update `package.json` on the most recent beta release branch on the `atom/atom` repository. This will ensure bug fixes are delivered to users on Atom's stable channel as part of the next release.

When you merge a fix for a **security problem**, a **data loss bug**, or fix a **crash** or a **lock-up** that affect a large portion of the user population, cherry-pick the merge commit onto the most recent beta _and_ stable release branches of atom/github that contain the bug, then run `apm publish patch` on both and update `package.json` on the affected release branches on the `atom/atom` repository. Consider advocating for a hotfix release of Atom to deliver these fixes to the user population as soon as possible.
