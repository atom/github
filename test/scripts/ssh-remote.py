#!/usr/bin/env python

from __future__ import print_function

import os
import sys
import subprocess
from cStringIO import StringIO

password = subprocess.check_output([os.environ['SSH_ASKPASS'], 'Speak friend and enter'])
if password != 'friend':
    sys.stderr.write('Bzzzzzt bad password\n')
    sys.exit(1)

sys.stdout.write('005a66d11860af6d28eb38349ef83de475597cb0e8b4 HEAD\0multi_ack symref=HEAD:refs/heads/master\n')
sys.stdout.write('003f66d11860af6d28eb38349ef83de475597cb0e8b4 refs/heads/master\n')
sys.stdout.write('0000')
