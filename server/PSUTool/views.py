'''
	Copyright 2012-2014 Chris McCormick - (Lead Developer, McCormick IT).
	
	With contributions from:
	
		* Muddu Kishan
		* Prathamesh V. Paiyyar
		* Simon Wittber (Different Methods)
		* James Strauss (Onetwenty)

'''
from django.http import HttpResponse, HttpResponseServerError
from django.core.serializers.json import simplejson
from django.conf import settings
from django.shortcuts import render_to_response

from make_dxf import DXFWriter
import sh

from models import PSUFileUpload
from forms import UploadFileForm
from lib.psufile import PSUFile

import re, os, os.path, json, glob, time

import settings

from snippets.upload_handler import survey_id_from_filename

doncodes = json.loads( file( os.path.join( settings.CLIENT_ROOT, "data", "doncodes.json" ) ).read() )
# make the binaries runnable from Python
run = dict([(b, sh.__getattr__(settings.BINARIES[b]["bin"].replace(".", os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", ".."))).bake(_cwd=os.path.dirname(os.path.realpath(__file__)), _env=settings.BINARIES[b].get("env"))) for b in settings.BINARIES])

def export_dxf( request, survey_id ):
	if request.POST and request.POST.get( "data" ):
		# use the data in the post rather than loading from disk
		data = json.loads(request.POST.get("data"))
		jobSettings = json.loads(request.POST.get("jobSettings"))
		globalSettings = json.loads(request.POST.get("globalSettings"))
		options = json.loads(request.POST.get("options"))
	else:
		# TODO: load saved json from disk instead
		raise Http404("No data supplied.")
	outfile = os.path.join("uploaded", data["filename"], data["filename"] + (request.session.session_key and ("-" + str(request.session.session_key)) or "") + "-export.dxf")
	file(settings.MEDIA_ROOT + "/" + outfile, "w").write(DXFWriter(data, doncodes, jobSettings, globalSettings, options).render())
	return HttpResponse( settings.MEDIA_URL + outfile, mimetype="text/plain" )

def build_info(request):
	info = {
		"id": str(run["git"]("rev-parse", "HEAD").rstrip("\n")),
		"count": int(run["git"]("rev-list", "--count", "HEAD")),
	}
	return HttpResponse(json.dumps(info), mimetype="application/json")

def upload_file( request ):

	if request.method == 'POST':
		form = UploadFileForm( request.POST, request.FILES )

		if form.is_valid():
			uploaded_file = form.cleaned_data['file']
			if os.path.exists(uploaded_file.name):
				os.path.unlink(uploaded_file.name)
			form.instance.name = uploaded_file.name.replace( "uploaded/", "" )
			form.save()
			resp_data = {
				"file_survey_id": re.sub("[^0-9]", "", uploaded_file.name),
				"files": [{
					"name": uploaded_file.name,
					"size": uploaded_file.size,
					"url": "",
					"thumbnail_url": "",
					"delete_url": "",
					"delete_type": ""
				},],
			}
			return HttpResponse( simplejson.dumps( resp_data ) , mimetype="text/plain")
	return HttpResponseServerError( "" , mimetype="text/plain")

def file_store(request):
    sid = request.POST.get("survey_id")
    filetype = request.POST.get("file_type")
    payload = request.POST.get("payload")
    outfile = file(os.path.join(settings.MEDIA_ROOT, "uploaded", str(sid), str(sid) + "." + filetype), "w")
    outfile.write(payload)
    outfile.close()
    return HttpResponse("true", mimetype="text/plain")

def rebuild_job(request, survey_id):
	response_data = {"survey_id": survey_id}
	build_result = build_psu_data( survey_id )
	if build_result:
		built_id, rejected_codes = build_result
		response_data["psu"] = True
		response_data["rejected_codes"] = rejected_codes
	response_data["pointcloud"] = build_pointcloud_data(survey_id)
	return HttpResponse( simplejson.dumps( response_data ) , mimetype="text/plain")

def load_survey_list( request ):
	search = request.GET.get("search", "").strip();
	if search:
		dirs = get_files_by_timestamp(settings.DEFAULT_SURVEYS_UPLOAD_DIR, "*%s*" % search)
	else:
		dirs = get_files_by_timestamp(settings.DEFAULT_SURVEYS_UPLOAD_DIR)

	return HttpResponse( simplejson.dumps( filter_valid_surveys(dirs) ) , mimetype="application/json")

def build_psu_data( expecting_id ):

	upload_root = settings.PROJECT_ROOT + "/media/uploaded/"

	for dir_name in os.listdir( upload_root ):
		psu_dir = upload_root + dir_name

		if os.path.isdir( psu_dir ) and dir_name == expecting_id:
			output_filepath = "%s/%s.json" % ( psu_dir, dir_name )

			files = []
			for filename in os.listdir( psu_dir ):
				if os.path.isfile( psu_dir + "/" + filename ):
					files.append( filename.lower() )
			
			# check that we at least have the base set of files
			reqd_list = [ dir_name + '.p', dir_name + ".s", dir_name + ".u" ]
			if set( reqd_list ).issubset( set( files ) ):
				file_path = psu_dir + "/" + dir_name
				psufile = PSUFile( file_path , doncodes )
				output = psufile.to_json( 2 )
				f = open( output_filepath, "w" )
				f.write( output )
				f.close()
				return dir_name, psufile.rejected_codes

def build_pointcloud_data( survey_id ):
	# txt2las --parse xyz -i DDDD.txt -o DDDD.laz
	# PotreeConverter DDDD.laz
	# check if there is an uploaded PCD file in there
	outdir = os.path.join(settings.MEDIA_ROOT, "uploaded", survey_id)
	asc_file = os.path.join(outdir, survey_id + ".asc")
	laz_file = os.path.join(outdir, survey_id + ".laz")
	# if the asc file exists and was modified more recently than the .laz file, regenerate
	if os.path.isfile(asc_file):
		if not os.path.isfile(laz_file) or (os.path.getmtime(asc_file) > os.path.getmtime(laz_file)):
			#print "--- Starting las conversion ---"
			las_result = run["txt2las"]("--parse", "xyz", "-i", asc_file, "-o", laz_file)
			#print las_result
			#print "--- Starting potree conversion ---"
			potree_result = run["PotreeConverter"](laz_file, "-o", os.path.join(outdir, "laz"))
			#print potree_result
			return {"log": {"las-phase": str(las_result), "potree-phase": str(potree_result)}}
		else:
			return "cached"
	else:
		return False

def pointcloud_info_json(request, survey_id):
	return HttpResponse(simplejson.dumps({"point-cloud": os.path.isdir(settings.PROJECT_ROOT + "/media/uploaded/" + survey_id + "/laz")}), mimetype="application/json")

def settings_json(request, survey_id=None):
	settings_file = os.path.join(settings.MEDIA_ROOT, survey_id and os.path.join("uploaded", survey_id, "settings.json") or "global-settings.json")
	settings_loaded = os.path.isfile(settings_file) and json.loads(file(settings_file).read()) or {}
	merged = (survey_id and settings.DEFAULT_SETTINGS_SURVEY or settings.DEFAULT_SETTINGS_GLOBAL).copy()
	merged.update(settings_loaded)
	return HttpResponse(json.dumps(merged), mimetype="application/json")

def save_settings(request, survey_id=None):
	if request.POST:
		settings_data = json.loads(request.POST.get("settings_data", None))
		if settings_data:
			settings_file = os.path.join(settings.MEDIA_ROOT, survey_id and os.path.join("uploaded", survey_id, "settings.json") or "global-settings.json")
			json.dump(settings_data, open(settings_file, 'w'))
			return HttpResponse("saved", mimetype="text/plain")
	return HttpResponseServerError("Invalid save request.", mimetype="text/plain")

def filter_valid_surveys(dirs):
	final_dirs = []
	for file_date, file_path in dirs:
		dirname = os.path.basename(file_path)
 		json_filepath = os.path.join(file_path, dirname + ".json")

		if os.path.exists(json_filepath):
			final_dirs.append(dirname)

	return final_dirs


def get_files_by_timestamp(root, search_txt=None):
	
	date_file_list = []
	for folder in glob.glob(root):
		files = glob.glob(folder + '/*')
		if search_txt:
			files = glob.glob(folder + '/' + search_txt)

		for fp in files:
			# retrieves the stats for the current file as a tuple
	        # (mode, ino, dev, nlink, uid, gid, size, atime, mtime, ctime)
	        # the tuple element mtime at index 8 is the last-modified-date
			stats = os.stat(fp)
			
			# create tuple (year yyyy, month(1-12), day(1-31), hour(0-23), minute(0-59), second(0-59),
	        # weekday(0-6, 0 is monday), Julian day(1-366), daylight flag(-1,0 or 1)) from seconds since epoch
	        # note:  this tuple can be sorted properly by date and time
			lastmod_date = time.localtime(stats[8])
			
			# create list of tuples ready for sorting by date
			date_file_tuple = lastmod_date, fp
			date_file_list.append(date_file_tuple)
			
	date_file_list.sort()
	date_file_list.reverse() # newest mod date now first

	return date_file_list

def test500(request):
	raise Exception("Test exception.")

