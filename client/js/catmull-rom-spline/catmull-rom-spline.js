// Catmull-Rom Spline - http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf
// Javascript implementation converted from the Java implementation here:
//
// http://stackoverflow.com/questions/9489736/catmull-rom-curve-with-no-cusps-and-no-self-intersections/19283471#19283471

/**
	@namespace
*/
function catmull_rom_spline() {
	/**
	 * This method will calculate the Catmull-Rom interpolation curve, returning
	 * it as a list of Coord coordinate objects.  This method in particular
	 * adds the first and last control points which are not visible, but required
	 * for calculating the spline.
	 *
	 * @param coordinates The list of original straight line points to calculate
	 * an interpolation from.
	 * @param maxSegmentLength How long to make each segment.
	 * @return The list of interpolated coordinates.
	 * @param curveType Chordal (stiff), Uniform(floppy), or Centripetal(medium)
	 */
	this.interpolate = function(coordinates, maxSegmentLength, curveType) {
		var vertices = [];
		for (var c=0; c<coordinates.length; c++) {
			vertices.push({"X": coordinates[c].X, "Y": coordinates[c].Y, "data": coordinates[c]["data"]});
		}
		
		// Cannot interpolate curves given only two points.  Two points
		// is best represented as a simple line segment.
		if (vertices.length < 3) {
			return vertices;
		}
		
		// Test whether the shape is open or closed by checking to see if
		// the first point intersects with the last point.  M and Z are ignored.
		var isClosed = vertices[0].X == vertices[vertices.length - 1].X && vertices[0].Y == vertices[vertices.length - 1].Y;
		if (isClosed) {
			// Use the second and second from last points as control points.
			// get the second point.
			var p2 = {"X": vertices[1].X, "Y": vertices[1].Y, "data": vertices[1]["data"]};
			// get the point before the last point
			var pn1 = {"X": vertices[vertices.length - 2].X, "Y": vertices[vertices.length - 2].Y, "data": vertices[vertices.length - 2]["data"]};
			
			// insert the second from the last point as the first point in the list
			// because when the shape is closed it keeps wrapping around to
			// the second point.
			vertices.unshift(pn1);
			// add the second point to the end.
			vertices.push(p2);
		} else {
			// The shape is open, so use control points that simply extend
			// the first and last segments
			
			// Get the change in x and y between the first and second coordinates.
			var dx = vertices[1].X - vertices[0].X;
			var dy = vertices[1].Y - vertices[0].Y;
			
			// Then using the change, extrapolate backwards to find a control point.
			var x1 = vertices[0].X - dx;
			var y1 = vertices[0].Y - dy;
			
			// Actaully create the start point from the extrapolated values.
			var start = {"X": x1, "Y": y1, "data": vertices[0]["data"]};
			
			// Repeat for the end control point.
			var n = vertices.length - 1;
			dx = vertices[n].X - vertices[n - 1].X;
			dy = vertices[n].Y - vertices[n - 1].Y;
			var xn = vertices[n].X + dx;
			var yn = vertices[n].Y + dy;
			var end = {"X": xn, "Y": yn, "data": vertices[n]["data"]};

			// insert the start control point at the start of the vertices list.
			vertices.unshift(start);

			// append the end control ponit to the end of the vertices list.
			vertices.push(end);
		}

		// Dimension a result list of coordinates. 
		var result = [];
		// When looping, remember that each cycle requires 4 points, starting
		// with i and ending with i+3.  So we don't loop through all the points.
		for (var i = 0; i < vertices.length - 3; i++) {
			//console.log("catmull:", vertices[i]);
			//console.log(pointsPerSegment, curveType);
			// Actually calculate the Catmull-Rom curve for one segment.
			var pointsPerSegment = Math.round(distance(vertices[i+1], vertices[i+2]) / maxSegmentLength);
			var points = this.interpolate_points_at(vertices, i, pointsPerSegment, curveType);
			//console.log("catmull: points_at done");
			// Since the middle points are added twice, once for each bordering
			// segment, we only add the 0 index result point for the first
			// segment.  Otherwise we will have duplicate points.
			if (result.length > 0) {
				points.shift();
			}
			//console.log("catmull point:", points.length);
			// Add the coordinates for the segment to the result list.
			for (var p=0; p<points.length; p++) {
				result.push(points[p]);
			}
		}
		//console.log('catmull: done');
		return result;
	}

	/**
	 * Given a list of control points, this will create a list of pointsPerSegment
	 * points spaced uniformly along the resulting Catmull-Rom curve.
	 *
	 * @param points The list of control points, leading and ending with a coordinate that is only used for controlling the spline and is not visualized.
	 * @param index The index of control point p0, where p0, p1, p2, and p3 are used in order to create a curve between p1 and p2.
	 * @param pointsPerSegment The total number of uniformly spaced interpolated points to calculate for each segment. The larger this number, the smoother the resulting curve.
	 * @param curveType Clarifies whether the curve should use uniform, chordal or centripetal curve types. Uniform can produce loops, chordal can produce large distortions from the original lines, and centripetal is an
	 * optimal balance without spaces.
	 * @return the list of coordinates that define the CatmullRom curve
	 * between the points defined by index+1 and index+2.
	 */
	this.interpolate_points_at = function(points, index, pointsPerSegment, curveType) {
		//console.log("segment: start");
		
		var result = [];
		var x = [];
		var y = [];
		var time = [];
		for (var i = 0; i < 4; i++) {
			//console.log("segment: loop", i, index, points[index + i]);
			x[i] = points[index + i].X;
			//console.log("segment: loop X", i);
			y[i] = points[index + i].Y;
			//console.log("segment: loop Y", i);
			time[i] = i;
			//console.log("segment: loop done", i);
		}
		
		//console.log("segment: enter");
		
		var tstart = 1;
		var tend = 2;
		if (curveType != "uniform") {
			var total = 0;
			for (var i = 1; i < 4; i++) {
				var dx = x[i] - x[i - 1];
				var dy = y[i] - y[i - 1];
				if (curveType == "centripetal") {
					total += Math.pow(dx * dx + dy * dy, .25);
				} else {
					total += Math.pow(dx * dx + dy * dy, .5);
				}
				time[i] = total;
			}
			tstart = time[1];
			tend = time[2];
		}
		var segments = pointsPerSegment - 1;
		result.push(points[index + 1]);
		for (var i = 1; i < segments; i++) {
			//console.log("segment:", i, segments);
			var xi = this.interpolate_two_points(x, time, tstart + (i * (tend - tstart)) / segments);
			var yi = this.interpolate_two_points(y, time, tstart + (i * (tend - tstart)) / segments);
			result.push({"X": xi, "Y": yi, "data": points[index + 1]["data"]});
		}
		result.push(points[index + 2]);
		return result;
	},

	/**
	 * Unlike the other implementation here, which uses the default "uniform"
	 * treatment of t, this computation is used to calculate the same values but
	 * introduces the ability to "parameterize" the t values used in the
	 * calculation. This is based on Figure 3 from
	 * http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf
	 *
	 * @param p array of double values of length 4 - interpolation occurs from [x1,y1,x2,y2].
	 * @param time array of time measures of length 4, corresponding to each p value.
	 * @param t the actual interpolation ratio from 0 to 1 representing the position between p1 and p2 to interpolate the value.
	 */
	this.interpolate_two_points = function(p, time, t) {
		var L01 = p[0] * (time[1] - t) / (time[1] - time[0]) + p[1] * (t - time[0]) / (time[1] - time[0]);
		var L12 = p[1] * (time[2] - t) / (time[2] - time[1]) + p[2] * (t - time[1]) / (time[2] - time[1]);
		var L23 = p[2] * (time[3] - t) / (time[3] - time[2]) + p[3] * (t - time[2]) / (time[3] - time[2]);
		var L012 = L01 * (time[2] - t) / (time[2] - time[0]) + L12 * (t - time[0]) / (time[2] - time[0]);
		var L123 = L12 * (time[3] - t) / (time[3] - time[1]) + L23 * (t - time[1]) / (time[3] - time[1]);
		return L012 * (time[2] - t) / (time[2] - time[1]) + L123 * (t - time[1]) / (time[2] - time[1]); //C12
	}
	
	// calculate distance between two vectors
	function distance(v1, v2) {
		return Math.sqrt(Math.pow(v2.X - v1.X, 2) + Math.pow(v2.Y - v1.Y, 2));
	}
	
	return this;
};   
