"""
"""

from django.db import models

from snippets.upload_handler import PSUFileStorage


class PSUFileUpload( models.Model ):
    name = models.CharField( max_length = 150 )
    file = models.FileField( upload_to = "uploaded/", storage = PSUFileStorage() )
    created_on = models.DateTimeField( auto_now_add = True )
