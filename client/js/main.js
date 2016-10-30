/**
 * psutool main file - visualise .p/.s/.u
 */

/* vim:set tabstop=4 softtabstop=4 shiftwidth=4 noexpandtab: */

// start once the document is ready according to jQuery
$(function() {
	// Three.js setup
	// based on Template from http://stemkoski.github.com/Three.js/
	
	// read the survey id from the querystring
	var qs = document.location.href.split("?")[1];
	
	// store the orignal values of settings so that they can be reverted to when changes are cancelled
	var originalGlobalSettings = null;
	var originalJobSettings = null;

	// store current values of settings
	var globalSettings = null;
	var jobSettings = null;
	
	// global reference to the server side doncodes (CAD and vis settings from an excel spreadsheet)
	var doncodes = null;

	// standard global variables
	var container, scene, camera, renderer, controls, stats, osd, intersects, INTERSECTED;
	var keyboard = new THREEx.KeyboardState();
	var clock = new THREE.Clock();
	var isRedLineToggled=false;
	init();
	animate();
	
	function init() {
		// SCENE
		scene = new THREE.Scene();

		// CAMERA
		var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
		var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
		camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
		scene.add(camera);
		// camera.position.set(0,1400,150);
		// camera.lookAt(scene.position);

		// ON SCREEN DISPLAY MANAGER
		osd = new OSD(camera, $("#osd"), scene);

		// RENDERER
		renderer = Detector.webgl ? new THREE.WebGLRenderer({'antialias': true, 'alpha': true}) : new THREE.CanvasRenderer();
		$("#renderer").html("Renderer: " + (Detector.webgl ? "WebGL" : "Canvas"));
		renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
		renderer.setClearColor(0x000000, 0);
		container = document.createElement('div');
		document.body.appendChild(container);
		if(!Detector.webgl) {
			$("#renderer").css('color', 'red');
			alert("Please upgrade to WebGL enabled browser like Chrome or Firefox !");
		}
		container.appendChild(renderer.domElement);

		// EVENTS
		THREEx.WindowResize(renderer, camera);
		THREEx.FullScreen.bindKey({'charCode' : 'm'.charCodeAt(0)});

		// CONTROLS
		controls = new THREE.OrbitControls( camera, document.getElementById("osd") );

		// STATS
		stats = new Stats();
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.bottom = '0px';
		stats.domElement.style.zIndex = 100;
		container.appendChild(stats.domElement);

		// LIGHT
		var ambientLight = new THREE.AmbientLight(0x666666); 
		scene.add(ambientLight);
		ambientLight.visible = true;
		var directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1); 
		directionalLight.position.set(0.1, 0.1, 0); 
		scene.add(directionalLight);
		directionalLight.intensity = 0.6;
		directionalLight.visible = true;

		// SKYBOX/FOG
		// var skyBoxGeometry = new THREE.CubeGeometry(10000, 10000, 10000);
		// var skyBoxMaterial = new THREE.MeshBasicMaterial({'color' : 0xfefffe});
		// var skyBox = new THREE.Mesh(skyBoxGeometry, skyBoxMaterial);
		// skyBox.flipSided = true; // render faces from inside of the cube, instead of from outside (default).
		// scene.add(skyBox);
		// scene.fog = new THREE.FogExp2(0xfefffe, 0.00025);

		// //////////
		// CUSTOM //
		// //////////

		var objectWireframeMaterial = new THREE.LineBasicMaterial({'color' : 0x000000});

		/*
		 * textGeo = new THREE.TextGeometry( text, {
		 *
		 * size: size, height: height, curveSegments: curveSegments,
		 *
		 * font: font, weight: weight, style: style,
		 *
		 * bevelThickness: bevelThickness, bevelSize: bevelSize, bevelEnabled:
		 * bevelEnabled,
		 *
		 * material: 0, extrudeMaterial: 1
		 *
		 * });
		 *
		 * textGeo.computeBoundingBox(); textGeo.computeVertexNormals();
		 */

		$("#toggle_light").click(function(ev) {
			directionalLight.visible = !directionalLight.visible;
			if(directionalLight.visible) {
				ambientLight.color = new THREE.Color(0x666666);
			} else {
				ambientLight.color = new THREE.Color(0xffffff);
			}
		});
		$("#camera_top").click(function(ev){
			controls.object.position.copy(controls.center).add(new THREE.Vector3(500, 0, 0));
			controls.object.position.copy(controls.center).add(new THREE.Vector3(0, 500, 0));
		});
		$("#camera_north").click(function(ev){
			controls.object.position.copy(controls.center).add(new THREE.Vector3(500, 0, 0));
		});
		
		// if a survey id is supplied, use that instead of dummy-data.json
		survey_json_url = qs ? "media/uploaded/" + qs + "/" + qs + ".json" : "data/dummy-data.json";
		$("title").text($("title").text() + " " + qs);
		
		// grab the dummy data from the server
		function got_survey_data(data) {
			// load the data into a PSUFile object
			var psu = new PSUFile(data);

			// display some info in the info panel about the data
			var inf = $("#survey_info");
			inf.append("<li>Filename: " + data.filename + "</li>");
			inf.append("<li>Station ID: " + data.u[0].station_id + "</li>");
			var date = psu.get_date_time_array("date");
			inf.append("<li>Date: " + date[0] + "-" + date[1] + "-" + date[2] + "</li>");
			inf.append("<li>Surveyor: " + data.u[0].staff_initials + "</li>");
			inf.append("<li>Station Height: " + data.u[0].station_height + "m</li>");
			$("#points_count").html("Points Surveyed: " + data.p.length);
			// now display some info about the survey points collected
			// var pts = $("#points");
			// for (var p=0; p<data.p.length; p++) {
			// pts.append("<li>" + data.p[p].code + " @ (" +
			// Math.round(data.p[p].marker_angle) + "Â°, " +
			// data.p[p].marker_distance + "m, " +
			// Math.round(data.p[p].marker_slope) + "Â°)</li>");
			// }
			window.psufile_data = data;
			// get a list of associated points in a dictionary by point code
			var point_lists = psu.get_point_lists();
			// create the new manager of the psu file rendering
			var psu_renderer = new PSUFile3dRenderer(scene, psu);
			
			// load the demo object code
			/*var loader = new THREE.OBJLoader();
			loader.load("data/bush-through-blender.obj", function(object) {
				// add our line material to each line
				object.traverse( function ( child ) {
					if ( child instanceof THREE.Line ) {
						child.material = objectWireframeMaterial;
					}
				} );
				// scale it to fit the world (TODO: 2 is a hack - figure out correction)
				object.scale.set(psu_renderer.SCALE * 2, psu_renderer.SCALE * 2, psu_renderer.SCALE * 2);
				//scene.add(object);
				// console.log(object);
				bush = object;
				$(document).trigger("objs-loaded");
			});*/
			
			$(document).when("doncodes-loaded global-settings-loaded job-settings-loaded").done(function() {
				console.log("launch!");
				// apply the settings to start with
				if (jobSettings) {
					psu.use_settings({"job": jobSettings, "global": globalSettings});
				}
				
				// actually cruch the data we have
				psu.crunch_data();
				//Fade the spinner we are showing
				$('#spinner').fadeOut(1000);
				// console.log(jsons);
				psu.use_doncodes(doncodes);
				// fetch the stringlines we generated and draw them
				psu_renderer.generate_stringlines(psu.get_stringlines());
				
				// give the OSD access to the psufile and renderer
				osd.references(psu, psu_renderer);
				
				// build the contours
				psu_renderer.generate_contour();
				// list of vertices with 2d objects on them
				var objects_2d = psu.get_objects_2d();
				//for (var o=0; o<objects_2d.length; o++) {
				//	bush.position.set(objects_2d[o].point[0],objects_2d[o].point[1]+0.3,objects_2d[o].point[2]).multiplyScalar(psu_renderer.SCALE);
				//	psu_renderer.generate_obj(bush.clone());
				//}
				
				// look at the center of the mesh's bounding box
				var ctr = psu_renderer.get_center_point();
				controls.center.copy(ctr);
				controls.object.position.copy(ctr).add(new THREE.Vector3(500, 500, 500));
				
				//Toggle StringLines
				$("#toggle_stringlines").change(function(ev) { 
					psu_renderer.toggle_stringline_visibility(!$(this).is(":checked"));
				});
				
				// trigger the generation of the topography mesh
				psu_renderer.generate_topography();		
				// when the user clicks the toggle button tell our psufile renderer to toggle the mesh
				$("#toggle_meshlines").change(function(ev) { 
					psu_renderer.toggle_topography_visibility(!$(this).is(":checked"));
				});
				//when the user clicks the toggle button tell our psufile renderer to toggle the redline
				$("#toggle_contourlines").change(function(ev) {
					psu_renderer.toggle_contour_visibility (!$(this).is(":checked"));
				});
				//Toggle bush objects
				/*$("#toggle_object").change(function(ev) {
					psu_renderer.toggle_object_visibility (!$(this).is(":checked"));
				});*/
				
				// clicking download dxf button generates the DXF blob
				$("#export_dxf").click(function(ev) {
					$( "#export-dialog" ).dialog({ 
						modal:true,
						open: function(){
							jQuery('.ui-widget-overlay').bind('click',function(){
								jQuery('#export-dialog').dialog('close');
							});
						},
						buttons: [{
						 	text: "Export",
						  click: function() {
								console.log('pre smooth');
								$("#export_dxf").attr('disabled', true);
								$(".ui-dialog-buttonpane button:contains('Export')").button('disable');
								$("#export-dialog-contents").after("<div id='dxfloading'></div>");
								// force the generation of smoothed contour splines
								psu.get_smoothed_contour_lines(function(smoothed_contour_lines) {
									// now send it
									console.log("Sending psufile to the server for export");
									//console.log(psu.get_data());

									var threedMesh = "0", origContour = "0", splinesContour = "0";
									if ($('#three-d-mesh').prop('checked')) {
										threedMesh = "1";
									}
									if ($('#orig-contour').prop('checked')) {
										origContour = "1";
									}
									if ($('#spline-contour').prop('checked')) {
										splinesContour = "1";
									}

									var options_json = "{\"threedMesh\":\"" + threedMesh + "\", \"origContour\":\"" + origContour + "\", \"splinesContour\":\"" + splinesContour +"\"}";

									console.log(options_json);
						
									$.post(psu.get_filename() + "-export.dxf?_=" + Math.random(), {"data": psu.get_json(), "jobSettings": JSON.stringify(jobSettings), "globalSettings": JSON.stringify(globalSettings), "options": options_json}, function(dxf_url) {
										console.log('Got dxf data back: ' + dxf_url);
										window.location.assign(dxf_url);
										$( "#export-dialog" ).dialog('close');
									}).error(function(e){
										$("#dxfloading").remove();
										$("#export_dxf").attr('disabled', false);
										jqConsole && jqConsole.error(e.statusText);
										var errorlines = e.responseText.split("\n").slice(0, 2);
										for (el=0; el<errorlines.length; el++) {
											jqConsole && jqConsole.error(errorlines[el]);
										}
										jqConsole && jqConsole.error("(developer has been notified of this error)");
										$( "#export-dialog" ).dialog('close');
										// alert("An Internal error occurred");
									}).success(function(data, textStatus, jqXHR){
										console.log('success');
										$("#export_dxf").attr('disabled', false);
										$("#dxfloading").remove();
									});
								});
						  }
						},
						{
						    text: "Cancel",
						    click: function() {
						        jQuery('#export-dialog').dialog('close');
						    }
						}]
					});
				});
			
				// listen for settings button click, show/hide the settings dialog
				$("#settings").click(function(){
					$( "#settings-dialog" ).dialog( "open" );
                                  
					// stop the document object from dealing with keypress events
					// they should be handled by the JSON editor while the settings are shown
					$(document).off('keydown');
				});

				// initialise the settings dialog
				$( "#settings-dialog" ).dialog({
					autoOpen: false,
					height: Math.min($(window).height() * 0.9, 800),
					width: Math.min($(window).width() * 0.75, 1024),
					modal: true,
					show: {
						effect: "fade",
						duration: 200
					},
					hide: {
						effect: "fade",
						duration: 200
					},
					buttons: {
						Save: function() {
							console.log( "Save settings" );

							// update original values of JSON
							originalJobSettings = jobSettings;
							originalGlobalSettings = globalSettings;

							// POST the global settings JSON from the variable "globalSettings"
							$.post("/save/settings.json", $.param({'settings_data': window.JSON.stringify(globalSettings)}), function(response) {
								if (response != "saved") {
									alert(response);
								}
							});
							// POST the job settings JSON from the variable "jobSettings"
							if ( qs != 'undefined' ) {
							    $.post("/save/" + qs + "/settings.json", $.param({'settings_data':window.JSON.stringify(jobSettings)}), function(response) {
									if (response != "saved") {
										alert(response);
									}
								});
                            }

							// close the settings dialog and reinstate the keyboard handler
							$( this ).dialog( "close" );
							$(document).keydown( keyboardHandler );
						},
						Cancel: function() {
							console.log( "Cancel settings" );

							// return JSON to original state
							globalSettings = originalGlobalSettings;
							jobSettings = originalJobSettings;

							// revert JSON in editor
							$('#job-settings').jsonEditor( originalJobSettings, jobOpt ).addClass('expanded');;
							$('#global-settings').jsonEditor( originalGlobalSettings, globalOpt ).addClass('expanded');;

							// close the settings dialog and reinstate the keyboard handler
							$( this ).dialog( "close" );
							$(document).keydown( keyboardHandler );
						}
					}
				});
				
				$( "#settings-tabs" ).tabs();
				
				// array of the OSD descriptive element for each point
				pointsArray = osd.generate_osd(point_lists);
				// when the points toggle is clicked we show/hide the OSD point list
				$("#toggle_point").change(function(ev) {
					for(var a=0; a<pointsArray.length; a++){
						osd.ToggleVisibility(a);
					}
					osd.toggle_3dAxis($(this).is(":checked"));
				});
				
				// add points to visualise the retaining wall corners
				var rws = psu.get_retaining_walls();
				for (var rw=0; rw<rws.length; rw++) {
					//var shape = THREE.SceneUtils.createMultiMaterialObject(new THREE.SphereGeometry(2, 4, 4), redWireframeMaterial);
					//shape.position.set(rws[rw][0] * psu_renderer.SCALE, rws[rw][1] * psu_renderer.SCALE, rws[rw][2] * psu_renderer.SCALE);
					//scene.add(shape);
				}

				// draw the boundary marker
				psu_renderer.generate_boundary_marker();
				
				function keyboardHandler(e) {
					if ( !( $(e.target).attr('name') == "point_txt" ) ) {
						e.preventDefault();
					}

					switch(e.keyCode) {
						case 8: // backspace key
						case 46: // delete key
							// if the face we are hovering over when we delete has an original triangle attached
							// then flag it and rebuild the mesh
							if (INTERSECTED && INTERSECTED["original_triangle"]) {
								INTERSECTED.original_triangle.manually_deleted = true;
								psu_renderer.generate_topography();
								psu_renderer.generate_contour(true);
							}
						break;
					}
				};

				$(document).keydown( keyboardHandler );
				
				// Pick up Triangles
				document.addEventListener( 'mousemove', onDocumentMouseMove, false );
				function onDocumentMouseMove(event){
					event.preventDefault();
					var vector = new THREE.Vector3(( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5);
					vector = vector.unproject(camera);
					var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
					intersects=(ray.intersectObjects( psu_renderer.get_topography_shape().children,true ));
					if ( intersects.length > 0 ) {
						//console.log(intersects[0]);
						if ( INTERSECTED != intersects[ 0 ].face ) {
							 if ( INTERSECTED ){
								 INTERSECTED.color.setHex( INTERSECTED.currentHex );
							 }
							 INTERSECTED = intersects[ 0 ].face;
							 INTERSECTED.currentHex = INTERSECTED.color.getHex();
							 INTERSECTED.color.setHex( 0xF9B7FF );
							 intersects[0].object.geometry.colorsNeedUpdate=true;
						 }
					} else {
						if ( INTERSECTED )
							INTERSECTED.color.setHex( INTERSECTED.currentHex );
						INTERSECTED = null;
					}
				}

			});
			
			// trigger our remaining loads and setup

			// settings manipulation functions etc.
			var globalOpt = { 
				change: function(data) {
					console.log( "global settings changed", data );
					globalSettings = data;
				}
			};
			var jobOpt = { 
				change: function(data) {
					console.log( "job settings changed", data );
					jobSettings = data;
					console.log("regenerate contours");
					// regenerate contours
					psu.use_settings({"job": jobSettings, "global": globalSettings});
					// re-build the contours
					psu_renderer.generate_contour(true);
				}
			};
			
			// get global settings JSON
			$.getJSON( "settings.json", function(data){
				console.log( "global-settings getJSON callback", data );
				
				globalSettings = originalGlobalSettings = data;
				$('#global-settings').jsonEditor( data, globalOpt ).addClass('expanded');
				
				console.log( "trigger global-settings-loaded" );
				$(document).trigger("global-settings-loaded");
			});
			
			// get job settings JSON
			if ( typeof qs !== 'undefined' ){
				$.getJSON( qs+"/settings.json", function(data){
					console.log( "job-settings getJSON callback", data );
					
					jobSettings = originalJobSettings = data;					
					$('#job-settings').jsonEditor( data, jobOpt ).addClass('expanded');
					
					console.log( "trigger job-settings-loaded" );
					$(document).trigger("job-settings-loaded");
				});
			} else {
				console.log( "skip loading job-settings" );
				
				originalJobSettings = {};
				$('#job-settings').jsonEditor( {}, jobOpt ).addClass('expanded');
				
				console.log( "trigger job-settings-loaded" );
				$(document).trigger("job-settings-loaded");
			}
			
			// initiate the request for the doncodes from the server
			$.getJSON("data/doncodes.json", function (jsons) {
				doncodes = jsons;
				console.log( "trigger doncodes-loaded" );
				$(document).trigger("doncodes-loaded");
			});
		}

		// if there is a survey_json_url then go fetch
		if (survey_json_url) {
			// Toggle left box
			$(".minimise").click(function(){
				console.log($($(this).attr("target")));
				$($(this).attr("target")).find(".ui-inner").toggle();
			});
			
			// Toggle upload UI
			$("#upload").click(function() {
				$("#upload-ui").toggle();
			});
			
			// get PSUTool build number
			$.getJSON( "build-info.json", function(data) {
				$("#build").html("Build " + data.count + " - " + data.id.substr(0,10));
			});
			
			// get point cloud info
			$.getJSON( qs + "/pointcloud-info.json", function(data) {
				if (data["point-cloud"]) {
					$("#point-cloud-link").append("<a href='point-cloud?" + qs + "'>view point cloud</a>");
				}
			});

			// initialise the points selection menu
			$( "#points_menu_button" ).click( osd.points_menu_changed );
			$( "#points_menu_box" ).hide();

			$.getJSON(survey_json_url, got_survey_data).error(function(jqXHR, status, error){
				$('#spinner').fadeOut(1000);
				jqConsole && jqConsole.error(error);
				$( "#settings-dialog" ).hide();
				$( "#point_data" ).hide();
				$( "#togglebox" ).hide();
				$( "#camerabox" ).hide();
				$( "button#settings").hide();
				$( "button#export_dxf").hide();
				var inf = $("#survey_info");
				inf.append("<li>Filename: " + qs + "</li>");
				inf.append("<li>(No p/s/u files found)</li>");
			});
		}
	}
	
	// does the animation loop
	function animate() {
		requestAnimationFrame(animate);
		render();
		update();
	}

	// wait for keypresses etc
	function update() {
		if (keyboard.pressed("z")) {
			// do something
		}

		controls.update();
		controls.userPanSpeed = controls.object.position.distanceTo(controls.center) / 100;
		stats.update();
		osd.update();
	}

	// the actual render loop
	function render() {
		renderer.render(scene, camera);
	}
});
