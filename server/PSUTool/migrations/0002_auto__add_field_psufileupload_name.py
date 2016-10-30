# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding field 'PSUFileUpload.name'
        db.add_column('PSUTool_psufileupload', 'name',
                      self.gf('django.db.models.fields.CharField')(default='abc', max_length=150),
                      keep_default=False)


    def backwards(self, orm):
        # Deleting field 'PSUFileUpload.name'
        db.delete_column('PSUTool_psufileupload', 'name')


    models = {
        'PSUTool.psufileupload': {
            'Meta': {'object_name': 'PSUFileUpload'},
            'created_on': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'file': ('django.db.models.fields.files.FileField', [], {'max_length': '100'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '150'})
        }
    }

    complete_apps = ['PSUTool']