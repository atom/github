'use babel'
/** @jsx etch.dom */

import etch from 'etch'
import stateless from 'etch-stateless'

export default stateless(etch, ({onClickSignIn, authorizationUrl}) => {
  return (
    <div className='sign-in-form-group'>
      <div className='section sign-in-explanation'>
        <p>
          Click the button below to authorize with GitHub.
        </p>
        <p className='note'>
          {/* When this ships, your token will be automatically saved by Atom, but for the moment you will need to copy and paste.*/}
        </p>
      </div>
      <a className='btn btn-lg btn-primary sign-in-to-github' onclick={onClickSignIn} href={authorizationUrl}>Sign in to GitHub</a>
    </div>
  )
})
