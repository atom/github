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

1. Isolate work on a feature branch in the `atom/github` repository and open a pull request. Remember to add the pull request to the current sprint board. Title-only pull requests are fine. If it's _really_ minor, like a one-line diff, committing directly to `master` is also perfectly acceptable.
2. Ensure that our CI remains green across platforms.
3. Merge your own pull request; no code review necessary.

### Bug fixes

Addressing unhandled exceptions, lock-ups, or correcting other unintended behavior in established functionality follows this process. For bug fixes that have UX, substantial UI, or package scope implications or tradeoffs, consider following [the new feature RFC process](#new-features) instead, to ensure we have a chance to collect design and community feedback before we proceed with a fix.

##### Process

1. Open an issue on `atom/github` describing the bug if there isn't one already.
2. Identify the root cause of the bug and leave a description of it as an issue comment. If necessary, modify the issue body and title to clarify the bug as you go.
3. When you're ready to begin writing the fix, assign the issue to yourself and move it to the "in progress" column on the current active sprint project. :rainbow: _This signals to the team and to the community that it's actively being addressed, and keeps us from colliding._
4. Work on a feature branch in the `atom/github` repository and open a pull request. Remember to add the pull request to the current sprint project.
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
3. When you're ready to begin refactoring, assign the issue to yourself and move it to "in progress" column on the current sprint project.
4. Work in a feature branch in the `atom/github` repository and open a pull request to track your progress. Remember to add the pull request to the current sprint project board.
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
4. Work on the RFC's implementation is performed in one or more pull requests. Remember to add each pull request to the current sprint project.
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

At the end of each development sprint:

1. _In your atom/github repository:_ run `apm publish preminor` to create the first prerelease version or `apm publish prerelease` to increment an existing prerelease version. Note the generated version number and ensure that it's correct. If the currently deployed version is `v0.19.2`, the first prerelease should be `v0.20.0-0`; if the existing prerelease is `v0.20.0-0`, the next prerelease should be `v0.20.0-1`.
2. _In your atom/atom repository:_ create a new branch and edit `package.json` in its root directory. Change the version of the `"github"` entry beneath `packageDependencies` to match the prerelease you just published.
3. _In your atom/atom repository:_ Run `script/build --install`. This will update Atom's `package-lock.json` files and produce a local development build of Atom with your prerelease version of atom/github bundled.
  * :boom: _If the build fails,_ correct any bugs and begin again at (1) with a new prerelease version.
4. Run `apm uninstall github` and `apm uninstall --dev github` to ensure that you don't have any [locally installed atom/github versions](/CONTRIBUTING.md#living-on-the-edge) that would override the bundled one.
5. _In your atom/atom repository:_ Push your branch to atom/atom and open a pull request to start running CI.
6. Create a [QA issue](https://github.com/atom/github/issues?utf8=%E2%9C%93&q=is%3Aissue+label%3Aquality) in the atom/github repository. Its title should be "_prerelease version_ QA Review" and it should have the "quality" label applied. Populate the issue body with a checklist containing the pull requests that were included in this release; these should be the ones in the "Merged" column of the project board. Omit pull requests that don't have verification steps (like renames, refactoring, or dependency upgrades, for example). Add a final entry for a clean CI check on the atom/atom pull request.
7. Use your `atom-dev` build to verify each and check it off the list.
  * :boom: _If verification fails,_ note the failure in an issue comment. Close the issue. Correct the failure with more work in the current sprint board, then begin again at (1).
  * :white_check_mark: _Otherwise,_ comment in and close the issue, then continue.
8. _In your atom/github repository:_ run `apm publish minor` to publish the next minor version.
9. _In your atom/github repository:_ create a release branch for this minor version with `git checkout -b 0.${MINOR}-releases`. Push it to atom/github.
9. _In your atom/atom repository:_ update the version of the `"github"` entry beneath `packageDependencies` in `package.json`  to match the published minor version. Run `script/build` to update `package-lock.json` files. Commit and push these changes.
10. When the CI build for your atom/atom pull request is successful, merge it.

Now cherry-pick any suitably minor or low-risk bugfix PRs from this release to the previous one:

1. _In your atom/github repository:_ run `git checkout 0.${LASTMINOR}-releases`. For example, if the current release is v0.19.0, the target release branch should be `0.18-releases`.
2. _In your atom/github repository:_ identify the merge SHA of each pull request eligible for backporting. One way to do this is to run `git log --oneline --first-parent master ^HEAD` and identify commits by the "Merge pull request #..." commit messages.
3. _In your atom/github repository:_ cherry-pick each merge commit onto the release branch with `git cherry-pick -m 1 ${SHA}`. Resolve any merge conflicts that arise.
4. Follow the instructions above to publish a new patch version of the package. (Use `apm publish prepatch` / `apm publish prerelease` to generate the correct version numbers.)

For _really_ urgent fixes, like security problems, data loss bugs, or frequently occurring crashes or lock-ups, consider repeating the cherry-pick instructions for the minor version sequence published on Atom stable, and advocating for an Atom hotfix to deliver it as soon as possible.
