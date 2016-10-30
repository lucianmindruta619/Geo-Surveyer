var pointnames = ["a", "b", "c"];

function DelaunayTriangle(a, b, c) {
	this.a = a;
	this.b = b;
	this.c = c;

	var A = b.x - a.x,
		B = b.y - a.y,
		C = c.x - a.x,
		D = c.y - a.y,
		E = A * (a.x + b.x) + B * (a.y + b.y),
		F = C * (a.x + c.x) + D * (a.y + c.y),
		G = 2 * (A * (c.y - b.y) - B * (c.x - b.x)),
		minx, miny, dx, dy;

	/* If the points of the triangle are collinear, then just find the
	 * extremes and use the midpoint as the center of the circumcircle. */
	if(Math.abs(G) < 0.000001) {
		minx = Math.min(a.x, b.x, c.x);
		miny = Math.min(a.y, b.y, c.y);
		dx = (Math.max(a.x, b.x, c.x) - minx) * 0.5;
		dy = (Math.max(a.y, b.y, c.y) - miny) * 0.5;

		this.x = minx + dx;
		this.y = miny + dy;
		this.r = dx * dx + dy * dy;
	}

	else {
		this.x = (D*E - B*F) / G;
		this.y = (A*F - C*E) / G;
		dx = this.x - a.x;
		dy = this.y - a.y;
		this.r = dx * dx + dy * dy;
	}
}

function DelaunayException(message, data) {
	this.message = message;
	if (data) {
		this.data = data;
	}
	
	this.toString = function() {
		return "DelaunayException: " + this.message;
	}
}

function delaunay_dedup(edges) {
	var j = edges.length,
			a, b, i, m, n;

	outer: while(j) {
		b = edges[--j];
		a = edges[--j];
		i = j;
		while(i) {
			n = edges[--i];
			m = edges[--i];
			if((a === m && b === n) || (a === n && b === m)) {
				edges.splice(j, 2);
				edges.splice(i, 2);
				j -= 2;
				continue outer;
			}
		}
	}
}

/****************************************
	Do the triangulation of a point cloud.
*/

function delaunay_triangulate(vertices) {
	/* Bail if there aren't enough vertices to form any triangles. */
	if(vertices.length < 3)
		return [];

	/* Ensure the vertex array is in order of descending X coordinate
	 * (which is needed to ensure a subquadratic runtime), and then find
	 * the bounding box around the points. */
	vertices.sort(function(a, b) {
		return b.x - a.x;
	});

	var i = vertices.length - 1,
		xmin = vertices[i].x,
		xmax = vertices[0].x,
		ymin = vertices[i].y,
		ymax = ymin;

	while(i--) {
		if(vertices[i].y < ymin) ymin = vertices[i].y;
		if(vertices[i].y > ymax) ymax = vertices[i].y;
	}

	/* Find a supertriangle, which is a triangle that surrounds all the
	 * vertices. This is used like something of a sentinel value to remove
	 * cases in the main algorithm, and is removed before we return any
	 * results.
	 *
	 * Once found, put it in the "open" list. (The "open" list is for
	 * triangles who may still need to be considered; the "closed" list is
	 * for triangles which do not.) */
	var dx = xmax - xmin,
			dy = ymax - ymin,
			dmax = (dx > dy) ? dx : dy,
			xmid = (xmax + xmin) * 0.5,
			ymid = (ymax + ymin) * 0.5,
			open = [
				new DelaunayTriangle(
					{x: xmid - 20 * dmax, y: ymid - dmax, __sentinel: true},
					{x: xmid, y: ymid + 20 * dmax, __sentinel: true},
					{x: xmid + 20 * dmax, y: ymid - dmax, __sentinel: true}
				)
			],
			closed = [],
			edges = [],
			j, a, b;

	/* Incrementally add each vertex to the mesh. */
	i = vertices.length;
	while(i--) {
		// give each vertex a delaunay id
		vertices[i]._delaunay_id = i;
		/* For each open triangle, check to see if the current point is
		 * inside it's circumcircle. If it is, remove the triangle and add
		 * it's edges to an edge list. */
		edges.length = 0;
		j = open.length;
		while(j--) {
			/* If this point is to the right of this triangle's circumcircle,
			 * then this triangle should never get checked again. Remove it
			 * from the open list, add it to the closed list, and skip. */
			dx = vertices[i].x - open[j].x;
			if(dx > 0 && dx * dx > open[j].r) {
				closed.push(open[j]);
				open.splice(j, 1);
				continue;
			}

			/* If not, skip this triangle. */
			dy = vertices[i].y - open[j].y
			if(dx * dx + dy * dy > open[j].r)
				continue;

			/* Remove the triangle and add it's edges to the edge list. */
			edges.push(
				open[j].a, open[j].b,
				open[j].b, open[j].c,
				open[j].c, open[j].a
			)
			open.splice(j, 1);
		}

		/* Remove any doubled edges. */
		delaunay_dedup(edges);

		/* Add a new triangle for each edge. */
		j = edges.length
		while(j) {
			b = edges[--j];
			a = edges[--j];
			open.push(new DelaunayTriangle(a, b, vertices[i]));
		}
	}

	/* Copy any remaining open triangles to the closed list, and then
	 * remove any triangles that share a vertex with the supertriangle. */
	Array.prototype.push.apply(closed, open);

	i = closed.length;
	while(i--) {
		if(closed[i].a.__sentinel ||
			closed[i].b.__sentinel ||
			closed[i].c.__sentinel) {
			closed.splice(i, 1);
		}
	}
	
	/* Yay, we're done! */
	return closed;
}

// generate edge_reference id from two points

function edge_reference(a, b) {
	var edge_index = [a._delaunay_id, b._delaunay_id];
	edge_index.sort();
	return edge_index.join(",");
}

// constructs a map of edges->triangles
function make_edge_map(triangles) {
	var edge_map = {};
	for (var t=0; t<triangles.length; t++) {
		// loop through the points of this triangle to find the edges
		for (var p=0; p<pointnames.length; p++) {
			// the two points involved in this edge
			var a = triangles[t][pointnames[p]];
			var b = triangles[t][pointnames[(p + 1) % pointnames.length]];
			// add this triangle to the edge list
			if (edge_map[edge_reference(a,b)]) {
				edge_map[edge_reference(a,b)].push(triangles[t]);
			} else {
				edge_map[edge_reference(a,b)] = [triangles[t]];
			}
		}
	}
	return edge_map;
}

function make_point_map(triangles) {
	// add this triangle to a reference list kept by each point
	for (var t=0; t<triangles.length; t++) {
		for (var p=0; p<pointnames.length; p++) {
			var v = triangles[t][pointnames[p]];
			// if there is no list yet for htis vertex then create one
			if (!v["delaunay_triangles"]) {
				v["delaunay_triangles"] = [];
			}
			// only add it if it is not yet in the list
			if (v["delaunay_triangles"].indexOf(triangles[t]) == -1) {
				v["delaunay_triangles"].push(triangles[t]);
			}
		}
	}

}

// gets the opposite triangle and vertex from the current triangle and vertex
function opposed_triangle(edge_map, triangle, vertex) {
	// loop through the points of triangle
	for (var p=0; p<pointnames.length; p++) {
		var pt = triangle[pointnames[p]];
		var ptn = triangle[pointnames[(p + 1) % pointnames.length]];
		// if vertex is not in the edge formed by point and point + 1 (opposing edge)
		if (vertex != pt && vertex != ptn) {
			// console.log("opposing:", vertex, pt, ptn);
			// loop through the triangles of the edge
			var edge_triangles = edge_map[edge_reference(pt,ptn)];
			for (var e=0; e<edge_triangles.length; e++) {
				// if the current triangle is not our original triangle it's the other
				// this is the opposing triangle we want
				if (edge_triangles[e] != triangle) {
					// loop through the points of the opposing triangle
					for (var pe=0; pe<pointnames.length; pe++) {
						var pet = edge_triangles[e][pointnames[pe]];
						// if this point's id is not in the edge we found this is the opposing vertex
						if (pet != pt && pet != ptn) {
							// return the opposing triangle and opposing vertex and shared edge
							return {"t": edge_triangles[e], "v": pet, "e": [pt, ptn]};
						}
					}
				}
			}
		}
	}
}

// turn a list of points back into triangles
//Procedure TriangulatePseudoPolygon (P:VertexList, ab:Edge, T:CDT)
function triangulate_polygon(poly, edge, triangles) {
	//console.log("triangulate_polygon", poly, edge);
	// var new_triangles = [];
	var a = edge[0];
	var b = edge[1];
	var c = 0;
	var use_tri = null;
	//If P has more than one element then
	if (poly.length > 1) {
		// c:=First vertex of P
		// For each vertex v in P do
		for (var v=0; v<poly.length; v++) {	
			// If v ∈ CircumCircle (a, b, c) then
			var new_tri = new DelaunayTriangle(a, b, poly[c]);
			if (Math.pow(_delaunay_distance(poly[v], new_tri), 2) < new_tri.r) {
				//c:=v
				c = v;
				use_tri = new DelaunayTriangle(a, b, poly[c]);
			}
			//EndIf
		}
		//EndFor
		//Divide P into PE and PD giving P=PE +c+PD
		var poly_e = poly.slice(0, c);
		var poly_d = poly.slice(c + 1);
		//TriangulatePseudoPolygon(PE , ac, T)
		triangulate_polygon(poly_e, [a, poly[c]], triangles);
		//TriangulatePseudoPolygon(PD , cd, T)
		triangulate_polygon(poly_d, [poly[c], b], triangles);
	} else if (poly.length) {
		use_tri = new DelaunayTriangle(a, b, poly[c]);
	}
	// EndIf
	//If P is not empty then
	if (use_tri) {
		// Add triangle with vertices a, b, c into T
		triangles.push(use_tri);
	} else if (poly.length) {
		var force_tri = new DelaunayTriangle(a, b, poly[c]);
		force_tri.forced = true;
		triangles.push(force_tri);
	}
	//EndIf
	return triangles;
}

// see if a vertex is a member of the triangle's points
function vertex_in_triangle(v, t) {
	for (var p=0; p<pointnames.length; p++) {
		if (t[pointnames[p]] == v) {
			return true;
		}
	}
}

// check if two lines mad up of points p1->p2 and p3->p4 intersect eachother
function lines_intersect_2d(p1, p2, p3, p4) {
	// first, sanity check that we aren't looking at actual connected points
	if (p1 == p3 || p1 == p4 || p2 == p3 || p2 == p4) {
		return false;
	}
	var x=((p1.x*p2.y-p1.y*p2.x)*(p3.x-p4.x)-(p1.x-p2.x)*(p3.x*p4.y-p3.y*p4.x))/((p1.x-p2.x)*(p3.y-p4.y)-(p1.y-p2.y)*(p3.x-p4.x));
	var y=((p1.x*p2.y-p1.y*p2.x)*(p3.y-p4.y)-(p1.y-p2.y)*(p3.x*p4.y-p3.y*p4.x))/((p1.x-p2.x)*(p3.y-p4.y)-(p1.y-p2.y)*(p3.x-p4.x));
	if (isNaN(x)||isNaN(y)) {
		return false;
	} else {
		if (p1.x>=p2.x) {
			if (!(p2.x<=x&&x<=p1.x)) {return false;}
		} else {
			if (!(p1.x<=x&&x<=p2.x)) {return false;}
		}
		if (p1.y>=p2.y) {
			if (!(p2.y<=y&&y<=p1.y)) {return false;}
		} else {
			if (!(p1.y<=y&&y<=p2.y)) {return false;}
		}
		if (p3.x>=p4.x) {
			if (!(p4.x<=x&&x<=p3.x)) {return false;}
		} else {
			if (!(p3.x<=x&&x<=p4.x)) {return false;}
		}
		if (p3.y>=p4.y) {
			if (!(p4.y<=y&&y<=p3.y)) {return false;}
		} else {
			if (!(p3.y<=y&&y<=p4.y)) {return false;}
		}
	}
	return [x, y];
}

// see which side of a line another point is (p1)
function line_side(l, p){
	var side = ((l[1].x - l[0].x)*(p.y - l[0].y) - (l[1].y - l[0].y)*(p.x - l[0].x));
	return side ? side < 0 ? -1 : 1 : 0;
}

// get the point from an edge that is on the same side as another point
function get_point_in_line_on_side(edge, line, ls) {
	for (var p=0; p<edge.length; p++) {
		if (line_side(line, edge[p]) == ls) {
			return edge[p];
		}
	}
}

// get the distance between two vertices
function _delaunay_distance(v1, v2) {
	return Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
}

/****************************************
	constrain the triangulated mesh to a set of edges the user specifies.

	Papers:
	An incremental algorithm based on edge swapping for constructing restricted Delaunay triangulations - Marc Vigo Anglada
	Constrained Delaunay Triangulation using Plane Subdivision - Vid Domiter
*/

function delaunay_constrain(vertices, constrained_edges, triangles) {
	if (!triangles) {
		triangles = delaunay_triangulate(vertices);
	}
	// first find any places where an edge touches a point and split the edge there
	var del_edges = [];
	var add_edges = [];
	for (var e=0; e<constrained_edges.length; e++) {
		var edge = constrained_edges[e];
		// test each vertex against this edge
		for (var v=0; v<vertices.length; v++) {
			// if the vertex is touching the edge
			if (vertices[v] != edge[0] && vertices[v] != edge[1] && line_side(edge, vertices[v]) == 0) {
				// add two new edges in the place of the old one
				add_edges.push([edge[0],vertices[v]]);
				add_edges.push([vertices[v], edge[1]]);
				// flag the old one for removal
				del_edges.push(edge);
			}
		}
	}
	if (del_edges.length) {
		console.log("Split edges:")
		console.log(del_edges);
		console.log(add_edges);
	}
	// remove any old split edges
	for (var d=0; d<del_edges.length; d++) {
		constrained_edges.splice(constrained_edges.indexOf(del_edges[d]), 1);
	}
	// add any new edges
	for (var d=0; d<add_edges.length; d++) {
		constrained_edges.push(add_edges[d]);
	}

	// test each edge against each other edge to see if two edges intersect eachother (illegal)
	for (var e=0; e<constrained_edges.length; e++) {
		for (var eo=0; eo<constrained_edges.length; eo++) {
			if (e != eo && constrained_edges[e].length == 2 && constrained_edges[eo].length == 2) {
				if (intersection = lines_intersect_2d(constrained_edges[e][0], constrained_edges[e][1], constrained_edges[eo][0], constrained_edges[eo][1])) {
					throw new DelaunayException("Two edges intersect eachother.", {"edges": [constrained_edges[e], constrained_edges[eo]]});
				}
				if (
					(constrained_edges[e][0] == constrained_edges[eo][0] && constrained_edges[e][1] == constrained_edges[eo][1]) ||
					(constrained_edges[e][0] == constrained_edges[eo][1] && constrained_edges[e][1] == constrained_edges[eo][0])) {
					throw new DelaunayException("Two edges are the same edge.", {"edge": constrained_edges[e]});
				}
			}
		}
	}
	// make a map of points to triangles
	make_point_map(triangles);
	
	// loop through the edge constraints we were passed
	for (var e=0; e<constrained_edges.length; e++) {
		// list of triangles we want to remove from the CDT
		remove_triangles = [];
		// list of triangles we want ot add to the CDT
		new_triangles = [];
		
		// refresh the edge map
		var edge_map = make_edge_map(triangles);
		// the current edge (two points)
		var edge = constrained_edges[e];
		// console.log("EDGE:", constrained_edges[e]);
		
		// if this edge is already part of our CDT then leave it in there
		if (edge_map[edge_reference(edge[0], edge[1])]) {
			continue;
		}
		
		// check the edge is valid
		if (_delaunay_distance(edge[0], edge[1]) == 0) {
			throw new DelaunayException("Zero length edge constraint found.", {"edge": edge});
		}
		
		// the start triangle
		var t = null;
		// find the triangle of the first edge point that is intersected by the edge line as our start triangle
		for (var ti=0; ti<edge[0].delaunay_triangles.length; ti++) {
			// loop through the points of each triangle triangle to find the edges
			for (var p=0; p<pointnames.length; p++) {
				// the two points involved in this edge
				var p1 = edge[0].delaunay_triangles[ti][pointnames[p]];
				var p2 = edge[0].delaunay_triangles[ti][pointnames[(p + 1) % pointnames.length]];
				// if this side of this triangle intersects the edge we're processing we have found our triangle
				if (!(edge[0] == p1 || edge[0] == p2) && lines_intersect_2d(p1, p2, edge[0], edge[1])) {
					t = edge[0].delaunay_triangles[ti];
					t.edge_conflict = true;
				}
			}
		}
		
		// upper and lower polygons that will be formed
		var poly_u = [];
		var poly_l = [];
		
		// the start vertex
		var v = edge[0];
		
		// main part of the algorithm
		// t can sometimes be null at start with a short edge that already exists
		while (t && !vertex_in_triangle(edge[1], t)) {
			t.edge_conflict = true;
			var opposed = opposed_triangle(edge_map, t, v);
			// console.log("Opposed:", opposed);
			if (!opposed) {
				// not sure if this is the correct behaviour but it seems to work!
				break;
			}
			// first time through, add the initial points to the polygons
			if (poly_u.length == 0 && poly_l.length == 0) {
				for (var es=0; es<opposed.e.length; es++) {
					var ov = opposed.e[es];
					var ls = line_side(edge, ov);
					if (ls < 0) {
						poly_u.push(ov);
						ov.poly_u = poly_u.length;
					} else if (ls > 0) {
						poly_l.push(ov);
						ov.poly_l = poly_l.length;
					}
					ov.is_poly = true;
				}
			}
			var t_seq = opposed.t;
			var v_seq = opposed.v;
			var ls = line_side(edge, v_seq);
			// console.log(ls, edge[1], v_seq);
			//If vseq above the edge ab then
			if (edge[1] != v_seq) {
				if (ls < 0) {
					// AddList(PU, vseq)
					poly_u.push(v_seq);
					v_seq.poly_u = poly_u.length;
					// v:=Vertex shared by t and tseq above ab
					v = get_point_in_line_on_side(opposed.e, edge, ls);
				//Else If vseq below the edge ab
				} else if (ls > 0) {
					// AddList(PL, vseq)
					poly_l.push(v_seq);
					v_seq.poly_l = poly_l.length;
					// v:=Vertex shared by t and tseq below ab
					v = get_point_in_line_on_side(opposed.e, edge, ls);
				//Else vseq on the edge ab
				} else {
					// should never get here as all edges with points in them should have been split previously
					throw new DelaunayException("Point found inside an edge.", {"edge": edge, "point": v_seq});
					// InsertEdgeCDT(T, vseq b)
					// a:=vseq
					// break
				}
				v_seq.is_poly = true;
			}
			//EndIf
			//Remove t from CDT
			remove_triangles.push(t);
			// next triangle
			t = t_seq;
		}
		// remove the last one we found
		remove_triangles.push(t);
		
		triangulate_polygon(poly_u, edge, new_triangles);
		triangulate_polygon(poly_l, edge, new_triangles);
		
		// remove all the triangles we got rid of
		for (var t=0; t<remove_triangles.length; t++) {
			var idx = triangles.indexOf(remove_triangles[t]);
			if (idx >= 0) {
				var triangle = triangles[idx];
				for (var p=0; p<pointnames.length; p++) {
					var pt = triangle[pointnames[p]];
					var pidx = pt.delaunay_triangles.indexOf(triangle);
					if (pidx >= 0) {
						pt.delaunay_triangles.splice(pidx, 1);
					}
				}
				triangles.splice(idx, 1);
			}
		}
		
		// add all the triangles we added
		for (var t=0; t<new_triangles.length; t++) {
			triangles.push(new_triangles[t]);
			new_triangles[t].added = true;
			for (var p=0; p<pointnames.length; p++) {
				var v = new_triangles[t][pointnames[p]];
				// if there is no list yet for htis vertex then create one
				if (!v["delaunay_triangles"]) {
					v["delaunay_triangles"] = [];
				}
				// only add it if it is not yet in the list
				if (v["delaunay_triangles"].indexOf(new_triangles[t]) == -1) {
					v["delaunay_triangles"].push(new_triangles[t]);
				}
			}
		}
		
	}
	
	//console.log(vertices);
	//console.log(constrained_edges);
	//console.log(triangles);
	return triangles;
}

if (typeof module !== 'undefined') {
	module.exports = {
		Triangle: DelaunayTriangle,
		triangulate: delaunay_triangulate
	}
}
