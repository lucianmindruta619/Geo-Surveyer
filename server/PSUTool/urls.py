import os
import re

from django.conf.urls import patterns, include, url
from django.conf.urls.static import static
from django.conf import settings
from django.views.generic.simple import direct_to_template

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

import settings

urlpatterns = patterns('',
	# Examples:
	url(r'^$', direct_to_template, {'template': 'client/index.html'}),
	url(r'^point-cloud$', direct_to_template, {'template': 'client/point-cloud.html'}),
	# url(r'^PSUTool/', include('PSUTool.foo.urls')),
	
	url(r'^build-info.json$', 'PSUTool.views.build_info'),
	
	url(r'^settings.json$', 'PSUTool.views.settings_json'),
	url(r'^(?P<survey_id>\d+)/pointcloud-info.json$', 'PSUTool.views.pointcloud_info_json'),
	url(r'^(?P<survey_id>\d+)/settings.json$', 'PSUTool.views.settings_json'),
	url(r'^save/settings.json$', 'PSUTool.views.save_settings'),
	url(r'^save/(?P<survey_id>[0-9]\d+)/settings.json$', 'PSUTool.views.save_settings'),
	# Uncomment the admin/doc line below to enable admin documentation:
	# url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
	
	# Uncomment the next line to enable the admin:
	# url(r'^admin/', include(admin.site.urls)),
	
	# JSON API
	url(r'^(?P<survey_id>[\d]+[a-zA-Z]*?)-export.dxf$', 'PSUTool.views.export_dxf'),
	# url(r'^surveys.json$', 'PSUTools.views.surveys'),
	# url(r'^save-survey$', 'PSUTools.views.save_survey'),
	
	url(r'^surveys/$', 'PSUTool.views.load_survey_list'),
	
	# Upload
	url(r'^upload/$', 'PSUTool.views.upload_file'),
	
	# store files from e.g. PSUTool
	url(r'^file-store/$', 'PSUTool.views.file_store'),
	
	# Rebuild a job with all present data
	url(r'^rebuild/(?P<survey_id>[\d]+[a-zA-Z]*?)$', 'PSUTool.views.rebuild_job'),
	
	# Test 500 error
	url(r'^test500$', 'PSUTool.views.test500'),
)

# serve media and static files
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
# serve the client files statically
urlpatterns += url(r'^(?P<path>.*)$', 'django.views.static.serve', kwargs={"document_root": settings.CLIENT_ROOT, "show_indexes": True}),
