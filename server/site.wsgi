#!/usr/bin/env python
# generic wsgi serving script
import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
sys.path.insert(0, os.path.join(os.path.abspath(os.path.dirname(__file__)), "virtualenv", "bin"))

import activate_this

os.environ['PYTHON_EGG_CACHE'] = '/var/cache/www/pythoneggs'

from PSUTool.wsgi import application
