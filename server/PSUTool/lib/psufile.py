import os
import re
import sys
import json
import math
from glob import glob

codes_order = [
	"object",
	"string",
	
	"breakline",
	"function",
	
	"attribute",
	"property",
]

lineparse_re = re.compile("""([^\s"']+|"([^"]*)"|'([^']*))""")
indexparse_re = re.compile('-[0-9]+')
n_functions = ["NC", "NP", "NL"]

def parse_code(original_code, doncodes, line_number):
	found_codes = []
	rejected_codes = []
	n_function = set()
	#sys.stderr.write("\n")
	#sys.stderr.write(original_code + "\n")
	for c in original_code.split("+"):
		code_index_comment = c.split("#")
		# print code_index_comment
		code_index = code_index_comment.pop(0)
		comment = len(code_index_comment) and code_index_comment.pop() or None
		index_found = indexparse_re.findall(code_index)
		if index_found:
			index = index_found[0][1:]
			code_section = code_index.replace(index_found[0], "")
		else:
			index = None
			code_section = code_index
		#parts = code_index.split("-")
		#code = parts.pop(0)
		#code_section = parts.pop(0)
		code = ""
		extensions = {}
		# we loop through all the known codes from the doncodes list
		# and find one that matches
		#print "pre:", c
		for o in codes_order:
			for e in sorted(doncodes[o + "_codes"], lambda a,b: len(b)-len(a)):
				# add an extension for this thing we found
				if not extensions.has_key(o):
					extensions[o] = []
				# find the code we are looking for on a 2-character boundary
				if e and e in code_section and not code_section.index(e) % 2:
					#print e, o, code_section
					if o == "object" or o == "string":
						if not code:
							code = e
					extensions[o].append(e)
					# n-function codes NP etc. get applied across all codes in the point
					if e in n_functions:
						n_function.add(e)
					# sys.stderr.write(original_code + " " + e + " " + o + "\n");
					# splice out the bit we found
					code_section = code_section[:code_section.index(e)] + code_section[code_section.index(e) + len(e):]
		#print code, extensions
		#print
		# auto-add NC to those points that require it
		if code and doncodes["doncodes"][code]["Auto Add Function Code"]:
			extensions["function"].append(doncodes["doncodes"][code]["Auto Add Function Code"])
			# sys.stderr.write("Auto-adding " + doncodes["doncodes"][code]["Auto Add Function Code"] + " to " + c + "\n");
		# if it has no code but does have a stringline index, make this a special string-match object (it will find the first matching point in the stringline and steal it's data
		if not code and index:
			code = "STRINGMATCH"
		# if no actual code was extracted then don't add this point as it's probably invalid
		code_data = {"code": code, "index": index, "comment": comment, "original_code": original_code, "extensions": extensions, "line_number": line_number}
		#sys.stderr.write(str(code_data) + "\n")
		if code:
			found_codes.append(code_data)
		else:
			rejected_codes.append(code_data)
	# make sure all the codes on this point have the same set of n-functions (NP etc.)
	for c in found_codes:
		for n in n_function:
			c["extensions"]["function"].append(n)
	return found_codes, rejected_codes

class PSUFile:
	def __init__(self, filename="", doncodes={}, data=None):
		self.rejected_codes = []
		self.doncodes = doncodes
		# sys.stderr.write(json.dumps(doncodes, indent=2) + "\n")
		if data:
			self.data = data
		elif filename:
			# TODO: if the filename ends with a .zip extract the three files to /tmp first
			self.parse_files(filename)
	
	def parse_files(self, filename):
		""" Given a root filename like "/tmp/213432", get the data out of "/tmp/213432.s", "/tmp/213432.p" and "/tmp/213432.u" into internal dictionaries. """
		# list of fields to extract from each line of each type of file
		fields = {
			# site points collected
			"p": ["point_id", "user_id", "marker_distance", "marker_angle", "marker_slope", "pole_height", "code"],
			# user information and site setup
			"u": ["user_id", "staff_initials", "date", "start_time", "unknown_1", "unknown_2", "station_name", "station_height", "finish_time", "last_first_point_id", "unknown_3", "unknown_4", "unknown_5", "unknown_6"],
			# origin location of theolodite
			"s": ["station_name", "description", "x", "y", "height", "reference_point_id"],
		}
		# here we open the files and do the actual reading of each file type
		data = {"p": None, "u": None, "s": None}
		# read each type of file once
		for d in data:
			data[d] = []
			datafiles = glob(filename + "*.[" + d + d.upper() + "]")
			datafiles.sort(lambda a, b: cmp(a.split(".").pop(0), b.split(".").pop(0)))
			for df in datafiles:
				# extract the day id from this particular file
				day_id = os.path.basename(df).split(".").pop(0).replace(os.path.basename(filename), "")
				datafile = file(df)
				linecount = 0
				# begin reading through line by line
				for inp in datafile.readlines():
					linecount += 1
					try:
						l = inp.decode('iso-8859-1').encode('utf8')
					except UnicodeDecodeError:
						l = inp.decode('utf8').encode('utf8')
					
					# parse the line using a nice regex to extract the atoms
					parsed = [t.rstrip("\r\n") for t in 
						[x[0] for x in lineparse_re.findall(l)]
					][1:-1]
					# check we got valid data
					if len(parsed):
						try:
							# sys.stderr.write(str(parsed) + "\n")
							# extract the fields of each line of a file
							line = dict([(fields[d][x], self.do_parse(fields[d][x], parsed[x])) for x in range(len(parsed))])
						except:
							raise Exception("Parse error - invalid " + d + " file format in " + os.path.basename(df) + " on line " + str(linecount) + ". ('" + str(parsed[x]) + "')")
                                                else:
							# add the day postfix to the user_id to separate those concerns
							if line.has_key("user_id"):
								line["user_id"] = str(line["user_id"]) + day_id
							# everything in every file should know what day it belongs to
							line["day_id"] = day_id
							# if this is a 'points' file
							if d == "p":
								# handle multiple codes per line in the point file
								found_codes, rejected_codes = parse_code(line["code"], self.doncodes, line["point_id"])
								for f in found_codes + rejected_codes:
									clone = line.copy()
									# add the code data to the data for this line
									for fc in f:
										clone[fc] = f[fc]
									clone["original_line_text"] = l
									if f in rejected_codes:
										self.rejected_codes.append(clone)
									else:
										data[d].append(clone)
							else:
								data[d].append(line)
		# find STRINGMATCH codes and copy their data from the first related point we find, otherwise reject them
		for p in data["p"]:
			if p["code"] == "STRINGMATCH":
				found_string = False
				# search the points for a matching index
				for fp in data["p"]:
					# sys.stderr.write(str(p))
					if not found_string and fp["index"] == p["index"] and fp["code"] != "STRINGMATCH":
						# found one, copy code and extensions then exit
						p["code"] = fp["code"]
						p["extensions"] = fp["extensions"].copy()
						found_string = True
						#sys.stderr.write(str(p) + "\n")
						#sys.stderr.write(str(fp) + "\n")
				if found_string == False:
					# there is no string to make it part of so just remove it and add it to rejected codes again
					#data["p"].remove(p)
					self.rejected_codes.append(p)
		# make sure not STRINGMATCH codes are left in the .p files
		data["p"] = [p for p in data["p"] if not p["code"] == "STRINGMATCH"]
		data["filename"] = os.path.basename(filename)
		# set our internal reference data to this
		self.data = data
	
	def do_parse(self, name, value):
		# keep "angles" that are in decimal/arcminute/arcsecond format as strings to convert client side
		# also keep times which are in a similar weird compressed format as a string to be parsed client side
		if name in ["marker_angle", "marker_slope", "date", "start_time", "finish_time"]:
			return value
		else:
			return json.loads(value)
	
	def to_json(self, indent=None):
		""" Serialize the PSU data to JSON. """
		return json.dumps(self.data, indent=indent)

	def from_json(self, data):
		""" De-serialize the PSU data from JSON. """
		self.data = json.loads(data)

if __name__ == "__main__":
	if len(sys.argv) > 1:
		import inspect, os
		# load the doncodes in relative to the current file
		doncodes = json.loads(file(os.path.join(os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe()))), "..", "..", "..", "client", "data", "doncodes.json")).read())
		print PSUFile(sys.argv[1], doncodes).to_json(2)
	else:
		print "Usage: ", sys.argv[0], "root-file-name-without-.p/u/s"

