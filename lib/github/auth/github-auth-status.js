'use babel'

import keytar from 'keytar'

export default {
  check: function () {
    return !!keytar.getPassword('atom-github', '_default')
  }
}
