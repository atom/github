'use babel'
/** @jsx etch.dom */

import etch from 'etch'

import AtomIcon from '../../shared-components/atom-icon'

export default class GitHubModalRepoAccessComponent {
  constructor (repoNWO) {
    this.coreCancelSubscription = atom.commands.add(
      atom.views.getView(atom.workspace),
      'core:cancel',
      this.close.bind(this)
    )
    this.gitHubLink = `https://github.com/${repoNWO}`
    etch.initialize(this)
  }

  close () {
    return atom.workspace.panelForItem(this).destroy()
  }

  update () {
    return etch.update(this)
  }

  async destroy () {
    await etch.destroy(this)
    this.coreCancelSubscription.dispose()
  }

  render () {
    return (
      <div className='github-modal-repo-access'>
        <a className='close-modal icon icon-x' onclick={this.close.bind(this)}></a>

        <div className='header'>
          <AtomIcon />
          <span className='icon icon-plus'></span>
          <span className='icon icon-mark-github'></span>
        </div>

        <div className='section no-access-explanation'>
          <p>
            You are successfully signed into GitHub, but Atom can't seem to fetch information
            about this repository. There are a few reasons that this might be the case:
          </p>

          <ul>
            <li>The repository at <a className='repo-link' href={this.gitHubLink}>{this.gitHubLink}</a> doesn't exist.</li>
            <li>The repository exists, but the owner or organization hasn't granted you access.</li>
            <li>
              If the repository at <a className='repo-link' href={this.gitHubLink}>{this.gitHubLink}</a> exists and you can access it,
              it's possible that the repository belongs to an organization that doesn't
              allow Atom to see its information. If this is the case, you can either <a href='https://github.com/settings/connections/applications/304b8ab5b0865d59bab2' className='request-access-link'>request access</a> or fork the repo into your
              own GitHub account.
            </li>
          </ul>
        </div>
      </div>
    )
  }
}
