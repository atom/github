# GitHub package states

This is meant to be a guide for human QA, writing automated tests, and specifying expected behavior. This list is a work in progress and not all of it is covered by the implementation as of the time of this writing.

## Sign in

- Sign in via command palette
- Sign in by clicking status bar
- Sign in when network is not working

## Sign out

- sign out via command palette

## Repo features (PR link, build status)

- When a git repo doesn't have a github remote
  - nothing is shown in the status bar
- When a project folder isn't a git repository
  - nothing is shown in the status bar
- when there are multiple project folders and we switch between files
  - the status bar updates correctly
    - when both files have valid remotes
      - when both files are checked out to PRs
      - when only one file is checked out to a current PR
      - when both files have build statuses
      - when only one file has a build status
    - when only one file has a valid remote
      - when there's a PR
      - when there isn't a PR
      - when there is a status
      - when there isn't a status
- PR Link
  - refreshes on git push
  - refreshes when switching branches
- Build Status
  - refreshes on tab switch
  - refreshes within a reasonable time after the build going green on .com
