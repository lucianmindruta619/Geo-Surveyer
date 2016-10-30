// http://jsfiddle.net/FfPXq/6/
// http://stackoverflow.com/questions/5009194/how-to-use-jquery-deferred-with-custom-events

(function( $ ) {
    
    $.fn.when = function( events ) {
        
        events = events.split( /\s/g );
        
        var deferreds = [],
            iElem,
            lengthElem = this.length,
            iEvent,
            lengthEvent = events.length,
            elem;
        
        for( iElem = 0; iElem < lengthElem; iElem++ ) {
            elem = $( this[ iElem ] );
            for ( iEvent = 0; iEvent < lengthEvent; iEvent++ ) {
                deferreds.push( $.Deferred(function( defer ) {
                    var element = elem,
                        event = events[ iEvent ];
                    function callback() {
                        element.unbind( event, callback );
                        defer.resolve();
                    }
                    element.bind( event, callback );
                }) );
            }
        }
        return $.when.apply( null, deferreds );
    };
    
})( jQuery );
