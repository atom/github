# React Component Atlas

This is a high-level overview of the structure of the React component tree that this package creates. It's intended _not_ to be comprehensive, but to give you an idea of where to find specific bits of functionality.

> [`<RootController>`](/lib/controllers/root-controller.js)
>
> > [`<GitTabItem>`](/lib/items/git-tab-item.js)
> > [`<GitTabContainer>`](/lib/containers/git-tab-container.js)
> > [`<GitTabController>`](/lib/controllers/git-tab-controller.js)
> > [`<GitTabView>`](/lib/views/git-tab-view.js)
> >
> > > [`<StagingView>`](/lib/views/staging-view.js)
> > >
> >
> > > [`<CommitController>`](/lib/controllers/commit-controller.js)
> > > [`<CommitView>`](/lib/views/commit-view.js)
> >
> > > [`<RecentCommitsController>`](/lib/controllers/recent-commits-controller.js)
> > > [`<RecentCommitsView>` `<RecentCommitView>`](/lib/views/recent-commits-view.js)
> > >
>
> > [`<GitHubTabItem>`](/lib/items/github-tab-item.js)
> > [`<GitHubTabContainer>`](/lib/containers/github-tab-container.js)
> > [`<GitHubTabController>`](/lib/controllers/github-tab-controller.js)
> > [`<GitHubTabView>`](/lib/views/github-tab-view.js)
> >
> > > [`<RemoteSelectorView>`](/lib/views/remote-selector-view.js)
> > >
> >
> > > [`<RemoteContainer>`](/lib/containers/remote-container.js)
> > > [`<RemoteController>`](/lib/controllers/remote-controller.js)
> > >
> > > > [`<IssueishSearchesController>`](/lib/controllers/issueish-searches-controller.js)
> > > >
> > > > > [`<CurrentPullRequestContainer>`](/lib/containers/current-pull-request-container.js)
> > > > >
> > > > > > [`<CreatePullRequestTile>`](/lib/views/create-pull-request-tile.js)
> > > > > >
> > > > >
> > > > > > [`<IssueishListController>`](/lib/controllers/issueish-list-controller.js)
> > > > > > [`<IssueishListView>`](/lib/views/issueish-list-view.js)
> > > > > >
> > > >
> > > > > [`<IssueishSearchContainer>`](/lib/containers/issueish-search-container.js)
> > > > >
> > > > > > [`<IssueishListController>`](/lib/controllers/issueish-list-controller.js)
> > > > > > [`<IssueishListView>`](/lib/views/issueish-list-view.js)
> > > > > >
>
> > [`<FilePatchController>`](/lib/controllers/file-patch-controller.js)
> > [`<FilePatchView>`](/lib/views/file-patch-view.js)
> >
> > :construction: Being rewritten in [#1712](https://github.com/atom/github/pull/1512) :construction:
>
> > [`<IssueishDetailItem>`](/lib/items/issueish-detail-item.js)
> > [`<IssueishDetailContainer>`](/lib/containers/issueish-detail-container.js)
> > [`<IssueishDetailController>`](/lib/controllers/issueish-detail-controller.js)
> > [`<IssueishDetailView>`](/lib/controllers/issueish-detail-controller.js)
> >
> > > [`<IssueTimelineController>`](/lib/controllers/issue-timeline-controller.js)
> > > [`<IssueishTimelineView>`](/lib/views/issueish-timeline-view.js)
> >
> > > [`<PrTimelineController>`](/lib/controllers/pr-timeline-controller.js)
> > > [`<IssueishTimelineView>`](/lib/views/issueish-timeline-view.js)
> > >
> >
> > > [`<PrStatusesView>`](/lib/views/pr-statuses-view.js)
> > >
> >
> > > [`<PrCommitsView>`](/lib/views/pr-commits-view.js)
> > > [`<PrCommitView>`](/lib/views/pr-commit-view.js)
>
> > [`<InitDialog>`](/lib/views/init-dialog.js)
> > [`<CloneDialog>`](/lib/views/clone-dialog.js)
> > [`<OpenIssueishDialog>`](/lib/views/open-issueish-dialog.js)
> > [`<CredentialDialog>`](/lib/views/credential-dialog.js)
> >
>
> > [`<RepositoryConflictController>`](/lib/controllers/repository-conflict-controller.js)
> >
> > > [`<EditorConflictController>`](/lib/controllers/editor-conflict-controller.js)
> > >
> > > > [`<ConflictController>`](/lib/controllers/conflict-controller.js)
> > > >
>
> > [`<StatusBarTileController>`](/lib/controllers/status-bar-tile-controller.js)
> >
> > > [`<BranchView>`](/lib/views/branch-view.js)
> > >
> >
> > > [`<BranchMenuView>`](/lib/views/branch-menu-view.js)
> > >
> >
> > > [`<PushPullView>`](/lib/views/push-pull-view.js)
> > >
> >
> > > [`<ChangedFilesCountView>`](/lib/views/changed-files-count-view.js)
> > >
> >
> > > [`<GithubTileView>`](/lib/views/changed-files-count-view.js)
> > >
> >
> >
> >
