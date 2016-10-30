/**
 * 
 */

$(document).ready(function() {	
    var load_surveys = function(target, search) {
        var loadingImg = $("<img/>");
        $(loadingImg).attr("src","img/spinner.gif");
        $(loadingImg).attr("class","loading-spinner");

		var survey_list_sec = $(target).siblings(".survey-list");
        
        $.ajax({
            type: "GET",
            url: "/surveys/",
            dataType: "html",
            data: { "search": search },
            beforeSend: function( jqXHR, settings ) {
                $("#survey-list-block button#close_surveys").show();
                $("#survey-list-block button#load_surveys").hide();
                $("#survey-list-block .list").show();
        
                survey_list_sec.find(".list .surveys").html($(loadingImg));
                $(target).attr( "disabled", "disabled" );
            },
            success: function(data, textStatus, jqXHR) {
				var list = $(target).siblings(".survey-list").find(".list");
                var surveys = $(list).find(".surveys");

				// clear previous list if any
				survey_list_sec.find(".list .surveys").empty();

                if ( data ) {
					// parse json
					var survey_list = $.parseJSON(data);

					// list to show on page, HTML
					var html_list = "<ul>";					
					// loop through list
					$.each(survey_list, function(index, element) {
        				html_list += "<li><a href=\"?" + element + "\" class=\"survey\">" + element + "</a></li>";
    				});	
					html_list += "</ul>";				

					surveys.html(html_list);
                } else {
					// list to show on page, HTML
					var html_list = "<ul>";					
					html_list += "<li><a href=\"#\" class=\"survey\">No surveys found.</a></li>";
					html_list += "</ul>";

					surveys.html(html_list);
				}

				$(list).find("img.loading-spinner").remove();
                $(target).removeAttr( "disabled" );
                // make sure the survey list fits the available area
                $(".surveys").css("max-height", ($(window).height() - $("#survey-list-block").parent().offset().top - 50) + "px");
            }, 
            error: function(jqXHR, textStatus, errorThrown) {
				jqConsole && jqConsole.error("Error! Could not load list.");
				
                var errorMsg = $("<div/>");
                $(errorMsg).addClass("error");
                $(errorMsg).text("Error! Could not load list.");

                $(target).siblings(".survey-list")
                .children(".list").html($(errorMsg));

                $(target).removeAttr( "disabled" );
            }
        });
    }
    
    var bind_events = function() {
        $(".survey-list .list .filters input#filter_search")
        .keyup(function(event) {
            var txt = $(this).val();
            load_surveys($("button#load_surveys"), txt.replace(/\W/, ""));
        })
        .keydown(function(event) {
            event.stopPropagation();
        });
        
    };

    $("button#load_surveys").click(function(evt) {
        $(this).siblings(".survey-list").find(".list .filters input#filter_search").val("");
        load_surveys($(this));
    });
    
    $("#survey-list-block button#close_surveys").click(function() {
        $("#survey-list-block .list").hide();
        $(this).hide();
        $("#survey-list-block button#load_surveys").show();
    });
    
    bind_events();
});
