"""
"""
from django.conf import settings
from django.core.files.storage import Storage, FileSystemStorage

import re

def survey_id_from_filename(result):
    if result:
        numeric_part_result = re.search( r'[0-9]*', result.group())
        if numeric_part_result:
            return numeric_part_result.group()

class PSUFileStorage( FileSystemStorage ):
    def _save(self, name, content):
        if self.exists(name):
            self.delete(name)
        return FileSystemStorage._save(self, name, content)

    def get_available_name(self, name):
        return name

    def path( self, name ):
        result = re.search( r'[0-9]*[a-zA-Z]?[.](p|u|s|asc)$', name, re.I )
        numeric_part = survey_id_from_filename(result)
        if numeric_part:
            new_name = name.replace( "uploaded", "uploaded/" + numeric_part )
            return super( PSUFileStorage, self ).path( new_name )
        else:
            raise Exception("Illegal file type.")
