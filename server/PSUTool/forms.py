'''
'''

from django import forms

import models


class UploadFileForm( forms.ModelForm ):
    class Meta:
        model = models.PSUFileUpload
        exclude = ( 'name', )
