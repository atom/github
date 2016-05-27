'use babel'

import {Emitter} from 'atom'

export default class CommentEmitter {
  constructor () {
    this.emitter = new Emitter()
  }

  onCommentAdded (callback) {
    return this.emitter.on('comment-added', callback)
  }

  didAddComment (comment) {
    this.emitter.emit('comment-added', comment)
  }

  dispose () {
    this.emitter.dispose()
  }
}
