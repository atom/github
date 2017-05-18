#!/bin/bash
set -e

# Read the "real" GPG program from the git repository configuration, defaulting to a PATH search for "gpg" just
# as git itself does.
unset GIT_CONFIG_PARAMETERS
GPG_PROGRAM=$(git config gpg.program || echo 'gpg')

# Determine if a custom GPG pinentry application is configured. If so, use the existing gpg agent configuration
# as-is.

GPG_HOME=${GNUPGHOME:-${HOME}/.gnupg}

if [ -z "${ATOM_GITHUB_TMP:-}" ]; then
  # Attempt to use existing gpg agent and pinentry
  exec "${GPG_PROGRAM}" --batch --no-tty --yes "$@"
fi

# Otherwise, launch a temporary GPG agent with an independent --homedir, an --options file pointing to the original
# configuration file (if one was present), and a --pinentry-program overridden to point to our Atom-backed
# gpg-pinentry.sh.

GPG_TMP_HOME="${ATOM_GITHUB_TMP%/}/gpghome/"
mkdir -p "${GPG_TMP_HOME}"
chmod 0700 "${GPG_TMP_HOME}"

# Copy all GPG configuration other than the sockets to ${GPG_TMP_HOME}.
find "${GPG_HOME}" ! -name "$(printf "*\n*")" -type f | while IFS= read -r FILE ; do
  SUBDIR=$(dirname "${FILE##${GPG_HOME}}")
  mkdir -p "${GPG_TMP_HOME}/${SUBDIR}"
  cp "${FILE}" "${GPG_TMP_HOME}/${SUBDIR}"
done

gpg-agent --daemon --homedir "${GPG_TMP_HOME}" --pinentry-program "${ATOM_GITHUB_PINENTRY_PATH}"
trap 'gpgconf --homedir "${GPG_TMP_HOME}" --kill gpg-agent' EXIT

"${GPG_PROGRAM}" --homedir "${GPG_TMP_HOME}" --batch --no-tty --yes "$@"
