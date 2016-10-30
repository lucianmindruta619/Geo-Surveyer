import os
import sys
import json
import csv
import re

cs = re.compile("\, *")

class DonCode:
	def __init__(self, doncode_filename="", ms_layer_config_filename="", data={}):
		self.data = data
		if doncode_filename and ms_layer_config_filename:
			self.parse_files(doncode_filename, ms_layer_config_filename)
	
	def parse_files(self, doncode_filename, ms_layer_config_filename):
		self.data["doncodes"] = {}
		self.data["ms_layers"] = {}
		ms_layer = csv.DictReader(open(ms_layer_config_filename, 'rb'))
		for row in ms_layer:
			if row["MS Level/Layer"]:
				self.data["ms_layers"][row["MS Level/Layer"]] = row
		doncode = csv.DictReader(open(doncode_filename, 'rb'))
		for row in doncode:
			if row["Field Code"]:
				self.data["doncodes"][row["Field Code"]] = row
				# remove the blank row if any
				del row[""]
				code_types = cs.split(row["Code Type"])
				for c in code_types:
					key = c + "_codes"
					if not self.data.has_key(key):
						self.data[key] = []
					self.data[key].append(row["Field Code"])
	
	def to_json(self, indent=None):
		""" Serialize the PSU data to JSON. """
		return json.dumps(self.data, indent=indent)	

if __name__ == "__main__":
	if len(sys.argv) > 1:
		from pprint import pprint
		print DonCode(sys.argv[1], sys.argv[2]).to_json(2)
	else:
		print "Usage: ", sys.argv[0], "documentation/doncodes.csv documentation/mslayer.csv"

