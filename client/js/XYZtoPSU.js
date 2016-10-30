var fileInput = document.getElementById('fileInput');

//$(function() {
/**
 * File Input & DOING STUFF ON LOAD
 */
function loadData(surveyID) {
    $.ajax({
        url: 'http://dondnadev02.donovanassociates.com.au/media/uploaded/' + surveyID + '/' + surveyID + '.asc',
        success: function(result){
            convertData(result)
        }
    })
}
function convertData(data){
        //fileInput && fileInput.addEventListener('change', function(e) {
        //var file = fileInput.files[0];
        //var textType = /text.*/;
        //if (file.type.match(textType)) {
            //var reader = new FileReader();

            //reader.onload = function (e) {

                var lines = data.split('\n');

                var stationFile = [];


                /**
                 * SAMPLE FORMAT OF A S ARRAY.
                   (CAN BE IMPORTED OR BE PASTE HERE MANUALLY)
                 */

                /*     var  stationFile=[
                 {st_id:1,start:1,end:5,x:3002000,y:60000400,z:0,HI:1.5},
                 {st_id:2,start:6,end:10,x:3000300,y:60005000,z:0,HI:1.5},
                 {st_id:3,start:11,end:10405,x:3005000,y:60800000,z:0,HI:1.5}
                 ];
                 */


                /**
                 * CREATING AN IMAGINARAY STATION
                   (IF THERE IS NO STATION FOR OUR POINTS)
                 */

                if (stationFile.length == 0) {

                    var imstation = imaginaryStation(lines);

                    stationFile = [
                        {st_id: 1, start: 1, end: lines.length,
                            x: imstation.x, y: imstation.y, z: imstation.z, HI: 1.5}
                    ];
                }

                /**
                 * put lines in xyz array
                   according to their related stations
                 */

                var xyzs = fileToArray(lines, stationFile);

                if (xyzs) {
                    var PSUFiles = XYZtoPSU(xyzs, stationFile);
		            triggerDownload(PSUFiles);
                }
            //}

            //reader.readAsText(file);
        //} else {
        //    console.log("File not supported!");
        //}

    }

/**
 * INTRODUCING FILEINPUT WHEN LOADING
 */

  /*$("#fileInput").click(function() {

      fileInput = document.getElementById('fileInput');

  });*/



/**
 * Tell the browser to download the files produced.
 *
 * */

/**
 * 
 * From an array of points.
 * 
*/

function pointArrayToArray(pointArray, stationFile) {
    var xyz = [];

    var pointCount = 1;

     for (var i = 0; i < pointArray.length; i++) {
         var elemspoint = pointArray[i];
         for (var j = 0; j < stationFile.length; j++) {
             if (elemspoint.length > 2) {
                 if ((stationFile[j].start <= pointCount) & (pointCount <= stationFile[j].end)) {

                     var stationId = stationFile[j].st_id;
                     var setup = j;
                     var HR = 1.5;
                     var code = "NS";
                     var id = pointCount;

                     xyz[pointCount] = newPnt(elemspoint, stationId, setup, id, HR, code);
                     pointCount++
                 }
             }
         }
     }

    return xyz;
}


/**
 * SPLIT LINES ACCORDING TO COMMAS
 * ADD AN ELEMENT AS STATIONID FOR STATION
   REFERENCE FOR EACH POINT
 *
*/

function fileToArray(lines,stationFile) {

    var xyz = [];

    var pointCount = 1;

     for (var i = 0; i < lines.length; i++) {
         var elemspoint = (lines[i]).split(',');
         for (var j = 0; j < stationFile.length; j++) {
             if (elemspoint.length > 2) {
                 if ((stationFile[j].start <= pointCount) & (pointCount <= stationFile[j].end)) {

                     var stationId = stationFile[j].st_id;
                     var setup = j;
                     var HR = 1.5;
                     var code = "NS";
                     var id = pointCount;

                     xyz[pointCount] = newPnt(elemspoint, stationId, setup, id, HR, code);
                     pointCount++
                 }
             }
         }
     }

    return xyz;
}

/**
 * CREATE AN OBJECT FOR EACH XYZ
 *
 */

function newPnt(array,stationId,setup,id,HR,code) {
        var xyz = {
            id: id,
            st_id: stationId,
            setupNo: setup,
            slopeDist: "",
            HAngle: "",
            VAngle: "",
            HR: HR,
            code: code,
            x: parseFloat(array[0]),
            y: parseFloat(array[1]),
            z: parseFloat(array[2])

        }

        return xyz;
}

/**
 * CREATE AN IMAGINARY STATION
 * ACCORDING TO BOUNDING BOX OF COORS
 * (RETURN STATION)
 */

function imaginaryStation(lines) {

    var x = [], y = [] , z = [] , s = [];


    for (var i = 0; i < lines.length; i++) {
        elems = (lines[i]).split(',');
        x[i] = parseFloat(elems[0]);
        y[i] = parseFloat(elems[1]);
        z[i] = parseFloat(elems[2]);
    }

    var xMaxMin = MaxMin(x);
    var yMaxMin = MaxMin(y);

    s[0] = (xMaxMin.min) - (((xMaxMin.max) - (xMaxMin.min)) / 5);
    s[1] = (yMaxMin.min) - (((yMaxMin.max) - (yMaxMin.min)) / 5);
    s[2] = 0;

    var station = {x: s[0], y: s[1], z: s[2]};

    return(station);
}

/**
 * FINDS BOUNDING OF AN ARRAY
 * RETURNS AN OBJECT (MAX & MIN)
 *
 */

function MaxMin(array) {
    var min = array[0];
    var max = array[0];

    for (var i = 0; i < array.length; i++) {

        if (min > array[i]) {
            min = array[i]
        }

        if (max < array[i]) {
            max = array[i]
        }
    }

    var answer = {min: min, max: max};
    return answer;
}

/**
 *
 *  MAIN FUNCTION
 * CONVERTS XYZ OBJECT TO FORMAT .P
 * CONVERTS STATION FILE TO FORMAT .S
 * CREATES .U FILE USING POINTS
 * RETURNS AN OBJECTS WITH 3 STRINGS P, S , U
 *
 */
function XYZtoPSU(points,stationFile) {   //Main Function


    for (var i = 1; i < points.length; i++) {

        var relStation = RelStation(points[i], stationFile);
        var Slopedist = SlopeDist(points[i], relStation);
        points[i].slopeDist = parseFloat(parseFloat(Slopedist).toFixed(3));

        var Vangle = (VerticalAngle(points[i], Slopedist, relStation));
        points[i].VAngle = parseFloat(parseFloat(DegtoBear(Vangle)).toFixed(4));
        var Hangle = (HorizontalAngle(points[i], Vangle, Slopedist, relStation));
        points[i].HAngle = parseFloat(parseFloat(DegtoBear(Hangle)).toFixed(4));
    }
    var finalP = CreatePObj(points);
    var finalS = CreateSObj(stationFile);
    var finalU = CreateUObj(points);

    var result = {P: finalP, U: finalU, S: finalS};
    //console.log(result.S);

    //console.log(result.U);

    //console.log(result.P);
    
    

    return result;
}

/**
 * CALCULATES SLOPEDISTANCE BETWEEN
 * STATION AND ONE POINT
 * RETURNS A DOUBLE AS SLOPEDIST
 *
 */

function SlopeDist(point, station) {

    var slopedist = Math.pow((Math.pow((point.x - station.x), 2) +

        Math.pow((point.y - station.y), 2) +
        Math.pow((point.z - station.z), 2)), (1 / 2));

    return slopedist;
}

/**
 * CALCULATES VERTICAL ANGLE BETWEEN
 * STATION AND ONE POINT
 * RETURNS A DOUBLE AS SLOPEDIST
 *
 */

function VerticalAngle(point, slopeDist, station) {

        var verticalAngle = (Math.acos((point.z - station.z + point.HR - station.HI) / slopeDist) * 180 / Math.PI);

        return verticalAngle;

}

/**
 * CALCULATES HorizontalAngle BETWEEN
 * STATION AND ONE POINT
 * RETURNS A DOUBLE AS HORIZONTALANGLE
 *
 */

function HorizontalAngle(point, verticalAngle, slopeDist, station) {
    var hDist = (slopeDist * (Math.sin(verticalAngle * Math.PI / 180)));

    var HAngle = (Math.acos((point.y - station.y) / hDist) * 180 / Math.PI);

    return HAngle;
}



/**
 * CONVERT DESIMAL DEGREE
 * TO DEGREE MINUTE SECOND
 * RETURNS A DOUBLE AS DEGTOBEAR
 *
 */
function DegtoBear(x) {

    var y1, y2, y3;
    var y, y2y3;

    y1 = parseInt(x);
    y2y3 = (x - y1) * 3600;
    y2 = parseInt(y2y3 / 60);
    y3 = parseFloat(y2y3 - y2 * 60).toFixed(1);
    y = y1 + y2 / 100 + y3 / 10000
    degtoBear = y;

    return degtoBear; //return a number of dd.mmss...
}

/**
 * CREATE THE P STRING FROM POINTS
 *
 * RETURNS A STRING AS PLINE
 *
 */

function CreatePObj(points) {

    var pline = "{\n";

    for (var i = 1; i < points.length; i++) {
        if (points[i]) {

            pline += "{ " + points[i].id + " " + points[i].setupNo + " " + points[i].slopeDist + " " + points[i].HAngle +
                " " + points[i].VAngle + " " + points[i].HR + ' "' + points[i].code + '" }\n';
        }
    }

    pline += "}";
    return (pline);

}

/**
 * CREATE THE U STRING FROM POINTS, STATIONS
 *
 * RETURNS A STRING AS ULINE
 *
 */


function CreateUObj(points) {

    var Uarr = [];
    var t = 1;

    var uline = "{\n";
    for (var i = 2; i < points.length; i++) {

        if (points[i]) {

            if (points[i].setupNo != points[i - 1].setupNo) {
                console.log(points[i - 1].st_id);
                var now = DateTime();


                Uarr[t] = {
                    id: points[i - 1].setupNo,
                    date: now.date,
                    sTime: now.time,
                    st_id: points[i - 1].st_id,
                    HR: points[i - 1].HR,
                    eTime: now.time,
                    lastPId: points[i - 1].id
                }
                uline += "{ " + Uarr[t].id + ' "DN" ' + parseFloat(Uarr[t].date) + " " + parseFloat(Uarr[t].sTime) +
                    ' 5 "" "' + Uarr[t].st_id + '" ' + parseFloat(Uarr[t].HR) + " " + parseFloat(Uarr[t].eTime) +" "+ Uarr[t].lastPId + " 1 0 4 1 }\n";

                t++;

            }

        }
    }

    now = DateTime();

    Uarr[t] = {
        id: points[i - 1].setupNo,
        date: now.date,
        sTime: now.time,
        st_id: points[i - 1].st_id,
        HR: points[i - 1].HR,
        eTime: now.time,
        lastPId: points[i - 1].id
    }
    uline += "{ " + Uarr[t].id + ' "DN" ' + parseFloat(Uarr[t].date) + " " + parseFloat(Uarr[t].sTime) +
        ' 5 "" "' + Uarr[t].st_id + '" ' + parseFloat(Uarr[t].HR) + " " + parseFloat(Uarr[t].eTime) +" "+ Uarr[t].lastPId + " 1 0 4 1 }\n";

    uline += "}"
return uline;
}

/**
 * GET THE CURRENT DATE AND TIME
 *
 * RETURNS AN OBJECT {DATE,TIME}
 *
 */

function DateTime(){
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();
    var h=today.getHours();
    var min= today.getMinutes();
    var ss=today.getSeconds();
    var ms = today.getMilliseconds();

    if(dd<10) {
        dd='0'+dd
    }

    if(mm<10) {
        mm='0'+mm
    }


    today = dd+'.'+mm+yyyy;
    var  nowt =h+"."+min+ss+ms;
    var now={date:today,time:nowt};
    return now;

}


/**
 * FIND RELATED STATION TO EACH POINT
 * USING POINTS ST_ID AND STATIONS ID
 * RETURNS AN OBJECT (RELATED STATION)
 *
 */

function RelStation(point,stationFile) {


    var relStation = {};
    for (var t = 0; t < stationFile.length; t++) {


        if (point.st_id == stationFile[t].st_id) {
            relStation = stationFile[t];
        }
    }
    return relStation;
}

/**
 * CREATE THE S STRING FROM STATIONS
 *
 * RETURNS A STRING AS SLINE
 *
 */

function CreateSObj(stationFile) {

    var sline = "{\n";
    for (var i = 0; i < stationFile.length; i++) {

        if (stationFile[i]) {

            sline += "{ " + stationFile[i].st_id + ' "Generated" ' + stationFile[i].x
                + " " + stationFile[i].y +" " + stationFile[i].z + " }\n";
        }
    }
    sline += "}";

    return sline;
}