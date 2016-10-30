/* On-screen display 2d elements (such as text) overlayed on top of the 3d. */

function OSD(camera, container, scene) {
	var renderlist = new Array();
	var pointsArray = new Array();
	this.SCALE = 5;
	var axises=[];
	var lineGeometry;
	var lineMaterial;
	var buffElement=[];
	var panelClick=false;
	var psufile = null;
	var psu_renderer = null;
	var selectedPoints = [];
	
	// run this every animation loop to reposition the osd elements
	this.update = function() {
		// TODO: optimise this to only happen on resize
		var container_rectangle = [
			container.offset().left,
			container.offset().top,
			container.width(),
			container.height()
		];
		// runs through our list of all osd elements to render
		for (var r=0; r<renderlist.length; r++) {
			// get the bits out and conver the position from 3d to 2d
			var o = renderlist[r];
			var pos = to_screen_coordinates(o.pos, camera);
			// put the osd element back in the correct spot in 2d
			if (o.el["visible"] != false) {
				o.el.css({
					"left": (pos.x + 1) * container_rectangle[2] / 2 + container_rectangle[0] - o.w / 2,
					"top": (-pos.y + 1) * container_rectangle[3] / 2 + container_rectangle[1] - o.h / 2
				});
			}
		}
	}
	
	this.ToggleVisibility = function (pos) {
            if (renderlist[pos].el.visible != false) {
                renderlist[pos].el.visible = false;
                renderlist[pos].el.hide();
            } else {
                renderlist[pos].el.visible = true;
                renderlist[pos].el.show();
            }
        }

	this.references = function(p, pr) {
		psufile = p;
		psu_renderer = pr;
	}
	
	// array of the OSD descriptive element for each point
	this.generate_osd=function(point_lists){
		var start, finish;
		for ( var l in point_lists) {
			for ( var p = 0; p < point_lists[l].length; p++) {
				// create a vector pointing to this point (actually slightly
				// above the point)
				var point = (new THREE.Vector3(point_lists[l][p][0], point_lists[l][p][1] + 1, point_lists[l][p][2])).multiplyScalar(this.SCALE);
				
				// Create our 3D axis object
				prepareLines();
				var axis = new THREE.Line(lineGeometry, lineMaterial);
				// Position it at the appropriate co-ordinates
				axis.position.set(point_lists[l][p][0], point_lists[l][p][1],point_lists[l][p][2] ).multiplyScalar(5);
				scene.add(axis);
				axises.push(axis);
				//Show point details inside the box we just created with id point_data
				var pt_info = $("#point_info"); 
				var pt_code_element = $("<li><div class='code'><b>Code: "+l+"("+point_lists[l][p].data.original_code+")"+" ["+point_lists[l][p].data.point_id+"]"+(point_lists[l][p].data.day_id || "")+"</b></div><span class='pointui' style='display: none;'><div class='pointtoggles'>NC<input type='checkbox' " + (point_lists[l][p].data.extensions["function"].indexOf("NC") >= 0 ? "checked" : "") + "></div><span class='pointdata'></span></span></li>");
				pt_code_element._vertex = point_lists[l][p];
				$(pt_code_element).find(".pointtoggles input").click(function(v) {
					return function(ev) {
						ext = v.data.extensions["function"];
						// console.log(this);
						if ($(this).is(":checked")) {
							if (ext.indexOf("NC") == -1) {
								ext.push("NC");
							}
						} else {
							if (ext.indexOf("NC") != -1) {
								ext.splice(ext.indexOf("NC"), 1);
							}
						}
						psu_renderer.regenerate_all();
					}
				}(point_lists[l][p]));
				//var x_coordinate_element = $("<span class='x'>&nbsp X: "+point_lists[l][p][0]+"</span>").addClass("display_block").hide();
				//var y_coordinate_element = $("<span class='y'>&nbsp Y: "+point_lists[l][p][1]+"</span>").addClass("display_block").hide();
				//var z_coordinate_element = $("<span class='z'>&nbsp Z: "+point_lists[l][p][2]+"</span>").addClass("display_block").hide();
				pt_info.append(pt_code_element);
				//pt_info.append(x_coordinate_element);
				//pt_info.append(y_coordinate_element);
				//pt_info.append(z_coordinate_element);
				// add an OSD element with the name/code of this point
				var point_descriptor = $("<div>" + l + " ["+point_lists[l][p].data.point_id+"]" + (point_lists[l][p].data.day_id || "") + "</div>").addClass("point_descriptor");
				//link the Code element which we just created, so that we can toggle highlighting easily
				point_descriptor[0].point_list_element = pt_code_element.css({'cursor':'pointer'}); // Add pointer for each element in box
				// link the 3D axis which we just created, so that we can Highlight them easily during onHover
				point_descriptor[0]._axis = axis;
				// backlink to the actual vertex
				point_descriptor[0]._vertex = point_lists[l][p];
				$("#osd").append(point_descriptor);
				this.add_item(point_descriptor[0], point);
				// remember our OSD elements for each point so we can toggle them
				pointsArray.push(point);
			}
		}

		//handle clicks in the osd
		$('#osd').click( process_osd_click );

		return pointsArray;
	}
	// add an item to the list of things to be rendered
	this.add_item = function(element, position) {
		//Check to toggle highlight and expansion on RHS box on the same element
		element.isCheck=false;
		 // Turn only a single OSD element to yellow on each click
          /*
		 $(element).click(function(event){
			 panelClick=false;
			 process_click(element);
		 });
	*/
	 
		 //Disable hover on selected point and Highlight unique points in 3D topography and points box on hover
		 
		 $(element).bind("mouseover", function(e) {  // Do not use jQuery's mouseenter and mouseleave events. Found it buggy.
			 process_mouse_over(element);
			 e.preventDefault();
		 });
		 
		 $(element).bind("mouseout", function(e) {
			process_mouse_out(element);
			 e.preventDefault();
		 }); 
		 
		 //Same functionality as above for the pointBox on RHS
		 $(element.point_list_element).find(".code").click(function(ev){  // unique click event
			 panelClick=true;
			 process_click(element);
		 });
		 
		 // Hover functionality
		 $(element.point_list_element).bind("mouseover", function(e) {
			process_mouse_over(element);
			 e.preventDefault();
		 });
		 
		 $(element.point_list_element).bind("mouseout", function(e) {
			 process_mouse_out(element);
			 e.preventDefault();
		 }); 
		
		var jqe = $(element).css({"position": "absolute","cursor" :"pointer"}).addClass("osd");
		renderlist.push({"el": jqe, "pos": position, "w": jqe.width(), "h": jqe.height()});
		renderlist[renderlist.length-1].el.visible=true;
		return renderlist.length-1;
	}
	// Get the lines Object up and running
	function prepareLines(){
		lineGeometry = new THREE.Geometry();
		lineMaterial= new THREE.LineBasicMaterial({
			color: 0x000000
		});
		lineGeometry.vertices.push( new THREE.Vector3( 0, -5, 0));
		lineGeometry.vertices.push( new THREE.Vector3( 0, 5, 0));
		lineGeometry.vertices.push( new THREE.Vector3( 0, 0, 0));
		lineGeometry.vertices.push( new THREE.Vector3( 0, 0, 0));
		lineGeometry.vertices.push( new THREE.Vector3( -5, 0, 0));
		lineGeometry.vertices.push( new THREE.Vector3( 5, 0, 0));
		lineGeometry.vertices.push( new THREE.Vector3( 0, 0, 0));
		lineGeometry.vertices.push( new THREE.Vector3( 0, 0, 0));
		lineGeometry.vertices.push( new THREE.Vector3( 0, 0, -5));
		lineGeometry.vertices.push( new THREE.Vector3( 0, 0, 5));
		
		lineGeometry.computeVertexNormals();
	}
	// Toggle 3D axis
	this.toggle_3dAxis=function(visible){
		
		if(visible){
			for(var v in axises){
				scene.add(axises[v]);
			}
		} else {
			for(var d in axises){
				scene.remove(axises[d]);
			}
		}
	}
	// turn a 3d point into screen coordinates
	function to_screen_coordinates(position, camera) {
		return position.clone().project(camera);
	}
	function process_click(element){
		console.log("Clicked:", element._vertex);
		$(element).css({ 'color': ''});
		 $(element).addClass('yellow');
		 $(element.point_list_element).addClass('highlight');
		 element._axis.material.color.setHex( 0xFFFF00 );
		 //$(element.point_list_element).nextAll().slice(0, 3).show();
		var ptdata = {
			"code": element._vertex.code,
			"x": element._vertex[0],
			"y": element._vertex[1],
			"z": element._vertex[2],
			"data": element._vertex.data
		};
		$(element.point_list_element).find(".pointdata").inspect(ptdata, "Point " + element._vertex.id);
		$(element.point_list_element).find(".pointui").show();
		 element.isCheck = !element.isCheck; // Toggle check on each element
		 
		 if(buffElement!=null && ! element.isCheck){ // Toggle for same element
			 	var index = buffElement.indexOf(element);
			 	buffElement.splice(index, 1);
			 	$(element).removeClass('yellow');
			 	$(element).css({ 'color': 'red'});
			 	element._axis.material.color.setHex( 0xFF0000 );
			 	//$(buffElement.point_list_element).nextAll().slice(0, 3).hide();
				$(element.point_list_element).find(".pointdata").html("");
				$(element.point_list_element).find(".pointui").hide();
		 		} else {
		 			buffElement.push(element);
		 		}
//		 if(buffElement!=null && ! $(element).is(buffElement)){ // Toggle for unique element
//			 	$(buffElement).removeClass('yellow');
//				buffElement._axis.material.color.setHex( 0x000000 );
//				$(buffElement.point_list_element).removeClass('highlight');
//				$(buffElement.point_list_element).find(".pointdata").html("");
//				$(buffElement.point_list_element).find(".pointui").hide();
//				//$(buffElement.point_list_element).nextAll().slice(0, 3).hide();
//				 }
		 
		 
		 if(!panelClick) // If not RHS box panel click, then it is a 3D click. AutoScroll to that position
			 $('#point_data').animate({
		         scrollTop: $(element.point_list_element).offset().top - $('#point_data').offset().top + $('#point_data').scrollTop()
		     }, 500);
	}

	function process_osd_click(event){
		//console.log('process_osd_click', event.pageX, event.pageY);

		// hide the points menu if it is already visible
		$('#points_menu_box').hide();

		selectedPoints = get_point_descriptors_at( event.pageX, event.pageY );
		//console.log( "selectedPoints length", selectedPoints.length );

		switch( selectedPoints.length ){
		case 0:
			// console.log( "None found" );
			break;
		case 1:
			process_click( selectedPoints[0] );
			break;
		default:
			// empty the select box
			$('#points_menu option').remove();

			// fill the select box with points
			for (var i = 0 ; i < selectedPoints.length ; i++){
				//console.log( "Add", selectedPoints[i]._vertex.code );
				$('#points_menu').append( $('<option>', {
					value: i,
					text: build_point_code( selectedPoints[i]._vertex )
				}));
			}

			// place the multi-select box
			$( "#points_menu_box" ).css( {left:event.pageX,top:event.pageY} );

			// show the multi-select box
			$('#points_menu_box').show();
			
			break;
		}
	};
	
	// return a list of HTML elements in the 'point_descriptor' class at the given mouse position
	function get_point_descriptors_at(x,y){
		var result = [];

		// get the element at the given position
		var ele = document.elementFromPoint(x,y);
		
		// while an element is found at the given position
		while( ele && $(ele).hasClass( 'point_descriptor') ){
			// add the element to the result array
			result.push(ele);

			// hide the element
			ele.style.visibility = "hidden";

			// find the next element at the given position
			ele = document.elementFromPoint(x,y);
		}

		// set all the elements found back to visible
		for(var i = 0; i < result.length; i++){
			result[i].style.visibility = "visible";
		}
		
		return result;
	};

	// return the point code string to be used in the multi-point select box for a given point	
	function build_point_code( point ){
		return "("+point.data.original_code+")"+" ["+point.data.point_id+"]";
	};

	function process_mouse_over(element){
		if (!$(element).hasClass('yellow')){
			 $(element).css({ 'color': 'red'});
			 $(element.point_list_element).addClass('highlight');
			 element._axis.material.color.setHex( 0xff0000 );
		 }
	}
	
	function process_mouse_out(element){
		 if (!$(element).hasClass('yellow')){
			 $(element).css({ 'color': ''});
			 $(element.point_list_element).removeClass('highlight');
			 element._axis.material.color.setHex( 0x000000 );
		 }
	}

	this.points_menu_changed = function( event, ui ){
		//console.log( "points_menu_changed()");

		var selected = $('#points_menu').val();
		//console.log( "selected", selected );

		// get the element of the selected value
		var element = selectedPoints[selected];

		// process_click as though the element was selected
		process_click( element );

		// hide the points selection menu
		$( '#points_menu_box' ).hide();

		return false;
	};
}
