#!/usr/bin/env python

from __future__ import print_function

import sys
import re

if sys.argv[1] != 'get':
    sys.exit(0)

query = {}
for line in sys.stdin:
    match = re.match('^([^=]+)=(.*)$', line)
    if match:
        query[match.group(1)] = match.group(2)

print('protocol={}'.format(query['protocol']))
print('host={}'.format(query['host']))
