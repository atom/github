'use babel'
/** @jsx etch.dom */

import etch from 'etch'

import UserAvatar from '../../shared-components/user-avatar'
import Markdown from '../../shared-components/markdown'
import TimeAgo from '../../shared-components/time-ago'

export default class ReviewCommentComponent {
  constructor ({comment}) {
    this.comment = comment
    etch.initialize(this)
  }

  render () {
    const comment = this.comment

    return (
      <div className='pr-comment-component'>
        <div className='github-PRComment-margin'/>

        <header className='github-PRComment-header'>
          <UserAvatar className='github-PRComment-avatar' size={20} userId={comment.user.id} />
          <span className='github-PRComment-login'> {comment.user.login} </span>
          added a note
          <a className='github-PRComment-timeAgo' href={comment.html_url}>
            <TimeAgo time={comment.created_at} />
          </a>
        </header>
        <Markdown className='github-PRComment-body'>{comment.body}</Markdown>
        <div className='github-PRComment-margin'/>
      </div>
    )
  }

  update ({comment}) {
    this.comment = comment
    return etch.update(this)
  }

  async destroy (remove) {
    await etch.destroy(this, remove)
  }
}
