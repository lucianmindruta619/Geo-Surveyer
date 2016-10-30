var pi = 3.14159265358974
var halfpi = 1.5707963267949
var threepi2 = 4.71238898038469
var twopi = 6.28318530717959
var degree = 57.29577951308232088
var radian = 0.01745329251994329577



function cross2(v1,v2)
{ 
    return (v1.x*v2.z - v2.x*v1.z);i
}

function dot2(v1,v2)   /* Return angle subtended by two vectors.  */
{ 
    var d = Math.sqrt(((v1.x*v1.x)+(v1.z*v1.z)) * ((v2.x*v2.x)+(v2.z*v2.z)));
    if (d != 0.0)
    {
        var t = (v1.x*v2.x+v1.z*v2.z)/d;
        return (Math.acos(t));
    } else {
      return ( 0.0);
    }
}


/* Draw circular arc in one degree increments. Center is (xc,yc)
        with radius r, beginning at starting angle, startang
        through angle ang. If ang < 0 arc is draw clockwise. */

function drawarc(xc, yc, r, startang, ang, lineHeight)
{
    var vertices = []
    var increment = 0.1;
    
    if(ang < 0) {
        for(var a=startang; a > startang+ang; a-=increment) {
            vertices.push(new THREE.Vector3(xc + r * Math.cos(a), lineHeight, yc + r * Math.sin(a)));
        }
    } else {
        for(var a=startang; a < startang + ang; a+=increment) {
            vertices.push(new THREE.Vector3(xc + r * Math.cos(a), lineHeight, yc + r * Math.sin(a)));
        }
    }
    
    return vertices;
}

/*        Find a,b,c in Ax + By + C = 0  for line p1,p2.         */

function linecoef(p1,p2)
{
    var c = (p2.x*p1.z)-(p1.x*p2.z);
    var a = p2.z-p1.z;
    var b = p1.x-p2.x;
    return [a,b,c]
}

/*       Return signed distance from line Ax + By + C = 0 to point P. */

function linetopoint(a,b,c,p)
{
    var d = Math.sqrt((a*a)+(b*b));
    var lp = 0.0;
    if (d == 0.0)
        lp =  0.0;
    else
        lp= (a*p.x+b*p.z+c)/d;
    return ( lp);
}

/*   Given line l = ax + by + c = 0 and point p,
     compute x,y so p(x,y) is perpendicular to l. */

function pointperp(a, b, c, p)
{
    var x = 0.0;
    var y = 0.0;
    var d = a*a +b*b;
    var cp = a*p.z-b*p.x;
    if (d != 0.0)
    {
         x = (-a*c-b*cp)/d;
         y = (a*cp-b*c)/d;
    }
    return [x,y]
}

/*      Compute a circular arc fillet between lines L1 (p1 to p2) and
    L2 (p3 to p4) with radius R.  The circle center is xc,yc.      */

function fillet(vp1, vp2, vp3, vp4, r)
{
        var lineHeight = vp1.y;
        var p1 = new THREE.Vector3(vp1.x, vp1.y, vp1.z);
        var p2 = new THREE.Vector3(vp2.x, vp2.y, vp2.z);
        var p3 = new THREE.Vector3(vp3.x, vp3.y, vp3.z);
        var p4 = new THREE.Vector3(vp4.x, vp4.y, vp4.z);


        var gv1 = new THREE.Vector3(0,0,0);
        var gv2 = new THREE.Vector3(0,0,0);

        var LC1 = linecoef(p1,p2);
        var LC2 = linecoef(p3,p4);

        var a1 = LC1[0]
        var b1 = LC1[1]
        var c1 = LC1[2]
        var a2 = LC2[0]
        var b2 = LC2[1]
        var c2 = LC2[2]


        if ((a1*b2) == (a2*b1))  /* Parallel or coincident lines */ {
            return;
        }

        var mp = new THREE.Vector3(0,0,0);
        mp.x = (p3.x + p4.x)/2.0;
        mp.z = (p3.z + p4.z)/2.0;
        var d1 = linetopoint(a1,b1,c1,mp);  /* Find distance p1p2 to p3 */
        if (d1 == 0.0) {
            return;
        }

        mp.x = (p1.x + p2.x)/2.0;
        mp.z = (p1.z + p2.z)/2.0;
        var d2 = linetopoint(a2,b2,c2,mp);  /* Find distance p3p4 to p2 */
        if (d2 == 0.0) {
            return;
        }

        var rr = r;
        if (d1 <= 0.0) 
            rr = -rr;

        var c1p = c1-rr*Math.sqrt((a1*a1)+(b1*b1));  /* Line parallel l1 at d */
        rr = r;

        if (d2 <= 0.0) rr= -rr;

        var c2p = c2-rr*Math.sqrt((a2*a2)+(b2*b2));  /* Line parallel l2 at d */
        var d = a1*b2-a2*b1;

        xc = (c2p*b1-c1p*b2)/d;            /* Intersect constructed lines */
        yc = (c1p*a2-c2p*a1)/d;            /* to find center of arc */
        var pc = new THREE.Vector3(0,0,0);
        pc.x = xc;
        pc.z = yc;

        var xaya = pointperp(a1,b1,c1,pc);      /* Clip or extend lines as required */
        var xa = xaya[0];
        var ya = xaya[1];
        var xbyb = pointperp(a2,b2,c2,pc);
        var xb = xbyb[0];
        var yb = xbyb[1];

        p2.x = xa; p2.z= ya;
        p3.x = xb; p3.z= yb;
        gv1.x = xa-xc; gv1.z= ya-yc;
        gv2.x = xb-xc; gv2.z= yb-yc;

        var pa =  Math.atan2(gv1.z,gv1.x);     /* Beginning angle for arc */
        var aa = dot2(gv1,gv2);
        if (cross2(gv1,gv2) < 0.0) aa = -aa; /* Angle subtended by arc */

        var curve = [p2]
        curve = curve.concat(drawarc(xc,yc,r,pa,aa,lineHeight));
        curve.push(p3);
        return curve;


}
