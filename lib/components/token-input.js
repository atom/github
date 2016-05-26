'use babel'
/** @jsx etch.dom */

import classnames from 'classnames'
import etch from 'etch'
import stateless from 'etch-stateless'

const Message = stateless(etch, ({success, failure}) => {
  if (success) {
    return <div className='response is-success'>Success!</div>
  } else if (failure) {
    return (
      <div className='response is-error'>
        Unable to sign you in with that token. Make sure it's correct and you're connected to the Internet.
      </div>
    )
  } else {
    return <div />
  }
})

export default stateless(etch, (props, children) => {
  let {token, shaking, checking, success, failure, onTokenChange, onSubmitToken} = props
  let inputClasses = classnames('token-input native-key-bindings', {
    'is-checking': checking,
    'is-error': shaking
  })

  let handleChange = (event) => onTokenChange(event.target.value)

  let inputs = (
    <div className='token-container'>
      <input oninput={handleChange} value={token} type='password' className={inputClasses}
        placeholder='Paste your token here' />
      <input type='submit' className='btn btn-lg btn-primary save-token' value='Complete sign in' />
    </div>
  )

  return (
    <form onsubmit={onSubmitToken} className='sign-in-form-group'>
      <Message success={success} failure={failure} />
      {success ? <div /> : inputs}
    </form>
  )
})
