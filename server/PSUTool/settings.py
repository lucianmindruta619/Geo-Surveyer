# Django settings for PSUTool project.

import os

DEBUG = True
TEMPLATE_DEBUG = DEBUG

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))

ADMINS = (
	# ('Your Name', 'your_email@example.com'),
	('Chris McCormick', 'chris@mccormickit.com'),
)

MANAGERS = ADMINS

DATABASES = {
	'default': {
		'ENGINE': 'django.db.backends.sqlite3', # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
		'NAME': os.path.join(PROJECT_ROOT, 'dev.sq3'),					  # Or path to database file if using sqlite3.
		'USER': '',					  # Not used with sqlite3.
		'PASSWORD': '',				  # Not used with sqlite3.
		'HOST': '',					  # Set to empty string for localhost. Not used with sqlite3.
		'PORT': '',					  # Set to empty string for default. Not used with sqlite3.
	}
}

# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en//ref/settings/#allowed-hosts

# list should mirror ../psutool-apache2.conf
ALLOWED_HOSTS = [
	"localhost",
	"127.0.0.1",
	"localhost:8000",
	"127.0.0.1:8000",
	"exchange.donovanassociates.com.au",
	"psutool.mccormickit.com",
	"PSU01",
	"PSU02",
	"PSU03",
	"PSU01.local",
	"PSU02.local",
	"PSU03.local",
	"psu01.donovan.local",
	"psu02.donovan.local",
	"psu03.donovan.local",
	"192.168.100.15",
	"192.168.100.16",
	"donpsu01.donovan.local",
	"donpsu01.donovanassociates.com.au"
]

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'Australia/Perth'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# path to the client files
CLIENT_ROOT = os.path.join(PROJECT_ROOT, "..", "..", "client")

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = os.path.join(PROJECT_ROOT, 'media')

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = '/media/'

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = os.path.join(PROJECT_ROOT, 'static')

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/static/'

# Additional locations of static files
STATICFILES_DIRS = (
	# Put strings here, like "/home/html/static" or "C:/www/django/static".
	# Always use forward slashes, even on Windows.
	# Don't forget to use absolute paths, not relative paths.
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
	'django.contrib.staticfiles.finders.FileSystemFinder',
	'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#	'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = '@4-*v^^2e-u$1$ejm_v)kvmt-pc8h4ri^lq(7d*r9=kf4316rl'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
	'django.template.loaders.filesystem.Loader',
	'django.template.loaders.app_directories.Loader',
#	 'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
	'django.middleware.common.CommonMiddleware',
	'django.contrib.sessions.middleware.SessionMiddleware',
	'django.middleware.csrf.CsrfViewMiddleware',
	'django.contrib.auth.middleware.AuthenticationMiddleware',
	'django.contrib.messages.middleware.MessageMiddleware',
	# Uncomment the next line for simple clickjacking protection:
	# 'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'PSUTool.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'PSUTool.wsgi.application'

TEMPLATE_DIRS = (
	# Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
	# Always use forward slashes, even on Windows.
	# Don't forget to use absolute paths, not relative paths.
	os.path.join(PROJECT_ROOT, "templates"),
)

INSTALLED_APPS = (
	'django.contrib.auth',
	'django.contrib.contenttypes',
	'django.contrib.sessions',
	'django.contrib.sites',
	'django.contrib.messages',
	'django.contrib.staticfiles',
	'django.contrib.markup',
	'django.contrib.admin',
	'django.contrib.admindocs',
	'south',
	'PSUTool',
)

TEMPLATE_CONTEXT_PROCESSORS = (
	"django.contrib.auth.context_processors.auth",
	"django.core.context_processors.debug",
	"django.core.context_processors.i18n",
	"django.core.context_processors.media",
	"django.core.context_processors.static",
	"django.core.context_processors.tz",
	"django.core.context_processors.csrf",
	"django.core.context_processors.request",
	"django.contrib.messages.context_processors.messages",
	"PSUTool.context_processors.allsettings",
)

AUTHENTICATION_BACKENDS = (
	'django.contrib.auth.backends.ModelBackend',
	# 'PVMF.backends.AnonymousBackend'
)

# AUTH_PROFILE_MODULE = "PSUTOOL.Person"

FILE_UPLOAD_HANDLERS = (
# 	"django.core.files.uploadhandler.MemoryFileUploadHandler",
 	"django.core.files.uploadhandler.TemporaryFileUploadHandler",
)

DEFAULT_SETTINGS_GLOBAL = {
	"export": {
		"xref_path": "",
	},
}

DEFAULT_SETTINGS_SURVEY = {
	"contours": {
		"minor": {"interval_mm": 200, "linetype": None, "color": None, "layer": None, "thickness": None},
		"major": {"minor_multiple": 5, "linetype": None, "color": None, "layer": None, "thickness": None},
	},
	"ahd_offset": 0.0,
}

DEFAULT_SURVEYS_UPLOAD_DIR = os.path.join(MEDIA_ROOT, "uploaded/")

BINARIES = {
	"git": {"bin": "/usr/bin/git"},
	"PotreeConverter": {"bin": "./PotreeConverter/build/PotreeConverter/PotreeConverter", "env": {"LD_LIBRARY_PATH": os.path.join(os.path.dirname(__file__), "..", "..", "libLAS/build/bin/Release/")}},
	"txt2las": {"bin": "./libLAS/build/bin/Release/txt2las", "env": {"LD_LIBRARY_PATH": os.path.join(os.path.dirname(__file__), "..", "..", "libLAS/build/bin/Release/")}}
}

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
	'version': 1,
	'disable_existing_loggers': False,
	'filters': {
		'require_debug_false': {
			'()': 'django.utils.log.RequireDebugFalse'
		}
	},
	'formatters': {
		'verbose': {
			'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s'
		},
		'simple': {
			'format': '%(levelname)s %(message)s'
		},
	},
	'handlers': {
		'mail_admins': {
			'level': 'ERROR',
			'filters': ['require_debug_false'],
			'class': 'django.utils.log.AdminEmailHandler'
		},
		'console': {
			'level': 'DEBUG',
			'class': 'logging.StreamHandler',
			'formatter': 'simple'
		},
	},
	'loggers': {
		'django.request': {
			'handlers': ['console', 'mail_admins'],
			'level': 'ERROR',
			'propagate': True,
		},
	}
}

if os.path.isfile(os.path.join(PROJECT_ROOT, "settings_local.py")):
	from settings_local import *


if DEBUG:
	# make all loggers use the console.
	for logger in LOGGING['loggers']:
		LOGGING['loggers'][logger]['handlers'] = ['console']
