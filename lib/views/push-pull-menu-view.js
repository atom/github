/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

import {GitError} from '../git-shell-out-strategy'

export default class PushPullMenuView {
  constructor (props) {
    this.props = props
    this.checkRemote()
    this.push = this.push.bind(this)
    this.pull = this.pull.bind(this)
    this.fetch = this.fetch.bind(this)
    etch.initialize(this)
  }

  update (props) {
    this.props = Object.assign({}, this.props, props)
    this.checkRemote()
    return etch.update(this)
  }

  checkRemote () {
    if (!this.props.remoteName) {
      this.errorMessage = `Note: No remote detected for branch ${this.props.branchName}. Pushing will set up a remote tracking branch on remote repo 'origin'`
    } else {
      this.errorMessage = ''
    }
  }

  render () {
    return (
      <div className='git-Panel-item'>
        <div className='git-PushPullMenuView '>
          <span className='git-PushPullMenuView-item icon icon-mark-github'/>
          <button className='git-PushPullMenuView-item btn' ref='fetchButton' onclick={this.fetch} disabled={!this.props.remoteName}>Fetch</button>

          <div className='git-PushPullMenuView-item is-flexible btn-group'>
            <button ref='pullButton' className='btn' onclick={this.pull} disabled={!this.props.remoteName || this.props.pullDisabled}>
              <Tooltip active={this.props.pullDisabled} text='Commit changes before pulling' className='btn-tooltip-wrapper'>
                <span className='icon icon-arrow-down'/>
                <span ref='behindCount'>Pull {this.props.behindCount ? `(${this.props.behindCount})` : ''}</span>
              </Tooltip>
            </button>
            <button ref='pushButton' className='btn' onclick={this.push}>
              <span className='icon icon-arrow-up'/>
              <span ref='aheadCount'>Push {this.props.aheadCount ? `(${this.props.aheadCount})` : ''}</span>
            </button>
          </div>
        </div>
        <div className='git-PushPullMenuView-message' ref='message' innerHTML={this.errorMessage}></div>
      </div>
    )
  }

  async fetch () {
    try {
      await this.props.fetch()
    } catch (error) {
      if (!(error instanceof GitError)) throw error
      this.errorMessage = error.stdErr
      return etch.update(this)
    }
  }

  async pull () {
    try {
      await this.props.pull()
    } catch (error) {
      if (!(error instanceof GitError)) throw error
      this.errorMessage = error.stdErr
      return etch.update(this)
    }
  }

  async push (event) {
    try {
      await this.props.push({force: event.metaKey, setUpstream: !this.props.remoteName})
    } catch (error) {
      if (!(error instanceof GitError)) throw error
      if (error.stdErr.match(/rejected[\s\S]*failed to push/)) {
        this.errorMessage = 'Push rejected.\nTry pulling before pushing again. Or to force push hold `cmd` while clicking'
      } else {
        this.errorMessage = error.stdErr
      }
      return etch.update(this)
    }
  }
}

class Tooltip {
  constructor ({active, text, ...otherProps}, children) {
    this.active = active
    this.text = text
    this.children = children
    this.otherProps = otherProps
    this.handleMouseOut = this.handleMouseOut.bind(this)
    this.handleMouseOver = this.handleMouseOver.bind(this)
    etch.initialize(this)
  }

  update ({active, text, ...otherProps}, children) {
    this.active = active
    this.text = text
    this.children = children
    this.otherProps = otherProps
    return etch.update(this)
  }

  handleMouseOut () {
    if (this.tooltipDisposable) {
      this.tooltipDisposable.dispose()
      this.tooltipDisposable = null
    }
  }

  handleMouseOver () {
    if (this.active && !this.tooltipDisposable) {
      const element = this.element
      this.tooltipDisposable = atom.tooltips.add(element, {title: this.text, trigger: 'manual'})
    }
  }

  render () {
    return <div {...this.otherProps} onmouseover={this.handleMouseOver} onmouseout={this.handleMouseOut}>{this.children}</div>
  }

  destroy () {
    this.tooltipDisposable && this.tooltipDisposable.dispose()
    etch.destroy(this)
  }
}
