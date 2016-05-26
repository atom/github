'use babel'
/** @jsx etch.dom */

import classnames from 'classnames'
import etch from 'etch'
import shell from 'shell'
import stateless from 'etch-stateless'

import {CompositeDisposable} from 'atom'
import GitHubModalRepoAccessComponent from './github-modal-repo-access-component'

import GitHubStatusBarModel from '../github-status-bar-model'
import Icon from './icon'

const SignInAnchor = stateless(etch, ({onclick}) => {
  return (
    <a onclick={onclick} href='#' className='inline-block github-sign-in toggled-link'>
      <Icon icon='mark-github' /> Sign in
    </a>
  )
})

const SignInSuccessAnchor = stateless(etch, ({onclick}) => {
  return (
    <a onclick={onclick} href='#' className='inline-block github-sign-in is-success'>
      <Icon icon='check' /> Signed in
    </a>
  )
})

const NewPRAnchor = stateless(etch, ({onclick, href, content}) => {
  return (
    <a className='inline-block toggled-link icon github-new-pr icon-git-pull-request' onclick={onclick} href={href}>
      {content}
    </a>
  )
})

const PRAnchor = stateless(etch, ({onclick, pr, pushing, buildStatus}) => {
  let classes = classnames('inline-block toggled-link icon github-new-pr icon-git-pull-request', {
    'is-progress': pushing
  })

  if (pushing) {
    return (
      <a className={classes} onclick={(evt) => evt.preventDefault()} href='#'>
        <span className='inline-block loading loading-spinner-tiny' /> Pushing...
      </a>
    )
  } else if (pr && buildStatus) {
    return (
      <span>
        <a className={classes} onclick={onclick} href={pr.html_url}>
          #{pr.number}
        </a>
        <BuildStatusIcon status={buildStatus} />
      </span>
    )
  } else if (pr) {
    return (
      <span>
        <a className={classes} onclick={onclick} href={pr.html_url}>
          #{pr.number}
        </a>
      </span>
    )
  } else {
    throw new Error('Error: rendering PrAnchor with no PR')
  }
})

const NoRepoAccessAnchor = stateless(etch, ({onclick}) => {
  return (
    <a className='icon no-repo-access-message icon-mark-github' href='#' onclick={onclick}> Can't access repo!</a>
  )
})

const BuildStatusIcon = stateless(etch, ({status}) => {
  let icon = ''
  if (status === 'success') {
    icon = 'check'
  } else if (status === 'pending') {
    icon = 'primitive-dot'
  } else if (status === 'failure') {
    icon = 'x'
  } else {
    throw new Error(`Unexpected build status ${status}.`)
  }

  return <span className={`inline-block github-commit-status icon icon-${icon}`} />
})

export default class GitHubStatusBarComponent {
  constructor ({gitHubModel, auth}) {
    this.subscriptions = new CompositeDisposable()

    this.model = new GitHubStatusBarModel().initialize(gitHubModel)
    this.auth = auth
    this.subscriptions.add(this.model.onShouldUpdateComponent(() => this.update()))

    this.model.setInitialState() // This will trigger the above callbacks
    etch.initialize(this)
  }

  render () {
    const renderByState = {
      NO_REPO_ACCESS: this.renderNoRepoAccess,
      PUSHING: function () {}, // This needs to be reworked to use the git package's push function, so I'm leaving it as a todo in this refactor for now.
      PR: this.renderWithPR,
      NO_PR: this.renderWithoutPR,
      SIGNED_OUT: this.renderSignedOut,
      SIGN_IN_SUCCESS: this.renderSignInSuccess
    }

    return (
      <span className='github-status-bar-component inline-block'>
        {renderByState[this.model.renderState].call(this)}
      </span>
    )
  }

  readAfterUpdate () {
    this.updateTooltips()
  }

  renderSignInSuccess () {
    return <SignInSuccessAnchor />
  }

  renderWithPR () {
    return <PRAnchor onclick={null} pr={this.model.currentPullRequest} pushing={this.pushing} buildStatus={this.model.buildStatus}/>
  }

  renderWithoutPR () {
    let [href, content] = ['#', '']
    if (this.model.githubCompareURL) {
      if (this.model.currentPullRequest) {
        [href, content] = [this.model.currentPullRequest.html_url, `#${this.model.currentPullRequest.number}`]
      } else {
        [href, content] = [this.model.githubCompareURL, 'New PR']
      }
    }
    return <NewPRAnchor onclick={this.openPRInBrowser.bind(this)} href={href} content={content} />
  }

  renderSignedOut () {
    return <SignInAnchor onclick={this.showSignInPanel.bind(this)} />
  }

  renderNoRepoAccess () {
    return <NoRepoAccessAnchor onclick={this.showRepoAccessModal.bind(this)}/>
  }

  updateTooltips () {
    if (this.PRTooltip) { this.PRTooltip.dispose() }
    switch (this.model.renderState) {
      case 'PR':
        this.PRTooltip = atom.tooltips.add(this.element.querySelector('.github-new-pr'), {title: `#${this.model.currentPullRequest.number} - ${this.model.currentPullRequest.title}`})
        break
      case 'NO_PR':
        this.PRTooltip = atom.tooltips.add(this.element.querySelector('.github-new-pr'), {title: this.PRTooltipText()})
        break
    }
  }

  async update () {
    return await etch.update(this)
  }

  // Click handlers
  // ==============

  showSignInPanel (event) {
    event.stopPropagation()
    event.preventDefault()
    const workspaceElement = atom.views.getView(atom.workspace)
    atom.commands.dispatch(workspaceElement, 'github:sign-in')
  }

  showRepoAccessModal (event) {
    event.stopPropagation()
    event.preventDefault()
    atom.workspace.addModalPanel({item: new GitHubModalRepoAccessComponent(this.model.gitHubRemote)})
  }

  openPRInBrowser (event) {
    event.preventDefault()
    this.model.expirePRCache()
    // if (this.model.syncStatus.needsPush) // This is only accurate for new branches rn
    if (true) {
      event.stopPropagation()
      this.model.push()
        .then(() => {
          this.model.setSyncStatus()
          shell.openExternal(event.target.getAttribute('href'))
        })
        .catch(err => {
          const message = `Couldn't push to GitHub: ${err}`
          atom.notifications.addWarning(message, {dismissable: true})
          shell.openExternal(event.target.getAttribute('href'))
          this.update()
        })
    }
  }

  PRTooltipText () {
    if (this.model.syncStatus.needsPush) {
      return `Push your changes in \`${this.model.currentBranch}\` and create a new PR`
    } else {
      return 'Create a new PR'
    }
  }

  destroy () {
    this.subscriptions.dispose()
    this.model.destroy()
    return etch.destroy(this)
  }
}
