#!/bin/sh
set -e

# Read the "real" GPG program from the git repository configuration, defaulting to a PATH search for "gpg" just
# as git itself does.
unset GIT_CONFIG_PARAMETERS
GPG_PROGRAM=$(git config gpg.program || echo 'gpg')
PASSPHRASE_ARG=

if [ -n "${ATOM_GITHUB_CREDENTIAL_HELPER_SCRIPT_PATH:-}" ] && [ -n "${GIT_ASKPASS:-}" ]; then
  PASSPHRASE=$(${GIT_ASKPASS})
  PASSPHRASE_ARG="--passphrase-fd 3"
fi

exec ${GPG_PROGRAM} --batch --no-tty --yes ${PASSPHRASE_ARG} "$@" 3<<< "${PASSPHRASE}"
