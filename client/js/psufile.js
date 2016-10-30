/** PSUFile representation. */

// convert from the strange decimal/arcsecond string representation
// before the radix is degrees,
// after the radix the first two numbers are arcminutes, the remaining numbers are arcseconds
// note extra zeros are silently dropped in the representation so we must reconstitute them
function convert_arc_to_degrees(a) {
	var parts = a.split(".");
	// extract the number of degrees from before the radix point
	var degrees = parts[0];
	// extract the minutes component from the first two digits after radix
	// zero-pad if it's a truncated minutes representation (e.g. "1" == 10 arcminutes - 60 arcminutes in a degree)
	var minutes = (parts.length > 1 ? parts[1].substr(0, 2) : "0");
	while (minutes.length < 2) {
		minutes += "0";
	}
	// extract the seconds component from the remaining digits after radix
	// zero-pad if it's a truncated seconds representation (e.g. "1" == 10 arcseconds - 60 arcseconds in an arcminute)
	var seconds = (parts.length > 1 && parts[1].length > 2 ? parts[1].substr(2) : "0");
	while (seconds.length < 2) {
		seconds += "0";
	}
	// now turn it into a proper base 10 degree value the trig functions understand
	return parseInt(degrees) + ((parseInt(minutes) + (parseInt(seconds) / 60.0)) / 60.0);
}

function PSUFile(data) {
	var point_list = {};
	// verticies have properties: id, code, and array data for x, y, z
	var vertices = [];
	var to_radians = (Math.PI / 180.0);
	var filename = data.filename;
	var user_by_id = {};
	var station_by_name = {};
	var doncode_data = null;
	var re_tree_data = {
		"diameter": /^([0-9\.]+)D/i,
		"height": /^([0-9\.]+)H/i,
		"spread": /^([0-9\.]+)S/i
	}
	data.bounding_box = [[Number.MAX_VALUE, -Number.MAX_VALUE], [Number.MAX_VALUE, -Number.MAX_VALUE], [Number.MAX_VALUE, -Number.MAX_VALUE]];
	var contour_minor_interval = 0.20;
	var contour_major_multiple = 5;
	var settings = {};
	var station_reference_offset = {};
	// structure to hold breaklines
	data["breaklines"] = {};
	// build a list of days in this job
	days = [];
	
	// traverse the lines in the station file and reference to the station name
	for (var s=0; s<data.s.length; s++) {
		var station = data.s[s];
		// make sure there's a day entry for this station line's day
		if (!station_by_name[station["day_id"]]) {
			station_by_name[station["day_id"]] = {};
			station_reference_offset[station["day_id"]] = {};
		}
		station_by_name[station["day_id"]][station["station_name"]] = station;
		// default station position is 0, 0, 0
		station.position = [station.y, station.height, station.x];
		// make sure we have a station_reference_offset for this station name
		if (!station_reference_offset[station["day_id"]][station["station_name"]]) {
			station_reference_offset[station["day_id"]][station["station_name"]] = [0, 0, 0];
		}
		// if this day ID isn't in our list, add it
		if (days.indexOf(station["day_id"]) == -1) {
			days.push(station["day_id"]);
		}
	}
	
	console.log("Station by name:");
	console.log(station_by_name);
	
	// traverse the lines in the 'user' file and reference to user id
	for (var u=0; u<data.u.length; u++) {
		if (!user_by_id[data.u[u]["day_id"]]) {
			user_by_id[data.u[u]["day_id"]] = {};
		}
		user_by_id[data.u[u]["day_id"]][data.u[u]["user_id"]] = data.u[u];
		if (u < data.u.length - 1) {
			var day_id = data.u[u]["day_id"];
			// add to the next station a link back to the last shot taken by the previous station
			var station = station_by_name[day_id][data.u[u]["station_name"]];
			var next_user_station = station_by_name[day_id][data.u[u + 1]["station_name"]];
			// console.log(data.u[u]["station_name"], data.u[u+1]["station_name"]);
			// if we're at a day transition - get the first one from tomorrow
			if (!next_user_station) {
				var tomorrow_id = days[days.indexOf(day_id) + 1];
				next_user_station = station_by_name[tomorrow_id][data.u[u + 1]["station_name"]]
			}
			// console.log(day_id, next_user_station);
			next_user_station.last_first_point_id = data.u[u]["last_first_point_id"];
			next_user_station.last_first_point_day_id = day_id;
			console.log("First last link:", next_user_station.last_first_point_id, next_user_station.last_first_point_day_id, next_user_station["day_id"]);
		}
	}
	
	console.log("User by ID:");
	console.log(user_by_id);
	
	// updates our bounding rectangle with a new point
	function update_bounding_box(p) {
		for (var n=0; n<p.length; n++) {
			if (p[n] < data.bounding_box[n][0]) {
				data.bounding_box[n][0] = p[n];
			}
			if (p[n] > data.bounding_box[n][1]) {
				data.bounding_box[n][1] = p[n];
			}
		}
	}
	
	var edges = ["a", "b", "c"];
	// extract retaining wall data from the vertices
	this._find_retaining_walls = function() {
		var rw_points = [];
		var triangles = this.get_triangles();
		// find connected vertices
		for (var t=0; t<triangles.length; t++) {
			var triangle = triangles[t];
			// loop through the edges of the triangle
			for (var s=0; s<3; s++) {
				var a = triangle[edges[s]];
				var b = triangle[edges[(s + 1) % 3]];
				// if this is a top joining to a bottom
				/*if ((a.code.substring(0, 4) == "RWTO" && b.code.substring(0, 4) == "RWBT") ||
				(b.code.substring(0, 4) == "RWTO" && a.code.substring(0, 4) == "RWBT")) {
					//console.log("---");
					//console.log(a);
					//console.log(b);
					rw_points.push(a.vertex);
					rw_points.push(b.vertex);
					rw_points.push([a.vertex[0], b.vertex[1], a.vertex[2]]);
					rw_points.push([b.vertex[0], a.vertex[1], b.vertex[2]]);
					//console.log(a.vertex);
					//console.log(b.vertex);
					//console.log([a.vertex[0], b.vertex[1], a.vertex[2]]);
					//console.log([b.vertex[0], a.vertex[1], b.vertex[2]]);
				}*/
			}
		}
		var uniques = [];
		for(var i=0; i<rw_points.length; i++) {
			var v = rw_points[i];
			if(uniques.indexOf(v) == -1) {
				uniques.push(v);
			}
		}
		uniques.sort(function(a, b) { return a[2] - b[2] });
		return uniques;
	}
	
	// given the doncode data and a particular code, return the data set for that code
	this._doncode_lookup = function(doncodes, code) {
		// code is either the first two or the first four letters
		var fourcode = doncodes[code.substring(0, 4)];
		var twocode = doncodes[code.substring(0, 2)];
		if (fourcode != undefined) {
			return fourcode;
		} else if (twocode != undefined) {
			return twocode;
		} else {
			return {};
		}
	}
	
	// get an associative array containing each code and the points that belong to it
	this.get_point_lists = function() {
		return point_list;
	}
	
	// just get a list of all the vertices we know about
	this.get_vertices = function() {
		return vertices;
	}
	
	// returns true if the point is in the mesh
	function in_mesh(vertex) {
		return !(vertex.data.extensions["function"] && (vertex.data.extensions["function"].indexOf("NP") != -1 || vertex.data.extensions["function"].indexOf("NC") != -1 || vertex.data.extensions["function"].indexOf("NL") != -1));
	}
	
	// returns the list of vertices in a format ready for triangulation
	this.get_top_view_vertices = function() {
		var top_view_vertices = [];
		for (var v=0; v<vertices.length; v++) {
			var vertex = vertices[v];
			// don't include NC or NP points in the mesh generation
			if (in_mesh(vertex)) {
				// make sure we don't have this exact coordinate already (no duplicates)
				var add = true;
				for (tv=0;tv<top_view_vertices.length;tv++) {
					if (top_view_vertices[tv].x == vertex[0] && top_view_vertices[tv].y == vertex[2]) {
						add=false;
						// console.debug("rejected duplicate 2d vertex!", top_view_vertices[tv].data.code, top_view_vertices[tv].data.line_number, vertex.data.code, vertex.data.line_number, vertex);
						// console.debug(vertex);
						top_view_vertices[tv].copoints_2d.push(vertex);
					}
				}
				if (add) {
					vertex.x = vertex[0];
					vertex.y = vertex[2];
					vertex.vertex = vertex;
					vertex.copoints_2d = [vertex];
					top_view_vertices.push(vertex);
				}
			} else {
				//console.debug("excluding NC point:");
				//console.debug(vertex);
			}
		}
		console.log("Done getting top view vertices:", top_view_vertices);
		return top_view_vertices;
	}
	
	// returns pertinent info about this survey
	this.info_sheet = function() {
		
	}
	
	this.get_date_time_array = function(fieldname) {
		var parts = String(data.u[0][fieldname]).split(".");
		// extract the number of degrees from before the radix point
		var day = parts[0];
		while (day.length < 2) {
			day = "0" + day;
		}
		// zero-pad
		var month = (parts.length > 1 ? parts[1].substr(0, 2) : "0");
		while (month.length < 2) {
			month += "0";
		}
		// zero-pad
		var year = (parts.length > 1 && parts[1].length > 2 ? parts[1].substr(2) : "0");
		while (year.length < 4) {
			year += "0";
		}
		return [year, month, day];
	}

	// return the bounding box of all point data loaded
	this.get_bounding_box = function() {
		return data.bounding_box;
	}
	
	// get the center point of the mesh bounding box
	this.get_center_point = function() {
		return [
			(data.bounding_box[0][0] + data.bounding_box[0][1]) / 2.0,
			(data.bounding_box[1][0] + data.bounding_box[1][1]) / 2.0,
			(data.bounding_box[2][0] + data.bounding_box[2][1]) / 2.0,
		];
	}
	
	// return the list of triangles computed with the delaunay algorithm
	this.get_triangles = function(recompute) {
		if (!data["triangles"] || recompute) {
			var delaunay_data = this.get_delaunay_data();
			console.log("Got Delaunay data.");
			// first make the raw mesh
			data.triangles = delaunay_triangulate(delaunay_data.vertices);
			console.log("Delaunay triangulation complete.");
			// then constraint it to breakline edges
			data.triangles = delaunay_constrain(delaunay_data.vertices, delaunay_data.edges, data.triangles);
			console.log("Delaunay constraint complete.");
		}
		return data.triangles;
	}
	
	// use contour settings from settings file
	this.use_settings = function(new_settings) {
		// grab all the values from the new settings passed in
		for (var s in new_settings) {
			settings[s] = new_settings[s];
			console.log("new settings:", s, settings[s]);
		}
		if (settings.job.contours) {
			var contour_settings = settings.job.contours;
			if (contour_settings.major && contour_settings.major.minor_multiple) {
				contour_major_multiple = contour_settings.major.minor_multiple;
			}
			if (contour_settings.minor && contour_settings.minor.interval_mm) {
				contour_minor_interval = contour_settings.minor.interval_mm / 1000.0;
			}
		}
		// console.log(contour_major_multiple, contour_minor_interval);
	}
	
	this.get_delaunay_data = function() {
		var vertices = this.get_top_view_vertices().slice(0);
		// sort the vertices by point_id first (surveyors should sight them in order)
		vertices.sort(function(a, b) {
			return a.data.point_id - b.data.point_id;
		});
		// reset list of breaklines
		data["breaklines"] = {};
		var breakline_edges = [];
		console.log("Finding breaklines");
		for (v = 0; v < vertices.length; v++) {
			// console.log("copoints", v, vertices[v].copoints_2d);
			// check if this vertex should be part of a breakline
			for (var cp=0; cp<vertices[v].copoints_2d.length; cp++) {
				// console.log(vertices[v].copoints_2d[cp].data.index);
				// console.log(vertices[v].copoints_2d[cp].data.code);
				// console.log(doncode_data.breakline_codes.indexOf(vertices[v].copoints_2d[cp].data.code));
				if (vertices[v].copoints_2d[cp].data.index && doncode_data.breakline_codes.indexOf(vertices[v].copoints_2d[cp].data.code) != -1) {
					// console.log("Found breakline point:", vertices[v].data.line_number, vertices[v].data.index);
					var stridx = vertices[v].copoints_2d[cp].data.index;
					var code = vertices[v].copoints_2d[cp].data.code;
					if (!data["breaklines"][stridx]) {
						data["breaklines"][stridx] = [];
					}
					// add the vertex we found to this breakline
					data["breaklines"][stridx].push(vertices[v]);
					// console.log("added vertex", vertices[v].data.line_number, "to delaunay breakline", stridx);
				}
			}
		}
		// detect intersecting breaklines and break them in half
		var split_points = [];
		// string representation we'll use to check if we already added one
		var split_points_check = {};
		// any new delaunay-only vertices we create
		var new_vertices = [];
		console.log("Finding breakline intersections");
		// loop through every breakline string
		for (var stridx in data["breaklines"]) {
			// loop through each segment of the string
			if (data["breaklines"][stridx].length > 1) {
				for (var e=0; e<data["breaklines"][stridx].length-1; e++) {
					// inner loop through the breakline segments again to compare each
					for (var stridx_inner in data["breaklines"]) {
						if (data["breaklines"][stridx_inner].length > 1) {
							for (var ei=0; ei<data["breaklines"][stridx_inner].length-1; ei++) {
								// test from delaunay.js to see if segments intersect
								var s1 = [data["breaklines"][stridx][e], data["breaklines"][stridx][e+1]];
								var s2 = [data["breaklines"][stridx_inner][ei], data["breaklines"][stridx_inner][ei+1]];
								var intersection = lines_intersect_2d(
									s1[0],
									s1[1],
									s2[0],
									s2[1]
								);
								// if there is an intersection, insert a new point into both stringlines
								if (intersection) {
									if (s1.indexOf(s2[0]) == -1 && s1.indexOf(s2[1]) == -1) {
										console.log("Detected breakline intersection:", s1, s2);
										//console.log("Detected breakline intersection:");
										//console.log(stridx, stridx_inner, data["breaklines"][stridx][e],
										//	data["breaklines"][stridx][e+1],
										//	data["breaklines"][stridx_inner][ei],
										//	data["breaklines"][stridx_inner][ei+1]);
										// the new fake vertex we will add
										// TODO - get the correct z value here
										s1[0].discard = true;
										s1[1].discard = true;
										s2[0].discard = true;
										s2[1].discard = true;
										var delaunay_only_vertex = [intersection[0], null, intersection[1]];
										delaunay_only_vertex.x = intersection[0];
										delaunay_only_vertex.y = intersection[1];
										delaunay_only_vertex.delaunay_only = true;
										delaunay_only_vertex.vertex = delaunay_only_vertex;
										// what we want to add
										var adds = [
											[e+1, stridx, delaunay_only_vertex, s1[0]],
											[ei+1, stridx_inner, delaunay_only_vertex, s2[0]]
										];
										var did_add = false;
										for (var a=0; a<adds.length; a++) {
											//console.log(intersection);
											var add_key = adds[a].join("-");
											if (!split_points_check[add_key]) {
												console.log("Adding new point: ", add_key, adds);
												split_points.push(adds[a]);
												split_points_check[add_key] = true;
												did_add = true;
											}
										}
										// if we added an intersection, make sure we store the point too
										if (did_add) {
											new_vertices.push(delaunay_only_vertex);
										}
									} else {
										console.log("Intersecting breaklines contain eachother.");
									}
								}
							}
						}
					}
				}
			}
		}
		/*// add the new delaunay vertices we created
		for (var v=0; v<new_vertices.length; v++) {
			// add our new point to the 2d vertex data
			new_vertices[v].id = vertices.length;
			vertices.push(new_vertices[v]);
			console.log("new delaunay-only vertex:", new_vertices[v]);
		}
		// sort the breakline insertions by reverse-index (so they get added to the end of the stringline first)
		split_points.sort(function(a, b) {
			return b[0] - a[0];
		});
		// go through adding any split points we found to the respective breakline edge
		for (var s=0; s<split_points.length; s++) {
			console.log("split point at:", split_points[s]);
			// add our new point to the 
			data["breaklines"][split_points[s][1]].splice(split_points[s][0], 0, split_points[s][2]);
		}*/
		// create breakline edges from each breakline
		for (var stridx in data["breaklines"]) {
			if (data["breaklines"][stridx].length > 1) {
				for (var e=0; e<data["breaklines"][stridx].length-1; e++) {
					if (!(data["breaklines"][stridx][e].discard && data["breaklines"][stridx][e+1].discard)) {
						breakline_edges.push([data["breaklines"][stridx][e], data["breaklines"][stridx][e+1]]);
					}
				}
			}
		}
		var breakline_dups = [];
		// final check to make sure we haven't added duplicate breakline edges
		for (var bk0=0; bk0<breakline_edges.length; bk0++) {
			for (var bk1=0; bk1<breakline_edges.length; bk1++) {
				if (bk0 != bk1) {
					if (breakline_edges[bk0][0] == breakline_edges[bk1][0] && breakline_edges[bk0][1] == breakline_edges[bk1][1]) {
						breakline_dups.push(bk1);
						console.log("Duplicate breakline edge found A");
					}
					if (breakline_edges[bk0][0] == breakline_edges[bk1][1] && breakline_edges[bk0][1] == breakline_edges[bk1][0]) {
						breakline_dups.push(bk1);
						console.log("Duplicate breakline edge found B");
					}
				}
			}
		}
		for (var b=0; b<breakline_dups.length; b++) {
			breakline_edges.splice(breakline_dups[b], 1);
		}
		console.log("breakline_edges", breakline_edges);
		return {"vertices": vertices, "edges": breakline_edges};
	}
	
	// return the retaining walls
	this.get_retaining_walls = function() {
		if (!data["retaining_walls"]) {
			data.retaining_walls = this._find_retaining_walls(vertices);
		}
		return data.retaining_walls
	}
	
	// return the boundary marker for this site
	this.get_boundary_marker = function() {
		if (point_list['BM']) {
			data.boundary_marker = point_list['BM'][0];
		} else {
			data.boundary_marker = [0, 0, 0];
		}
		return data.boundary_marker;
	}
	
	// returns a list of all breaklines
	this.get_breaklines = function() {
		return data.breaklines;
	}
	
	// returns a list of contour lines
	this.get_contour_lines = function(callback, recompute) {
		if (!data["contour_lines"] || recompute) {
			var triangles_requiring_contours = [];
			var triangles = this.get_triangles();
			
			// loop through the triangles excluding ones that shouldn't be computed for contours
			for(var t=0;t<triangles.length;t++) {
				var tri = triangles[t];
				// make sure this triangle is one that should be included in the generation of contours
				if (!tri.manually_deleted) {
					triangles_requiring_contours.push(tri);
				}
				// TODO: use the 3d prism model of retaining walls to calculate when an edge/face is intersecting the wall and exclude it here
			}
			
			data.contour_lines = contour_extract_lines(triangles_requiring_contours, this.get_bounding_box(), contour_minor_interval, contour_major_multiple, this.get_boundary_marker_interval());
		}
		if (callback) {
			callback(data.contour_lines);
		}
		return data.contour_lines;
	}
	
	// returns contour lines smoothed
	this.get_smoothed_contour_lines = function(callback) {
		this.get_contour_lines(function(contour_lines) {
			var buckets = contour_make_buckets(contour_lines, contour_minor_interval);
			var pc = new Parallel(buckets, {"synchronous": false, "evalPath": "js/lib/parallel.js/lib/eval.js"});
			pc.require("/js/contour.js");
			pc.map(function (b) {
				if (b.contour_levels != null && b.level != null) {
					return contour_auto_segment_line(b.contour_levels, b.contour_buckets, b.minor_interval, b.level);
				}
			}).then(function(results) {
				if (results) {
					var segmented_contours = [];
					for (var r=0; r<results.length; r++) {
						for (var l=0; l<results[r].length; l++) {
							segmented_contours.push(results[r][l]);
						}
					}
					// console.log(segmented_contours);
					console.log("Contour segmentation successful");
					// use a copy of the data
					var p = new Parallel(segmented_contours, {"synchronous": false});
					p.require(catmull_rom_spline);
					p.map(function (contour) {
						var line = [];
						var spline_out = [];
						for (var p=0; p<contour.vertices.length; p++) {
							line.push({"X": contour.vertices[p][0], "Y": contour.vertices[p][2], "data": contour.vertices[p]});
						}
						//console.log('done smoothing', c);
						//console.log(line);
						// now compute the spline interpolation of it
						var spline = catmull_rom_spline().interpolate(line, contour.min_distance, "centripetal");
						//var spline = line;
						//console.log('done splining');
						for (var p=0; p<spline.length; p++) {
							spline_out.push([spline[p].X, spline[p]["data"][1], spline[p].Y]);
						}
						//console.log('done thing');
						return {"vertices": spline_out, "level": contour["level"], "type": contour["type"]};
					}).then(function (contour_splines) {
						console.log("Finished splining contours.");
						// console.log(contour_splines);
						data.contour_splines = contour_splines;
						callback(contour_splines);
					});
				} else {
					// fake response as we have no contours
					data.contour_splines = data.contour_lines;
					callback(data.contour_lines);
				}
			});
		});
	}
	
	// returns the boundary marker's interval in 
	this.get_boundary_marker_interval = function() {
		return Math.round(Math.round(this.get_boundary_marker()[1]) / contour_minor_interval);
	}
	
	// the name of the current file being processed
	this.get_filename = function() {
		return filename;
	}
	
	// get the entire dataset of the psufile
	this.get_data = function() {
		return data;
	}
	
	// return the JSON representation of this psufile
	this.get_json = function() {
		return JSON.stringify(this.get_data());
	}
	
	// point data in a format that the DXF reader can read
	function exportable_vertex(v) {
		return {"point": v, "code": v.code, "doncode": v.doncode, "id": v.id, "data": v.data}
	}
	
	// use a donecode set to calculate object positions etc.
	this.use_doncodes = function(incoming_doncodes) {
		var vertices = this.get_vertices().slice(0);
		doncode_data = incoming_doncodes;
		console.log("doncodes:", doncode_data);
		// set up container objects in the datastructure that gets sent to the server
		data["objects_2d"] = [];
		data["trees"] = [];
		// loop through every vertex
		for (v = 0; v < vertices.length; v++) {
			// console.log(vertices[v].code, vertices[v]);
			// attach this vertex's doncode to it
			vertices[v].doncode = this._doncode_lookup(doncode_data.doncodes, vertices[v].code);
			// check if this vertex needs an object drawn on it (object)
			if (vertices[v].data.extensions.object.indexOf(vertices[v].code) != -1) {
				// console.log(vertices[v].code, vertices[v].doncode["Object Draw Type"], vertices[v].doncode, vertices[v]);
				// if the doncode says to add a drawing for this object
				if (vertices[v].doncode["Object Draw Type"] == "Object Placement on Point" ||
					// if the doncode says to add a drawing for this object if it's not on a stringline
					(vertices[v].doncode["Object Draw Type"] == "Object Placement on Point if Points =1" && vertices[v].data.index == null)) {
					// add the object to our list of 2d objects
					data["objects_2d"].push(exportable_vertex(vertices[v]));
				}
			}
			if (vertices[v]["code"] == "TR") {
				var td = vertices[v].data["tree_details"] = {};
				var detail_string = vertices[v].data["comment"];
				// find each part of the detail string we are looking for with regular expressions
				for (var r in re_tree_data) {
					var found = re_tree_data[r].exec(detail_string);
					if (found) {
						// store the matching string
						td[r] = found[1];
						// lop off what we found and continue searching
						detail_string = detail_string.substring(found[0].length);
					}
				}
				// if there is anything left it is the species/note
				if (detail_string) {
					td["note"] = detail_string;
				}
				// re_tree_details.exec(vertices[v].data["comment"]).slice(1);
				// console.log(vertices[v].data);
				data["trees"].push(vertices[v].data);
			}
		}
		console.log("objects_2d", data["objects_2d"]);
		console.log("trees", data["trees"]);
	}
	
	// get the arrays of stringlines
	this.get_stringlines = function() {
		var vertices = this.get_vertices().slice(0);
		// sort the vertices by stringline by point_id first (surveyors should sight them in order)
		vertices.sort(function(a, b) {
			return a.data.point_id - b.data.point_id;
		});
		if (!data["stringlines"]) {
			data["stringlines"] = {};
			// var new_id_count = vertices.length;
			var new_string_vertices = [];
			// any new string-only vertices that arise
			for (var v = 0; v < vertices.length; v++) {
				// check if this vertex should be part of a stringline
				if (vertices[v].data.index) {
					var stridx = vertices[v].data.index;
					// make sure we know about this bieng a breakline
					if (doncode_data.breakline_codes.indexOf(vertices[v].data.code) != -1) {
						data["breaklines"][stridx] = [];
					}
					var code = vertices[v].data.code;
					if (!data["stringlines"][stridx]) {
						data["stringlines"][stridx] = [];
					}
					// use the previous point's layer if the RC is a code
					if (code == "RC" && data["stringlines"][stridx].length >= 1) {
						var prev = data["stringlines"][stridx][data["stringlines"][stridx].length - 1];
						vertices[v].data.force_point_layer = {"code": prev.code, "doncode": prev.doncode};
					}
					// add the vertex we found to this stringline
					data["stringlines"][stridx].push(exportable_vertex(vertices[v]));
					// if the current point is an LC then close off the shape
					if (code == "LC" || vertices[v].data.extensions.function.indexOf("LC") != -1) {
						if (data["stringlines"][stridx].length > 3) {
							data["stringlines"][stridx].push(data["stringlines"][stridx][0]);
						} else {
							// TODO: log this for the user
						}
					}
					// if the current point is an RC
 					if (code == "RC" || vertices[v].data.extensions.function.indexOf("RC") != -1) {
						if (data["stringlines"][stridx].length == 4) {
							// if we have all points just do the LC equivalent
							data["stringlines"][stridx].push(data["stringlines"][stridx][0]);
						} else if (data["stringlines"][stridx].length == 3) {
							// if we only have three points then create a new one at the corner
							// vector from the second point back to the first point
							var p = data["stringlines"][stridx];
							console.log(p, p[0], p[1], p[2]);
							var fake_string_vector = [p[2].point[0] + (p[0].point[0] - p[1].point[0]), p[2].point[1] + (p[0].point[1] - p[1].point[1]), p[2].point[2] + (p[0].point[2] - p[1].point[2])];
							fake_string_vector.id = p[2].id;
							fake_string_vector.data = p[2].data;
							fake_string_vector.doncode = p[2].doncode;
							fake_string_vector.code = p[2].code;
							// create a fake vertex for the DXF
							var fake_string_vertex = {};
							for (var d in p[2].data) {
								fake_string_vertex[d] = p[2].data[d];
							}
							fake_string_vertex["position"] = fake_string_vector;
							data["stringlines"][stridx].push(exportable_vertex(fake_string_vector));
							new_string_vertices.push(fake_string_vertex);
							// close the loop back to the first point
							data["stringlines"][stridx].push(data["stringlines"][stridx][0]);
						} else {
							// TODO: log this for the user
						}
					}
				}
			}
			// add our new fake points to the point list for the DXF render
			for (var v=0; v<new_string_vertices.length; v++) {
				console.log("adding fake string vert:", new_string_vertices[v]);
				// vertices.push(new_string_vertices[v]);
				data.p.push(new_string_vertices[v]);
			}
		}
		return data["stringlines"];
	}
	
	// get a list of 2d objects to be overlayed
	this.get_objects_2d = function() {
		console.log("objects_2d", data["objects_2d"]);
		return data["objects_2d"];
	}

	// converts a survey data point (which has angle, angle of elevation / zenith, distance to point, and pole height)
	// into a 3d vector
	function vector_from_survey_point(point) {
		var angle = typeof(point.marker_angle) == "string" ? convert_arc_to_degrees(point.marker_angle) : point.marker_angle;
		var vert_angle = typeof(point.marker_slope) == "string" ? convert_arc_to_degrees(point.marker_slope) : point.marker_slope;
		var distance = point.marker_distance;
		var pole_height = point.pole_height;
		var user_id = point.user_id;
		var day_id = point.day_id;
		var station = station_by_name[day_id][user_by_id[day_id][user_id]["station_name"]];
		// var offset = station_reference_offset[day_id][user_by_id[day_id][user_id]["station_name"]];
		var elevate = user_by_id[day_id][user_id].station_height + station.height;
		var y = distance * Math.cos(vert_angle * to_radians) - pole_height + elevate + (settings.job["ahd_offset"] || 0);
		var m = distance * Math.sin(vert_angle * to_radians);
		var x = m * Math.cos(angle * to_radians) + station.y;
		var z = m * Math.sin(angle * to_radians) + station.x;
		// elevation rounding
		return [x, y, z];
	}
	
	this.crunch_data = function() {
		// now run through the data we have been passed and convert it to vectors with relevant data
		for (var p=0; p<data.p.length; p++) {
			// if we haven't seen this symbol before, create a new array to hold the point list
			if (!point_list[data.p[p].code]) {
				point_list[data.p[p].code] = [];
			}
			// now we should calculate the point's actual position relative to the survey tool and add it
			var raw_vector = vector_from_survey_point(data.p[p]);
                        // check for NaNs
                        for (var i=0; i<3; i++) {
                          if (isNaN(raw_vector[i])) {
                            // reset a NaN to first point so it's in the right approximate range.
                            if (p == 0) {
                              raw_vector[i] = 0;
                            } else {
                              raw_vector[i] = data.p[0].position[i];
                            }
                            // mark it as no-plot so it doesn't get included
                            if (!data.p[p].extensions["function"]) {
                              data.p[p].extensions["function"] = [];
                            }
                            data.p[p].extensions["function"].push("NP");
                          }
                        }
			// tell the vertex what code/classification it belongs to
			raw_vector.code = data.p[p].code;
			// tell the vertex its position in the array
			raw_vector.id = p;
			// link the original data to the vertex
			raw_vector.data = data.p[p];
			// add this vector to it's correct point list
			point_list[raw_vector.code].push(raw_vector);
			// also add this vector to the raw list of vertices we know about
			vertices.push(raw_vector);
			// also set the actual position on the original point
			data.p[p].position = raw_vector;
			// update our bounding box if the point is in the mesh
			if (in_mesh(raw_vector)) {
				update_bounding_box(raw_vector);
			}
			// check if this is a station reference point
			for (var s=0; s<data.s.length; s++) {
				// if this station has a reference point and it's this point then use it
				if (data.s[s]["reference_point_id"] && data.s[s]["reference_point_id"] == data.p[p]["point_id"] && data.p[p]["day_id"] == data.s[s]["day_id"]) {
					console.log("STATION REFERENCE:", data.p[p]["point_id"], data.p[p]["day_id"], data.p[p]);
					// console.log("SHIFT: reference_point_id", data.p[p]["day_id"], data.s[s]["day_id"]);
					//data.s[s].position = raw_vector;
					var offset = [raw_vector[0] - data.s[s].y, raw_vector[1] - data.s[s].height, raw_vector[2] - data.s[s].x];
					station_reference_offset[data.s[s]["day_id"]][data.s[s].station_name] = offset;
					console.log(offset);
					// clobber the actual reference point onto the right spot as specified
					//raw_vector[0] = data.s[s].y;
					//raw_vector[1] = data.s[s].height;
					//raw_vector[2] = data.s[s].x;
				}
				// use the last shot from the previous station if it's a station reference shot
				if (!data.s[s]["reference_point_id"] && data.s[s]["last_first_point_id"] && data.s[s]["last_first_point_id"] == data.p[p]["point_id"] && data.p[p]["day_id"] == data.s[s]["last_first_point_day_id"]) {
					console.log("STATION REFERENCE (first-last):", data.p[p]["point_id"], data.p[p]["day_id"], data.p[p]);
					var offset = [raw_vector[0] - data.s[s].y, raw_vector[1] - data.s[s].height, raw_vector[2] - data.s[s].x];
					station_reference_offset[data.s[s].day_id][data.s[s].station_name] = offset;
					console.log(offset);
					// data.s[s].position = raw_vector;
					// station_reference_offset[data.s[s].station_name] = raw_vector;
					//raw_vector[0] = data.s[s].y;
					//raw_vector[1] = data.s[s].height;
					//raw_vector[2] = data.s[s].x;
				}
			}
		}
		console.log("Site data:");
		console.log(data);
	}
}
