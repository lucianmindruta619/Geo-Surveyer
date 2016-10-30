/**
 * 
 */

$(document).ready(function() {

    var $filterBox = $("#point_data .filter_points input:text[name=point_txt]");
    var $orderEl = $("#point_data .order_points select[name=points_order_choices]");
    
    $filterBox
    .keyup(function( evtObj ) {

        var searchTxt = $filterBox.val().trim();
        
        if ( searchTxt == "" ) {
            $("#point_info > li").show();
        } else {
            var pattern = new RegExp( searchTxt, "i" );
            $("#point_info > li .code b").each(function() {
                if ( $(this).text().match( pattern ) ) {
                    $(this).parents( "li" ).show();
                } else {
                    $(this).parents( "li" ).hide();
                }
            });
        }

        evtObj.stopPropagation();
    }).focusout(function( evtObj ) {
        if ( $filterBox.val().trim() == "" ) {
            $filterBox.val( "Search" );
        }
    });

    $orderEl.change(function(e) {
        var orderBy = $(this).val();

        var result = $("#point_info > li").sort(function(itemA, itemB) {
            var itemAArr = getCodeAndCount( $(itemA).find(".code b").text() );
            var itemBArr = getCodeAndCount( $(itemB).find(".code b").text() );
            
            if ( itemAArr != null && itemBArr != null ) {
                switch(orderBy) {
                    case "code_asc":
                        return ( itemAArr[0] > itemBArr[0] ) ? 1: -1;
    
                    case "code_desc":
                        return ( itemAArr[0] < itemBArr[0] ) ? 1: -1;
    
                    case "count_asc":
                        return parseInt(itemAArr[1]) - parseInt(itemBArr[1]);
    
                    case "count_desc":
                        return parseInt(itemBArr[1]) - parseInt(itemAArr[1]);
                }
            }

            return 0;
        });
        
        $("#point_info").append(result);
    });
    
    function getCodeAndCount( label ) {
        label = label.replace("Code:","");
        label = label.trim();
        
        var result = [];
        var countSec = label.match(/\[[0-9]+\]$/);

        if ( countSec ) {
            countSec = countSec[0];
            var count = countSec.match(/[0-9]+/);
            if ( count ) {
                try {
                    count = parseInt(count[0]);
                } catch(ex) {
                    count = null;
                }
                
                if ( count ) {
                    var codeSec = label.replace(countSec,"").trim();
                    result = [codeSec,count];

                    return result;
                }
            }
        }
        
        return null;
    }

});
