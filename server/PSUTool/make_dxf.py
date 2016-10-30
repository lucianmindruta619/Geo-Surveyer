# -*- coding: utf8 -*-

import os
import math
from cStringIO import StringIO
from pprint import pprint
import re

layer_names_re = re.compile('[^A-Za-z0-9_\-\$]+')

import dxfwrite
from dxfwrite import DXFEngine as dxf
from dxfwrite.const import MIDDLE

class DXFWriter:
	def __init__(self, data, doncodes, jobSettings={}, globalSettings={}, options={}):
		self.data = data
		self.doncodes = doncodes
		self.settings = {
			"job": jobSettings,
			"global": globalSettings,
			"options": options
		}
		
		# bounding box
		self.bounding_box = data["bounding_box"]
		
		# pull out the boundary marker
		bm_candidates = [p for p in data["p"] if p["code"] == "BM" and "NP" in p["extensions"].get("function", [])]
		if bm_candidates:
			self.bm = bm_candidates[0]
		else:
			self.bm = {"position": [0, 0, 0], "fake": True}
	
	def convert_point(self, p):
		return (p[2], p[0], p[1])
	
	def flatten_point(self, p):
		return [p[0], p[1], 0]
	
	def filter_layer_name(self, layername):
		return layer_names_re.sub('', layername.replace(" ", "_")) or "Unspecified_Layer"
	
	def render_contour(self, drawing, contour_lines, compute_point_fn, layer_postfix=""):
		# loop through the contour lines adding them
		for contour_line in contour_lines:
			line = contour_line.get("vertices")
			contour_detail = {"layer": "Contour"}
			# get the contour line settings and apply them
			if self.settings["job"].get("contours") and self.settings["job"]["contours"][contour_line.get("type")]:
				contour_settings = self.settings["job"]["contours"][contour_line.get("type")]
				for x in ["color", "thickness", "linetype", "layer"]:
					if contour_settings.get(x):
						contour_detail[x] = contour_settings.get(x)
			contour_detail["layer"] = self.filter_layer_name(str(contour_detail["layer"]) + layer_postfix)
			if contour_line.get("type") == "major":
				drawing.add(dxf.text(line[0][1], compute_point_fn(line[len(line)/2]), height=0.5, rotation=-90, **contour_detail))
			contour = dxf.polyline(**contour_detail)
			contour.add_vertices([compute_point_fn(p) for p in line])
			drawing.add(contour)
	
	def render_mesh(self, drawing):
		for t in self.data.get("triangles"):
			f = dxf.face3d([self.convert_point(t.get(x)) for x in ["a", "b", "c"]], layer="Mesh")
			drawing.add(f)
	
	def render(self):
		data = self.data
		point_layers = {}
		
		# create the drawing and add layers to it
		drawing = dxf.drawing()
		drawing.add_layer(self.filter_layer_name('objects'))
		drawing.add_layer(self.filter_layer_name('marker'))
		drawing.add_layer(self.filter_layer_name('Mesh'))
		
		# Add layers from the doncodes
		for l in set([self.doncodes["doncodes"][lx]["CAD LAYERS"] for lx in self.doncodes["doncodes"]]):
			if l:
				drawing.add_layer(self.filter_layer_name(l))
		
		# might need custom layers for major/minor contours
		have_contour_names = []
		for x in ["major", "minor"]:
			if self.settings["job"].get("contours") and self.settings["job"]["contours"][x] and self.settings["job"]["contours"][x].get("layer"):
				drawing.add_layer(self.filter_layer_name("Contour - " + str(self.settings["job"]["contours"][x].get("layer"))))
				have_contour_names.append(x)
		
		if len(have_contour_names) < 2:
			# drawing.add_layer(self.filter_layer_name('Contour'))
			drawing.add_layer(self.filter_layer_name('Contour Splines'))
			drawing.add_layer(self.filter_layer_name('Contour Splines Flat'))
		
		# add the separated codes/shots/rls
		for x in ["Shots", "Rls", "Codes"]:
			for y in ["", "_NC", "_NL"]:
				drawing.add_layer(self.filter_layer_name(x + y))
		
		#drawing.header['$ANGBASE'] = self.bm["marker_angle"]
		
		#drawing.header['$UCSORG'] = (0, 0, 0)
		#drawing.header['$UCSXDIR'] = (1, 0, 0)
		#drawing.header['$UCSYDIR'] = (0, 1, 0)
		
		# set 3D Point
		#drawing.header['$EXTMIN'] = (0, 0, -10)
		#drawing.header['$EXTMAX'] = (1000, 1000, 100)
		
		# add the mesh
		if self.settings["options"]["threedMesh"] == "1" :
			self.render_mesh(drawing)
		
		#add stringlines to string_lines layer
		for line in data["stringlines"]:
			if len(data["stringlines"][line]) > 1:
				# variable to store stringline colour, thickness etc. to be passed to polyline
				stringline_detail = {}
				first_point = data["stringlines"][line][0]
				ms_layer = first_point["doncode"].get("MS Properties")
				layer_codes = self.doncodes["ms_layers"].get(ms_layer)
				# make sure we have stringline properties in our doncodes array (often blank)
				if layer_codes:
					# print data["stringlines"][line][0]["code"], ms_layer
					# print first_point["code"], layer_codes
					# if we have a special colour
					if layer_codes.get("Col"):
						stringline_detail["color"] = int(layer_codes["Col"])
					# if we have a line weight set
					if layer_codes.get("Line Weight") and int(layer_codes.get("Line Weight")):
						stringline_detail["thickness"] = int(layer_codes.get("Line Weight"))
					# if we have a line style TODO: map these to their actual line styles
					if layer_codes.get("Line Style") and int(layer_codes.get("Line Style")):
						stringline_detail["linetype"] = int(layer_codes.get("Line Style"))
				polyline = dxf.polyline(layer=self.filter_layer_name(first_point["doncode"].get("CAD LAYERS")), **stringline_detail)
				polyline.add_vertices([self.convert_point(p["point"]) for p in data["stringlines"][line]])
				drawing.add(polyline)
		
		# add the regular (original) contour line
		if self.settings["options"]["origContour"] == "1" :
			self.render_contour(drawing, data["contour_lines"], lambda p: self.convert_point(p)) # Line was previously commented.

		# add splines contour line
		if self.settings["options"]["splinesContour"] == "1" :
			# splines version
			self.render_contour(drawing, data["contour_splines"], lambda p: self.convert_point(p), " Splines")
			# flat spline version
			self.render_contour(drawing, data["contour_splines"], lambda p: self.flatten_point(self.convert_point(p)), " Splines Flat")
		
		# loop through the points with 2d objects on them putting Xrefs on the ones that need it
		#print data["objects_2d"]
		for o in data["objects_2d"]:
			# //bush.position.set(objects_2d[o][0],objects_2d[o][1]+0.3,objects_2d[o][2]).multiplyScalar(psu_renderer.SCALE);
			# psu_renderer.generate_obj(bush.clone());
			drawing.add_xref(self.settings["global"].get("export", {}).get("xref_path", "") + o["code"] + ".dwg", insert=self.convert_point(o["point"]), layer=self.filter_layer_name(o["doncode"].get("CAD LAYERS")))
		
		# find and add trees to plot and tree schedule
		# create the table for tree information
		tree_table = dxf.table(insert=self.convert_point([self.bounding_box[0][1], 0, self.bounding_box[2][0] - 20]), nrows=len(data["trees"]) + 2, ncols=4)
		tree_table.set_col_width(1, 4)
		tree_table.set_col_width(2, 3)
		tree_table.set_col_width(3, 5)
		# table cell style
		ctext = tree_table.new_cell_style('ctext', textcolor=7, textheight=0.5, halign=dxfwrite.CENTER, valign=dxfwrite.MIDDLE)
		# table border style
		border = tree_table.new_border_style(color=6, priority=51)
		ctext.set_border_style(border, right=False)
		# table header
		hcell = tree_table.text_cell(0, 0, "SCHEDULE OF TREES")
		hcell.span=(1,4)
		tree_table.text_cell(1, 1, "DIAMETER", style='ctext')
		tree_table.text_cell(1, 2, "HEIGHT", style='ctext')
		tree_table.text_cell(1, 3, "TYPE", style='ctext')
		for t in range(len(data["trees"])):
			tree = data["trees"][t]
			diameter = tree["tree_details"].get("diameter", None)
			height = tree["tree_details"].get("height", None)
			spread = tree["tree_details"].get("spread", None)
			note = tree["tree_details"].get("note", None)
			blockname = "tree_" + str(t + 1)
			layer = self.filter_layer_name(self.doncodes["doncodes"][tree["code"]].get("CAD LAYERS"))
			if diameter or spread:
				tree_block = dxf.block(name=blockname)
				# trunk
				if diameter:
					tree_block.add(dxf.circle(float(diameter) / 2.0, [0, 0], layer=layer))
				# leaves
				if spread:
					tree_block.add(dxf.circle(float(spread) / 2.0, [0, 0], layer=layer))
				drawing.blocks.add(tree_block)
				drawing.add(dxf.insert2(blockdef=tree_block, insert=self.convert_point(tree["position"]), layer=layer))
			# table
			# table position is left of bounding box
			tree_table.text_cell(t+2, 0, "T" + str(t + 1), style='ctext')
			tree_table.text_cell(t+2, 1, diameter and diameter or "", style='ctext')
			tree_table.text_cell(t+2, 2, (height and height + "m" or ""), style='ctext')
			tree_table.text_cell(t+2, 3, note and note.upper() or "", style='ctext')
		drawing.add(tree_table)
		
		if not self.bm.get("fake"):
			drawing.add(dxf.point(self.convert_point(self.bm["position"]), layer=self.filter_layer_name(self.doncodes["doncodes"][self.bm["code"]].get("CAD LAYERS"))))
			drawing.add(dxf.text("BM", self.convert_point(self.bm["position"]), height=0.2, layer=self.filter_layer_name(self.doncodes["doncodes"][self.bm["code"]].get("CAD LAYERS"))))
		
		# loop through the points adding labels to the layer
		seen = []
		for p in data["p"]:
			# uniquely identify this piece of text at this position to prevent duplicates
			text_id = tuple([p["original_code"], p.get("day_id", "")] + p["position"])
			# figure out if we are NL or 
			layer_postfix = ""
			for l in ["NL", "NC"]:
				if l in p["extensions"]["function"]:
					layer_postfix = "_" + l
			# if this isn't a duplicate and isn't a tree
			if not text_id in seen or p["code"] == "TR":
				blockname = 'point_' + str(p["point_id"]) + (p.get("day_id") and "-" + p["day_id"] or "")
				point_block = dxf.block(name=blockname)
				if p.get("force_point_layer"):
					layer_code = p["force_point_layer"]["code"]
				else:
					layer_code = p["code"]
				layer = self.filter_layer_name(self.doncodes["doncodes"][layer_code].get("CAD LAYERS"))
				# create a block to unite the various elements of the point
				# for trees we just want to draw their ref
				if p["code"] == "TR":
					point_block.add(dxf.text("T" + str([t["point_id"] for t in data["trees"]].index(p["point_id"]) + 1), [0.2, 0.2], height=0.2, layer="Codes" + layer_postfix))
				else:
					# these codes don't have the original_code text printed on the plot
					if not p["code"] in ["RC", "LC"]:
						# everything else gets original code printed
						point_block.add(dxf.text(p["original_code"] + " (" + str(p["line_number"]) + ")", (0, 0), alignpoint=(0, -0.2), height=0.05, rotation=-90, layer="Codes" + layer_postfix, valign=MIDDLE))
					if not "NL" in p["extensions"]["function"]:
						point_block.add(dxf.text("%.2f" % (p["position"][1]), (0, 0), alignpoint=(0.12, -0.12), height=0.3, rotation=-45, layer="Rls" + layer_postfix, valign=MIDDLE))
				point_block.add(dxf.point([0, 0], layer="Shots" + layer_postfix))
				drawing.blocks.add(point_block)
				drawing.add(dxf.insert2(blockdef=point_block, insert=self.convert_point(p["position"]), layer=layer))
				
				# print p["doncode"].get("Draw Cross Hair on Point")
				if self.doncodes["doncodes"][p["code"]].get('Draw Cross Hair on Point', 'n').lower() in ["1", "y", "yes", "true", "x"]:
					drawing.add_xref(self.settings["global"].get("export", {}).get("xref_path", "") + "X.dwg", insert=self.convert_point(p["position"]), layer="Shots" + layer_postfix)
				seen.append(text_id)
		
		# save the drawing to the binary blob and then return the DXF code
		# binary blob to pretend to be a file and store our saved DXF
		blob = StringIO()
		drawing.save_to_fileobj(blob)
		return blob.getvalue()

