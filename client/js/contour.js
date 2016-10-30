/* Compute contour lines */

_contour_PRECISION = 1e-6;

// function to extract a list of points making up lines where z intersects triangles
function contour_extract_lines(triangles, bounding_box, small_interval, large_interval_frequency, bm_interval) {
	console.log("contour_extract_lines");
	var contour_segments = {};
	var large_interval = small_interval * large_interval_frequency;
	
	// create intersection planes at intervals against the bounding box
	for (var i=Math.floor(bounding_box[1][0] / large_interval) * large_interval_frequency; i<Math.ceil(bounding_box[1][1]/small_interval); i++) {
		var segments_found = [];
		// check every triangle to see if the plane intersects any of it's edges
		for (var t=0; t<triangles.length; t++) {
			var lineseg = _contour_test_triangle_intersection(triangles[t], i * small_interval);
			// if we found a line segment that intersects this triangle push it into our contour
			// make sure the two ends of the line segment are touching (zero distance)
			if (lineseg.length == 2) {
				/*lineseg.slope = _contour_angle_from_vertical(triangles[t]);
				if (lineseg.slope > Math.PI / 2) {
					lineseg.slope = (2 * Math.PI) - (lineseg.slope + Math.PI)
				}*/
				// console.log("Triangle slope", lineseg.slope / (2 * Math.PI), lineseg.slope / (2 * Math.PI) > 0.25);
				if (_contour_points_distance(lineseg[0], lineseg[1])) {
					segments_found.push(lineseg);
				} else {
					//console.log("Zero length line segment in contour:", lineseg);
				}
			} else if (lineseg.length == 1) {
				//console.log("single point in contour line segment:", triangles[t].a.code, triangles[t].b.code, triangles[t].c.code, lineseg, triangles[t]);
			} else if (lineseg.length > 2) {
				//console.log("multiple intersections:", triangles[t].a.code, triangles[t].b.code, triangles[t].c.code, lineseg, triangles[t]);
			}
		}
		if (segments_found.length) {
			contour_segments[i] = segments_found;
		}
	}
	//console.log(contour_segments);
	// return contour_segments;
	// sort and split our line segments into blobs with lines connected end to end
	var found_contour_lines=[];
	// loop through each contour level
	for (var c in contour_segments) {
		// this is the list of line segments for this contour level
		var segments = contour_segments[c];
		// keep going until we have used up all line segments in this contour level
		while (segments.length) {
			// recursively find all segments on the current line
			var found = _contour_find_segments_on_line(segments.pop(), segments);
			segments = found[1];
			// append the line we constructed to the list of found contour lines
			found_contour_lines.push({"level": c, "vertices": found[0], "type": (c - bm_interval) % large_interval_frequency ? "minor" : "major"});
		}
	}
	// console.log(found_contour_lines);
	return found_contour_lines;
}

// puts contour lines into buckets of lines at the same level
function contour_make_buckets(contour_lines, minor_interval) {
	var buckets_for_segmenting = [];
	// store list of contours referenced by level
	contour_buckets = {};
	// list of the levels we have contours for
	contour_levels = [];
	for (var c=0; c<contour_lines.length; c++) {
		var level = contour_lines[c]["level"];
		// we have not yet encountered this level
		if (!contour_buckets[level]) {
			contour_buckets[level] = [];
			contour_levels.push(level);
		}
		contour_buckets[level].push(contour_lines[c]);
	}
	// we want to go through the levels in order
	contour_levels.sort(function(a, b) { return a - b; });
	for (var l=0; l<contour_levels.length; l++) {
		buckets_for_segmenting.push({"level": l, "contour_levels": contour_levels, "contour_buckets": contour_buckets, "minor_interval": minor_interval});
	}
	return buckets_for_segmenting;
}

// segments the contour lines so that no segment is longer than the distance to the adjacent contour (for spline smoothing)
function contour_auto_segment_line(contour_levels, contour_buckets, min_distance, l) {
	var new_contours = [];
	// loop through each line at this level
	var level = contour_levels[l];
	var level_prev = contour_levels[l-1];
	var level_next = contour_levels[l+1];
	for (var b=0; b<contour_buckets[level].length; b++) {
		var line = contour_buckets[level][b]["vertices"].slice(0);
		// find all segments on adjacent height contours and add them to the test list
		var adjacent_segments = [];
		// if there is a previous contour
		if (level_prev) {
			// loop through the lines on the previous contour
			for (var x=0; x<contour_buckets[level_prev].length; x++) {
				var adjacent_line = contour_buckets[level_prev][x]["vertices"];
				for (var c=0; c<adjacent_line.length-1; c++) {
					adjacent_segments.push([adjacent_line[c],adjacent_line[c+1]]);
				}
			}
		}
		// if there is a next contour
		if (level_next) {
			// loop through the lines on the previous contour
			for (var x=0; x<contour_buckets[level_next].length; x++) {
				var adjacent_line = contour_buckets[level_next][x]["vertices"];
				for (var c=0; c<adjacent_line.length-1; c++) {
					adjacent_segments.push([adjacent_line[c],adjacent_line[c+1]]);
				}
			}
		}
		// now check each segment of ourline to make sure it's shorter than the distance to any adjacent segment
		_contour_enforce_minimum_segment_length(line, adjacent_segments, min_distance);
		// add it to our output
		var result = {};
		// copy all the properties of the original contour line
		for (var r in contour_buckets[level][b]) {
			result[r] = contour_buckets[level][b][r];
		}
		result["vertices"] = line;
		result["min_distance"] = min_distance;
		new_contours.push(result);
		//console.log("before:", contour_buckets[level][b]);
		//console.log("after:", result);
	}
	return new_contours;
}

// recursively find all segments that match either end of a particular line
function _contour_find_segments_on_line(line, segments) {
	// take a copy that we will modify
	var line_copy = line.slice(0);
	var segments_copy = segments.slice(0);
	// loop through the remaining contour segments on this level
	for (var s=0; s<segments.length; s++) {
		// console.log("testing segment:", s);
		// check each point of each line segment
		for (var p=0; p<2; p++) {
			// check each end of our current line - making sure the segment isn't already known
			for (var e=0; e<2; e++) {
				// if the distance between the points is zero we have found a linesegment with a matching point
				if (_contour_points_distance(line[e * (line.length - 1)], segments[s][p]) < _contour_PRECISION) {
					// insert the other (non-matching) end of the contour linesegment onto the current end of our line
					line_copy.splice(line_copy.length * e, 0, segments[s][(!p) * 1]);
					segments_copy.splice(segments_copy.indexOf(segments[s]), 1);
					// create a new version of the line and the segment array to narrow down the search space recursively
					return _contour_find_segments_on_line(line_copy, segments_copy);
				}
			}
		}
	}
	return [line_copy, segments_copy];
}

// distance between two points [x1,y1,z1] [x2, y2, z2]
function _contour_points_distance(a, b) {
	return Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2) + Math.pow(b[2] - a[2], 2));
}

// tests whether a point is in a line already
function _contour_point_in_line_already(newpoint, points) {
	for (var p=0; p<points.length; p++) {
		if (_contour_points_distance(points[p], newpoint) < _contour_PRECISION) {
			return true;
		}
	}
}

var edges = ["a", "b", "c"];
// internal function to test the intersection between a triangle and a plane
function _contour_test_triangle_intersection(t, p) {
	// we'll store the points of our final line segment in here
	var points = [];
	// loop through the edges of the triangle
	for (var s=0; s<3; s++) {
		var line = [
			t[edges[s]].vertex,
			t[edges[(s + 1) % 3]].vertex
		];
		// make sure the lowest point is first
		line.sort(function(a, b) {return a[1] - b[1]});
		// now figure out how far into this triangle edge the horizontal plane is penetrating
		var percent = (p - line[0][1]) / (line[1][1] - line[0][1]);
		/*if (t[edges[s]].code == "SM" || t[edges[(s + 1) % 3]].code == "SM") {
			console.log([t[edges[s]].code, t[edges[(s + 1) % 3]].code], percent);
		}*/
		if (percent >= 0 && percent <= 1) {
			// if it's penetrating, push our line segment on there
			var newpoint = [
				line[0][0] + (line[1][0] - line[0][0]) * percent,
				p,
				line[0][2] + (line[1][2] - line[0][2]) * percent
			]
			// do a safety check to see if this point is in the line already
			if (!_contour_point_in_line_already(newpoint, points)) {
				points.push(newpoint);
				/*if (t[edges[s]].code == "SM" || t[edges[(s + 1) % 3]].code == "SM") {
					console.log("added this point to the line segment");
				}*/
			} else {
				//console.log('not adding duplicate point to contour line segment', newpoint);
			}
		}
	}
	return points;
}

// internal function to calculate a triangle's normal
function _contour_triangle_normal(t) {
	// cross(b - a, c - a)
	var a = t["a"].vertex;
	var b = t["b"].vertex;
	var c = t["c"].vertex;
	var Vx = b[0] - a[0];
	var Vy = b[1] - a[1];
	var Vz = b[2] - a[2];
	var Wx = c[0] - a[0];
	var Wy = c[1] - a[1];
	var Wz = c[2] - a[2];
	var Nx = (Vy * Wz) - (Vz * Wy)
	var Ny = (Vz * Wx) - (Vx * Wz)
	var Nz = (Vx * Wy) - (Vy * Wx)
	return [Nx, Ny, Nz];
}

// internal function to calculate the angle the triangle's normal makes to the vertical
function _contour_angle_from_vertical(t) {
	// cos(x) = a.b / |a||b|
	var normal = _contour_triangle_normal(t);
	return Math.acos(_contour_dot_product(normal, [0.0, 1.0, 0.0]) / _contour_vector_magnitude(normal));
}

function _contour_dot_product(v1, v2) {
	return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

function _contour_vector_magnitude(v) {
	return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2) + Math.pow(v[2], 2));
}

function _contour_vector_subtraction(v1, v2) {
	return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

function _contour_vector_addition(v1, v2) {
	return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

function _contour_vector_scalar_multiply(v1, x) {
	return [v1[0] * x, v1[1] * x, v1[2] * x];
}

function _contour_vector_scalar_norm(v1) {
	return Math.sqrt(_contour_dot_product(v1, v1));
}

// find the closest distance between two line segments
// converted from the c++ implementation here:
// http://geomalgorithms.com/a07-_distance.html#dist3D_Segment_to_Segment
function _contour_segment_shortest_distance(s1, s2) {
	var u = _contour_vector_subtraction(s1[1], s1[0]);
	var v = _contour_vector_subtraction(s2[1], s2[0]);
	var w = _contour_vector_subtraction(s1[0], s2[0]);

	var a = _contour_dot_product(u, u);		 // always >= 0
	var b = _contour_dot_product(u, v);
	var c = _contour_dot_product(v, v);		 // always >= 0
	var d = _contour_dot_product(u, w);
	var e = _contour_dot_product(v, w);

	var D = a*c - b*b;		// always >= 0
	var sc, sN, sD = D;	   // sc = sN / sD, default sD = D >= 0
	var tc, tN, tD = D;	   // tc = tN / tD, default tD = D >= 0

	// compute the line parameters of the two closest points
	if (D < _contour_PRECISION) { // the lines are almost parallel
		sN = 0.0;		 // force using point P0 on segment S1
		sD = 1.0;		 // to prevent possible division by 0.0 later
		tN = e;
		tD = c;
	} else {				 // get the closest points on the infinite lines
		sN = (b*e - c*d);
		tN = (a*e - b*d);
		if (sN < 0.0) {		// sc < 0 => the s=0 edge is visible
			sN = 0.0;
			tN = e;
			tD = c;
		}
		else if (sN > sD) {  // sc > 1  => the s=1 edge is visible
			sN = sD;
			tN = e + b;
			tD = c;
		}
	}

	if (tN < 0.0) {			// tc < 0 => the t=0 edge is visible
		tN = 0.0;
		// recompute sc for this edge
		if (-d < 0.0)
			sN = 0.0;
		else if (-d > a)
			sN = sD;
		else {
			sN = -d;
			sD = a;
		}
	} else if (tN > tD) {	  // tc > 1  => the t=1 edge is visible
		tN = tD;
		// recompute sc for this edge
		if ((-d + b) < 0.0)
			sN = 0;
		else if ((-d + b) > a)
			sN = sD;
		else {
			sN = (-d +  b);
			sD = a;
		}
	}
	
	// finally do the division to get sc and tc
	sc = (Math.abs(sN) < _contour_PRECISION ? 0.0 : sN / sD);
	tc = (Math.abs(tN) < _contour_PRECISION ? 0.0 : tN / tD);
	
	// get the difference of the two closest points
	var dP = _contour_vector_addition(w, _contour_vector_subtraction(_contour_vector_scalar_multiply(u, sc), _contour_vector_scalar_multiply(v, tc)));  // =  S1(sc) - S2(tc)
	
	return _contour_vector_scalar_norm(dP);   // return the closest distance
}

function _contour_insert_interpolated_point(line, index) {
	line.splice(index+1, 0, [
		(line[index][0] + line[index + 1][0]) / 2.0,
		(line[index][1] + line[index + 1][1]) / 2.0,
		(line[index][2] + line[index + 1][2]) / 2.0
	]);
	return line;
}

function _contour_segment_length(line, index) {
	return Math.sqrt(Math.pow(line[index][0] - line[index + 1][0], 2) + Math.pow(line[index][1] - line[index + 1][1], 2) + Math.pow(line[index][2] - line[index + 1][2], 2))
}

var closest_cache = {};
function _contour_distance_to_closest_segment(line, index, adjacent_segments) {
	var closest = Number.MAX_VALUE;
	var seg = [line[index], line[index+1]];
	for (var so=0; so<adjacent_segments.length; so++) {
		var shortest_distance = _contour_segment_shortest_distance(seg, adjacent_segments[so]);
		if (shortest_distance < closest) {
			closest = shortest_distance;
		}
	}
	return closest;
}

function _contour_enforce_minimum_segment_length(line, adjacent_segments, min_distance) {
	var inserted = false;
	// run through the line from the end backwards
	for (var l=line.length - 1; l>0; l--) {
		// if we don't know the distance yet, calculate it
		var distance = Math.max(min_distance, _contour_distance_to_closest_segment(line, l - 1, adjacent_segments) * 2);
		// is the length of this segment longer than the distance to the closest adjacent contour segment segment
		if (_contour_segment_length(line, l - 1) > distance) {
			_contour_insert_interpolated_point(line, l-1);
			inserted = true;
		}
	}
	if (inserted) {
		// if we inserted one run the check again as their might be more - use the cached distance
		return _contour_enforce_minimum_segment_length(line, adjacent_segments, min_distance);
	} else {
		return line;
	}
}
