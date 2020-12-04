# Troubleshooting guide

So, you're having a problem with this package, and you're not sure what's going on. Here are a few tools that you can use to collect more information on your problem to help us help you faster.

The more debugging information you can provide, the easier it will be for us to figure out what's going on, even if your problem is triggered by some configuration or local state on your machine... and the more likely it will be that we'll be able to help you out.

## Atom debugging guide

Be sure to look over the [Atom debugging guide](https://flight-manual.atom.io/hacking-atom/sections/debugging/), as everything written there also applies here.

Take special note of the [section on the developer tools](https://flight-manual.atom.io/hacking-atom/sections/debugging/#check-for-errors-in-the-developer-tools). Any time that the package "crashes" (git and GitHub status bar buttons vanish, tabs go blank, commands are no longer present in the command palette) there's almost certainly a stack trace waiting for you in the developer tools. Copy and paste that into your issue within a triple-backtick code block and it will give us worlds more information about what's going on. For many problems, having a stack trace to work with almost single-handedly makes the difference between us not being able to do anything and us being able to land a fix.

## Git diagnostics

If your problem is related to specific git operations or interactions - like problems committing, pushing, or fetching - then it can be very helpful to collect git command diagnostics.

To enable git diagnostic collection:

* Open your [Settings tab](https://flight-manual.atom.io/getting-started/sections/atom-basics/#settings-and-preferences).
* Navigate to the "Packages" section on the lefthand side.
* Search for "github" in the search box.
* Click "settings" on the "github" package result.
* Check the checkbox labelled "Git diagnostics".

Now, reproduce your problem. Every git command that's executed by this package will be logged to the developer console, including input, stdout and stderr, and exit codes, with full verbose tracing. Expand the collapsed sections corresponding to the relevant commands and copy-and-paste the results in your issue.

:warning: While the git logging will elide things like passphrases for you, you may wish to manually remove references to usernames, paths, or repository URLs if you wish, for privacy reasons.
