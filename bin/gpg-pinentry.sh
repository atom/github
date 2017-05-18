#!/bin/bash
#
# GPG-compatible pinentry application that adapts the Assuan pinentry protocol to the
# (much simpler) git-askpass-atom.sh.

set -euo pipefail

encode()
{
  while read -r -n 1 CH; do
    case "${CH}" in
      "\n") printf "%%0A" ;;
      "\r") printf "%%0D" ;;
      "%") printf "%%25" ;;
      "") printf " " ;;
      *) printf "%s" "${CH}" ;;
    esac
  done
}

decode()
{
  while read -r -n 1 CH; do
    case "${CH}" in
      "%")
        read -r -n 2 NEXT
        printf "\x${NEXT}"
        ;;
      "") printf " " ;;
      *)
        printf "%s" "${CH}"
        ;;
    esac
  done
}

PROMPT="Please enter the passphrase for your default GPG signing key."

printf "OK Your orders please\n"
while read -r LINE; do
  case "${LINE}" in
    SETDESC*)
      PROMPT=$(echo "${LINE#SETDESC }" | encode)
      printf "Got prompt: %s\n" "${PROMPT}" >&2
      printf "OK\n"
      ;;
    GETPIN*)
      PASSPHRASE=$(${GIT_ASKPASS} "${PROMPT}")
      printf "D %s\nOK\n" "${PASSPHRASE}"
      ;;
    SETERROR*)
      # Bail immediately
      exit 1
      ;;
    *)
      printf "OK\n"
      ;;
  esac
done
