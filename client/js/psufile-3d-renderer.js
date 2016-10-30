function PSUFile3dRenderer(scene, psufile) {
	// amount to scale the survey data for viewing in 3d
	this.SCALE = 5;
	var objects=[];
	var contour_lines = [];
	var stringlines = [];
	var line;
	var topography_shapes = {
		"normal": null,
		"wireframe": null
	}
	// which style of shape has been added to the scene
	var shape_added = null;

	// Using wireframe materials to illustrate shape details.
	var wireframeMaterial = new THREE.MeshBasicMaterial({'color' : 0x000000, 'wireframe' : true, 'transparent' : true, side:THREE.DoubleSide});
	wireframeMaterial.vertexColors=THREE.FaceColors;
	var darkMaterial = new THREE.MeshLambertMaterial({'color' : 0xffffcc, side:THREE.DoubleSide});
	darkMaterial.vertexColors=THREE.FaceColors;
	var redMaterial = new THREE.MeshBasicMaterial({'color' : 0xff0000});
	redMaterial.vertexColors=THREE.FaceColors;
	var cadMaterial = [ darkMaterial, wireframeMaterial ];
	var redWireframeMaterial = [ redMaterial, wireframeMaterial ];

	var stringLineMaterial = new THREE.LineBasicMaterial({'color' : 0x00ff00});
	var breakLineMaterial = new THREE.LineBasicMaterial({'color' : 0xff8000, 'linewidth': 2});
	var majorContourLineMaterial = new THREE.LineBasicMaterial({'color' : 0xff0000, 'linewidth': 2});
	var minorContourLineMaterial = new THREE.LineBasicMaterial({'color': 0x0000ff});

    // smoothing based on circular filleting - TODO: this should probably be moved out of the renderer
    this.smooth_contours_fillet = function(vertices, radius) {
        var new_vertices = [vertices[0]]
        
        for(var c=0; c<vertices.length-2; c+=1) {
            var p1 = new_vertices[new_vertices.length-1];
            var p2 = vertices[c+1];
            var p3 = vertices[c+2];
            new_vertices.push(p1);
            if(p1.distanceTo(p2) > radius) {
                var arc = fillet(p1, p2, p2, p3, radius);
                if(arc != null && arc.length > 0) {
                    new_vertices = new_vertices.concat(arc);
                }
            } else {
                new_vertices.push(p2);
            }
        }
        new_vertices.push(vertices[vertices.length-1])
        return new_vertices;
    }

	this.generate_contour = function(recompute) {
		for (var p = 0; p < contour_lines.length; p++) {
			scene.remove(contour_lines[p]);
		}
		var scale = this.SCALE;
		contour_lines = [];
		psufile.get_contour_lines(function(contours) {
			console.log(contours);
			for (var c=0; c<contours.length; c++) {
				// randomly coloured material
				// var mat = new THREE.LineBasicMaterial({'color' : 0xffffff * Math.random(), "linewidth": 2});
				var geometry = new THREE.Geometry();
				var vertices = [];
				for (var p=0; p<contours[c].vertices.length; p++) {
					vertices.push(new THREE.Vector3(contours[c].vertices[p][0], contours[c].vertices[p][1] + 0.3, contours[c].vertices[p][2]).multiplyScalar(scale));
				}
				if (contours[c].vertices.length == 2) {
					geometry.vertices = vertices;
				} else {
					// make a nice smooth many-point line from our spline
					//geometry.vertices = this.smooth_contours_fillet(vertices, 2);
					geometry.vertices = vertices;
				}
				// use a different material depending on whether this is a major or minor contour line
				var contour_material = contours[c].type == "minor" ? minorContourLineMaterial : majorContourLineMaterial;
				var line = new THREE.Line(geometry, contour_material);
				contour_lines.push(line);
				scene.add(line);
			}
		}, recompute);
	}
	
	// Add Bush Object
	this.generate_obj=function(obj){
		objects.push(obj);
	}
	
	this.generate_stringlines = function(sldata) {
		for (var sl in sldata) {
			var stringLineGeometry = new THREE.Geometry();
			for (var p=0; p<sldata[sl].length; p++) {
				stringLineGeometry.vertices.push((new THREE.Vector3(sldata[sl][p]["point"][0], sldata[sl][p]["point"][1] + 0.5, sldata[sl][p]["point"][2])).multiplyScalar(this.SCALE));
			}
			// if this is a breakline colour it differently
			stringlines.push(new THREE.Line(stringLineGeometry, psufile.get_breaklines()[sl] ? breakLineMaterial : stringLineMaterial));
			scene.add(stringlines[stringlines.length-1]);
		}
	}
	
	// toggle stringlines visibility
	this.toggle_stringline_visibility = function(visible) {
		if (visible) {
			for (p = 0; p < stringlines.length; p++)
				scene.remove(stringlines[p]);
		} else {
			for (p = 0; p < stringlines.length; p++)
				scene.add(stringlines[p]);
		}
	}
	
	//toggle Bush Objects
	this.toggle_object_visibility=function(visible){
		if (visible) {
			for(var o=0; o<objects.length; o++)
				scene.remove(objects[o]);
			
		} else {
			for(var o=0; o<objects.length; o++)
				scene.add(objects[o]);
			
		}
	}
	// toggle contour
	this.toggle_contour_visibility = function(visible) {
		if (visible) {
			for (var c=0; c<contour_lines.length; c++) {
				scene.remove(contour_lines[c]);
			}
			
		} else {
			for (var c=0; c<contour_lines.length; c++) {
				scene.add(contour_lines[c]);
			}
			
		}
	}
	
	this.generate_topography = function(recompute) {
			var material = cadMaterial;
			var wireframe_material = darkMaterial;
			
			// if we already have a shape in there we are re-computing, so add it back
			if (shape_added) {
				scene.remove(topography_shapes[shape_added]);
			} else {
				// first time we run add the normal mesh with everything visible
				shape_added = "normal";
			}

			// set up the mesh we'll use to display the topography
			var topography = new THREE.Geometry();
			//set up Geometry for Force color updates
			topography.dynamic=true;
			topography.verticesNeedUpdate = true;
			topography.colorsNeedUpdate = true; //equivalent to geometry.__dirtycolors since we are on r49

			// add all of the points we know about
			var verticies = psufile.get_vertices();
			for ( var v = 0; v < verticies.length; v++) {
				topography.vertices.push((new THREE.Vector3(verticies[v][0], verticies[v][1], verticies[v][2])).multiplyScalar(this.SCALE));
			}
			
			// get the delaunay triangle mesh from the psufile
			var triangles = psufile.get_triangles(recompute);
			// now add the triangles based on the verticies we just added
			for ( var t = 0; t < triangles.length; t++) {
				var tri = triangles[t];
				var face = new THREE.Face3(tri.a.id, tri.b.id, tri.c.id);
				face.original_triangle = tri;
				if (!tri.manually_deleted) {
					topography.faces.push(face);
				}
			}

			// re-jig the normals for lighting
			topography.computeFaceNormals();

			// create our new topography mesh(es) as shapes to be added to the scene
			topography_shapes.normal = THREE.SceneUtils.createMultiMaterialObject(topography, material);
			topography_shapes.wireframe = THREE.SceneUtils.createMultiMaterialObject(topography, wireframe_material);

			// finally, add the one we want to the scene
			scene.add(topography_shapes[shape_added]);
	}
	
	// re-generate them
	this.regenerate_all = function() {
		this.generate_topography(true);
		this.generate_contour(true);
	}
	
	// function to show and hide the entire topography mesh by swapping between the 'normal' mesh and a wireframe version
	this.toggle_topography_visibility = function(visible) {
		scene.remove(topography_shapes[shape_added]);
		if (visible) {
			shape_added = "wireframe";
		} else {
			shape_added = "normal";
		}
		scene.add(topography_shapes[shape_added]);
	}
	
	// returns the currently active topography shape
	this.get_topography_shape = function() {
		return topography_shapes[shape_added];
	}
	
	// makes the boundary marker indicator
	this.generate_boundary_marker = function(material) {
		var material = redWireframeMaterial;
		// add the red thingy where the site marker is
		var bm = psufile.get_boundary_marker();
		var shape = THREE.SceneUtils.createMultiMaterialObject(new THREE.TorusGeometry(3, 2, 3, 3), material);
		shape.position.set(bm[0] * this.SCALE, bm[1] * this.SCALE, bm[2] * this.SCALE);
		scene.add(shape);
	}
	
	// returns scaled mesh center point
	this.get_center_point = function() {
		var cp = psufile.get_center_point();
		return new THREE.Vector3(cp[0] * this.SCALE, cp[1] * this.SCALE, cp[2] * this.SCALE);
	}
}
