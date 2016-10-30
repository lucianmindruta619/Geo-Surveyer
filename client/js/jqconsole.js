var jqConsole = null;
var errCount = 0;

$(document).ready(function(){

	jqConsole = $('#error-console').console({
	   	autofocus: true,
	   	animateScroll: true,
	   	promptHistory: true,
		promptLabel: " "
	});

	jqConsole.error = function(msg) {
		jqConsole.typer.consoleInsert(msg + "\n ");
		if ($("#error-console").hasClass("hide")) {
			errCount = errCount + 1;						
			if (!$("#error-msg-count").hasClass("error-red")) {
				$("#error-msg-count").addClass("error-red");
			}
			$("#error-msg-count").html(errCount);
		} else {
			resetCount();
		}
	}

	function resetCount() {
		// Reset error count
		errCount = 0;
		$("#error-msg-count").removeClass("error-red");
		$("#error-msg-count").html("");
	}

	$("#error-console-header").click(function() {
		if($("#error-console").hasClass("hide")) {
			$("#error-console").fadeIn("fast").removeClass("hide");			
		} else {
			$("#error-console").fadeOut("fast").addClass("hide");
		}
		resetCount();
	});

});
