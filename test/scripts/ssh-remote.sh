#!/bin/sh

PASSWORD=$(${SSH_ASKPASS} 'Speak friend and enter')
if [ "${PASSWORD}" != 'friend' ]; then
  printf 'Bzzzzzt bad password\n' >/dev/stderr
  exit 1
fi

printf '005a66d11860af6d28eb38349ef83de475597cb0e8b4 HEAD\0multi_ack symref=HEAD:refs/heads/master\n'
printf '003f66d11860af6d28eb38349ef83de475597cb0e8b4 refs/heads/master\n'
printf '0000'
