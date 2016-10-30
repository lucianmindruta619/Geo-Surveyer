/**
 * 
 */

$(document).ready(function() {

    var timer = null;
    var shown_error = false;

    function clearProgressBar() {
        $("#progressBar").fadeOut( 1000, function(){
            setProgress( 0 );
            //$("#upload_file").show();
        });
    }
    
    var progress_count = 0;
    function setProgress( progress ) {
        var progressBarWidth = progress * $("#progressBar").width() / 100;

        $("#progressBar .indicator")
        .css( 'width', progressBarWidth )
        .html( progress + "%&nbsp;" );
    }

    $('#upload_file').fileupload({
        dataType: 'json',
        sequentialUploads: true,
        done: function (e, data) {
            // console.log(e);
            setTimeout( clearProgressBar, 2000 );
            // hack in a redirect to load the survey with a redirect
            if (progress_count == 100) {
		jqConsole && jqConsole.error("Started rebuilding survey data.");
		$("#console-spinner").show();
			// ask the server to rebuild the uploaded job
			$.getJSON("/rebuild/" + data.result.file_survey_id, function(rebuild_data) {
				var created_something = false;
				console.log("Rebuild:", rebuild_data);
				if (rebuild_data["pointcloud"] && rebuild_data["pointcloud"]["log"]) {
					jqConsole && jqConsole.error("Pointcloud data uploaded and processed.");
					created_something = true;
				}
				if (rebuild_data["psu"]) {
					jqConsole && jqConsole.error("Survey data uploaded and processed.");
					created_something = true;
				} else {
					jqConsole && jqConsole.error("Survey data not uploaded.");
				}
				//console.log(data);
				if (confirm("View the uploaded job?")) {
					document.location.href = "?" + rebuild_data.survey_id;
				}
				$("#console-spinner").hide();
			}).error(function(e) {
				jqConsole && jqConsole.error(e.statusText);
				var errorlines = e.responseText.split("\n").slice(0, 2);
				for (el=0; el<errorlines.length; el++) {
					jqConsole && jqConsole.error(errorlines[el]);
				}
				jqConsole && jqConsole.error("(developer has been notified of this error)");
				$("#console-spinner").hide();
			});
		}
	    shown_error = false;
        },
        fail: function (e, data) {
            // console.log( data.errorThrown );
            // console.log( data.textStatus );
            // console.log( data.jqXHR );
        },
        progressall: function (e, data) {
            progress_count = parseInt( data.loaded / data.total * 100, 10 );
            setProgress( progress_count );
        },
        send: function( e, data ) {
            try {
                clearTimeout( timer );
            } catch( ex ) {}
            progress_count = 0;
            $("#progressBar").show();
            //$("#upload_file").hide();
        },
        submit: function( e, data ) {
	    shown_error = false;
            if( data.originalFiles[0].name.match(/[.](p|s|u|asc)$/i) == null ) {
		jqConsole && jqConsole.error("Illegal file type.");
                return false;
            }
        },
		error: function(e) {
			if (!shown_error) {
				jqConsole && jqConsole.error("There was an error uploading the job files. Please report the job number.");
				// alert("There was an error uploading the job files. Please report the job number.");
			}
			shown_error = true;
		    setTimeout( clearProgressBar, 2000 );
		}
    });
    console.log("UPLOADER", $("#upload_file").find("input"));
    // hack to make the browse button work again after a Firefox update broke it.
    var browse_button = $("#upload_file").find("input");
    // move the input outside the original button
    $("#upload_file").after(browse_button).hide();
    //browse_button.css({"margin-left": "-100px"});
    
});
