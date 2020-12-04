# Installation

The GitHub package is bundled as a core package within Atom. This means that you don't have to install it separately - download Atom from [the website](https://atom.io) and it's included automatically. This carries a number of benefits. For example, because it's included in the [v8 snapshot](https://flight-manual.atom.io/behind-atom/sections/how-atom-uses-chromium-snapshots/) produced during each Atom build, it boots extremely quickly and pays very little penalty for things like requiring and bootstrapping React.

However! The downside of this is that it can take a while for new work in this repository to make its way into your editor. Here's the full lifecycle of a change:

1. First, the change is done via a pull request to this repository. When it's ready and has full, passing test coverage, it's merged into the default branch.
2. Periodically, we tag and publish batches of changes as new versions to [apm](https://atom.io/packages/github). Typically, this is done after a major bugfix or new feature is merged, or after merging a security-related dependency update.
3. Next, we send a pull request to [the core atom repository](https://github.com/atom/atom) to bump the versions of the GitHub package dependency in its `package.json` and `package-lock.json` files. When that pull request has a green build, we merge it.
4. The next night that the [Atom core nightly build](https://github.visualstudio.com/Atom/_build?definitionId=1) is successful, the new package version is released to the [Atom nightly channel](https://atom.io/nightly).
5. The core Atom team regularly "rolls the railcars" to tag new release. The first time that this happens after the GitHub package dependency bump is merged, it will be included on the next release of the [Atom beta channel](https://atom.io/beta).
6. The next time that the core Atom team "rolls the railcars" after that, the new GitHub package version is shipped to [Atom stable](https://atom.io/). :rocket: :tada:

Depending on the timing, all of this can take a month and a half to two months, so when you see a pull request get merged and your issue closed, you might think you're out of luck and you'll just have to wait... but, you have a few other options here.

## Use a non-stable Atom channel

Instead of living at the end of the line way out on stable, you could switch to the beta or nightly channels of Atom releases.

* The [beta channel](https://atom.io/beta) updates a little more frequently than the stable channel, but it's about a month ahead. This means that you'll have access to GitHub package work as soon as the next time the railcars are rolled (step 5 up above) - about a month sooner than you would if you stayed on stable.
* The [nightly channel](https://atom.io/nightly) is updated about daily with the latest and greatest Atom build, including everything that was merged into Atom core up to that point. If you use the nightly channel, you'll have access to GitHub package work as soon as it's published in a release and merged into Atom core (step 4 up above).

### Benefits

By using a "fresher" Atom channel, you'll have access to features and bug-fixes much sooner than you will if you use a stable build. Despite the names, our beta and nightly channels are pretty stable... I've (@smashwilson) personally been using a nightly build for my day to day editing for years now.

What's more, if you _do_ experience a serious regression - with the GitHub package or any other core behavior - you can:

* File an issue to let us know, then:
* Switch to the next channel (from nightly to beta, or beta to stable).

That gives us a chance to respond to the issue, determine if it's serious enough to warrant delaying a release for if we can't fix it in time, and could prevent an order of magnitude more users from encountering the same problem... _and_ gives you a route to _immediately_ revert to an Atom version that unblocks you!

## Live on the edge

If you're using nightly builds, you can have access to fixes and improvements (often) within a few weeks to a month. But, it can take me some time to tag releases and get them into Atom core sometimes. If you're really can't wait, and you want to live on the very, very edge, you can run the absolute latest code as soon as it's merged.

1. First, install Atom's build requirements. You don't have to clone, bootstrap and build all of Atom to do this - just install the packages and dependencies listed in the "Building" section on [the flight manual documentation](https://flight-manual.atom.io/hacking-atom/sections/hacking-on-atom-core/) for your operating system.
2. Second, run the following command at your terminal or command line prompt:
   ```
   apm install atom/github
   ```

Now you'll be running everything as soon as it's merged... and `apm` will automatically keep it that way, as we merge more work!

:warning: Be aware! Using this method _will_ have noticeably degrade Atom's startup time. It's especially impactful the first time you launch Atom after each update, because Atom will be transpiling all of the package source. After that, you'll essentially be missing out on the benefits of having it included in the v8 snapshot.
