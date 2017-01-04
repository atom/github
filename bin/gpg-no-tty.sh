#!/bin/sh
set -e

# Read the "real" GPG program from the git repository configuration, defaulting to a PATH search for "gpg" just
# as git itself does.
unset GIT_CONFIG_PARAMETERS
GPG_PROGRAM=$(git config gpg.program || echo 'gpg')

exec ${GPG_PROGRAM} --batch --no-tty "$@" </dev/null
