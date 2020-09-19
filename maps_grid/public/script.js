// Graticule for google.maps v3
//
// Adapted from Bill Chadwick 2006 http://www.bdcc.co.uk/Gmaps/BdccGmapBits.htm
// which is free for any use.
//
// This work is licensed under the Creative Commons Attribution 3.0 Unported
// License. To view a copy of this license, visit
// http://creativecommons.org/licenses/by/3.0/ or send a letter to Creative
// Commons, 171 Second Street, Suite 300, San Francisco, California, 94105,
// USA.
//
// Matthew Shen 2011
//
// Reworked some more by Bill Chadwick ...
//

var map;
var grid;
var bermudaTriangle;
var coordinates = [[28.069160, -82.427330],
    [28.068680, -82.412050],
    [28.054630, -82.434517],
    [28.042471, -82.416199],
    [28.0740157, -82.4152913],
    [28.0740125, -82.4152952],
    [28.0740158, -82.4152966],
    [28.0545103, -82.3953101],
    [28.073943, -82.4152974],
    [28.073581, -82.4146716],
    [28.0728172, -82.4145242],
    [28.0716853, -82.4144124],
    [28.0716727, -82.4144327],
    [28.0728468, -82.4134624],
    [28.0735191, -82.4134293],
    [28.0740155, -82.4152868],
    [28.0740098, -82.4152918],
    [28.0740448, -82.4152923],
    [28.0740159, -82.4152898],
    [28.074015, -82.4152935],
    [28.0740256, -82.4152906],
    [28.0740151, -82.4152918],
    [28.0740249, -82.4153061],
    [28.0740135, -82.4152939],
    [28.0740222, -82.415296],
    [28.0740046, -82.4152688],
    [28.0740086, -82.4152823],
    [28.0740035, -82.4152563]]

var bermudaRectangles = {}

for (var i = 0; i < coordinates.length; i++){
    bermudaRectangles[coordinates[i].toString()] = null
}


var Graticule = (function() {
    function _(map, sexagesimal) {
        // default to decimal intervals
        this.sex_ = sexagesimal || false;
        this.set('container', document.createElement('DIV'));

        this.show();

        this.setMap(map);
    }
    _.prototype = new google.maps.OverlayView();
    _.prototype.addDiv = function(div) {
        this.get('container').appendChild(div);
    },
  _.prototype.decToLonSex = function(d) {
      var degs = Math.floor(Math.abs(d));
      var mins = ((Math.abs(d) - degs) * 60.0).toFixed(2);
      if (mins == "60.00") { degs += 1.0; mins = "0.00"; }
      return [degs, (d>0)?"E":"W", mins].join('');
  };
  
    _.prototype.decToLatSex = function(d) {
      var degs = Math.floor(Math.abs(d));
      var mins = ((Math.abs(d) - degs) * 60.0).toFixed(2);
      if (mins == "60.00") { degs += 1.0; mins = "0.00"; }
      return [degs, (d>0)?"N":"S", mins].join('');
  };
    _.prototype.onAdd = function() {
        var self = this;
        this.getPanes().mapPane.appendChild(this.get('container'));

        function redraw() {
            self.draw();
        }
        this.idleHandler_ = google.maps.event.addListener(this.getMap(), 'idle', redraw);

        function changeColor() {
            self.draw();
        }
        changeColor();
        this.typeHandler_ = google.maps.event.addListener(this.getMap(), 'maptypeid_changed', changeColor);
    };
    _.prototype.clear = function() {
        var container = this.get('container');
        while (container.hasChildNodes()) {
            container.removeChild(container.firstChild);
        }
    };
    _.prototype.onRemove = function() {
        this.get('container').parentNode.removeChild(this.get('container'));
        this.set('container', null);
        google.maps.event.removeListener(this.idleHandler_);
        google.maps.event.removeListener(this.typeHandler_);
    };
    _.prototype.show = function() {
        this.get('container').style.visibility = 'visible';
    };
    _.prototype.hide = function() {
        this.get('container').style.visibility = 'hidden';
    };

    function _bestTextColor(overlay) {
        var type = overlay.getMap().getMapTypeId();
        var GMM = google.maps.MapTypeId;
        if (type === GMM.HYBRID) return '#fff';
        if (type === GMM.ROADMAP) return '#000';
        if (type === GMM.SATELLITE) return '#fff';
        if (type === GMM.TERRAIN) return '#000';
        var mt = overlay.getMap().mapTypes[type];
        return (mt.textColor) ? mt.textColor : '#fff'; //ported legacy V2 map layers may have a textColor property
    };

    function gridPrecision(dDeg) {
        if (dDeg < 0.01) return 3;
        if (dDeg < 0.1) return 2;
        if (dDeg < 1) return 1;
        return 0;
    }

    function leThenReturn(x, l, d) {
        for (var i = 0; i < l.length; i += 1) {
            if (x <= l[i]) {
                return l[i];
            }
        }
        return d;
    }

    var numLines = 10;
    var decmins = [
        0.06, // 0.001 degrees
        0.12, // 0.002 degrees
        0.3, // 0.005 degrees
        0.6, // 0.01 degrees
        1.2, // 0.02 degrees
        3, // 0.05 degrees
        6, // 0.1 degrees
        12, // 0.2 degrees
        30, // 0.5
        60, // 1
        60 * 2,
        60 * 5,
        60 * 10,
        60 * 20,
        60 * 30,
    ];
    var sexmins = [
        0.01, // minutes
        0.02,
        0.05,
        0.1,
        0.2,
        0.5,
        1.0,
        3, // 0.05 degrees
        6, // 0.1 degrees
        12, // 0.2 degrees
        30, // 0.5
        60, // 1
        60 * 2,
        60 * 5,
        60 * 10,
        60 * 20,
        60 * 30,
    ];

    function mins_list(overlay) {
        if (overlay.sex_) return sexmins;
        return decmins;
    }

    function latLngToPixel(overlay, lat, lng) {
        return overlay.getProjection().fromLatLngToDivPixel(
      new google.maps.LatLng(lat, lng));
    };

    // calculate rounded graticule interval in decimals of degrees for supplied
    // lat/lon span return is in minutes
    function gridInterval(dDeg, mins) {
        return leThenReturn(Math.ceil(dDeg / numLines * 6000) / 100, mins,
                        60 * 45) / 60;
    }

    function npx(n) {
        return n.toString() + 'px';
    }

    function makeLabel(color, x, y, text) {
        var d = document.createElement('DIV');
        var s = d.style;
        s.position = 'absolute';
        s.left = npx(x);
        s.top = npx(y);
        s.color = color;
        s.width = '3em';
        s.fontSize = '1.0em';
        s.whiteSpace = 'nowrap';
        d.innerHTML = text;
        return d;
    };

    function createLine(x, y, w, h, color) {
        var d = document.createElement('DIV');
        var s = d.style;
        s.position = 'absolute';
        s.overflow = 'hidden';
        s.backgroundColor = color;
        s.opacity = 0.3;
        var s = d.style;
        s.left = npx(x);
        s.top = npx(y);
        s.width = npx(w);
        s.height = npx(h);
        return d;
    };

    var span = 50000;
    function meridian(px, color) {
        return createLine(px, -span, 1, 2 * span, color);
    }
    function parallel(py, color) {
        return createLine(-span, py, 2 * span, 1, color);
    }
    function eqE(a, b, e) {
        if (!e) {
            e = Math.pow(10, -6);
        }
        if (Math.abs(a - b) < e) {
            return true;
        }
        return false;
    }

    // Redraw the graticule based on the current projection and zoom level
    _.prototype.draw = function() {
        var color = _bestTextColor(this);

        this.clear();

        for (var i = 0; i < coordinates.length; i++) {
            if (bermudaRectangles[coordinates[i].toString()] !== null) {
                bermudaRectangles[coordinates[i].toString()].setMap(null);
                bermudaRectangles[coordinates[i].toString()] = null
            }
        }

        if (this.get('container').style.visibility != 'visible') {
            return;
        }

        // determine graticule interval
        var bnds = this.getMap().getBounds();
        if (!bnds) {
            // The map is not ready yet.
            return;
        }

        var sw = bnds.getSouthWest(),
        ne = bnds.getNorthEast();
        var l = sw.lng(),
        b = sw.lat(),
        r = ne.lng(),
        t = ne.lat();
        if (l == r) { l = -180.0; r = 180.0; }
        if (t == b) { b = -90.0; t = 90.0; }

        // grid interval in degrees
        var mins = mins_list(this);
        var dLat = gridInterval(t - b, mins);
        var dLng = gridInterval(r > l ? r - l : ((180 - l) + (r + 180)), mins);

        // round iteration limits to the computed grid interval
        l = Math.floor(l / dLng) * dLng;
        b = Math.floor(b / dLat) * dLat;
        t = Math.ceil(t / dLat) * dLat;
        r = Math.ceil(r / dLng) * dLng;
        if (r == l) l += dLng;
        if (r < l) r += 360.0;

        // lngs
        var crosslng = l + 2 * dLng;
        // labels on second column to avoid peripheral controls
        var y = latLngToPixel(this, b + 2 * dLat, l).y + 2;

        var prev_lng = l
        var grid_map = {}
        // lo<r to skip printing 180/-180
        for (var lo = l; lo < r; lo += dLng) {
            if (lo > 180.0) {
                r -= 360.0;
                lo -= 360.0;
            }
            var px = latLngToPixel(this, b, lo).x;
            this.addDiv(meridian(px, color));
            
            for(var i = 0; i < coordinates.length; i++) {
                if (lo >= coordinates[i][1] && coordinates[i][1] >= prev_lng)
                {
                    grid_map[coordinates[i].toString()] = {
                        'coordinate_lng_left' : prev_lng, 
                        'coordinate_lng_right' : lo
                    }
                }
            }
            prev_lng = lo 

            var atcross = eqE(lo, crosslng);
            /*this.addDiv(makeLabel(color,
        px + (atcross ? 17 : 3), y - (atcross ? 3 : 0), ));*/
        }

        // lats
        var crosslat = b + 2 * dLat;
        // labels on second row to avoid controls
        var x = latLngToPixel(this, b, l + 2 * dLng).x + 3;

        var prev_lat = b
        var initial_b = b
        for (; b <= t; b += dLat) {
            var py = latLngToPixel(this, b, l).y;
            this.addDiv(parallel(py, color));
            
            for(var i = 0; i < coordinates.length; i++) {
                if (b >= coordinates[i][0] && coordinates[i][0] >= prev_lat)
                {
                    if (grid_map[coordinates[i].toString()] !== undefined) {
                        grid_map[coordinates[i].toString()]['coordinate_lat_left'] = prev_lat
                        grid_map[coordinates[i].toString()]['coordinate_lat_right'] = b
                    }
                }
            }
            
            prev_lat = b 

            /*this.addDiv(makeLabel(color,
        x, py + (eqE(b, crosslat) ? 7 : 2),
        (this.sex_ ? this.decToLatSex(b) : b.toFixed(gridPrecision(dLat)))));*/
        }

        var area_found = null
        for(var i = 0; i < coordinates.length; i++) {

            if (grid_map[coordinates[i].toString()] !== undefined && Object.keys(grid_map[coordinates[i].toString()]).length === 4) {
                // Construct the polygon.
                var south_lat = grid_map[coordinates[i].toString()]['coordinate_lat_left'];
                var north_lat = grid_map[coordinates[i].toString()]['coordinate_lat_right'];
                var west_lng = grid_map[coordinates[i].toString()]['coordinate_lng_left'];
                var east_lng = grid_map[coordinates[i].toString()]['coordinate_lng_right'];
                bermudaRectangles[coordinates[i].toString()] = new google.maps.Rectangle({
                    bounds: {
                        south: south_lat,
                        north: north_lat,
                        west: west_lng,
                        east: east_lng
                    },
                    strokeColor: "#FF0000",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: "#FF0000",
                    fillOpacity: 0.15
                });

                bermudaRectangles[coordinates[i].toString()].setMap(map);
                
                if (google.maps.geometry !== undefined && area_found === null) {
                    var southWest = new google.maps.LatLng(south_lat, west_lng);
                    var northEast = new google.maps.LatLng(north_lat, east_lng);
                    var southEast = new google.maps.LatLng(south_lat, east_lng);
                    var northWest = new google.maps.LatLng(north_lat, west_lng);
                    area_found = google.maps.geometry.spherical.computeArea([northEast, northWest, southWest, southEast]) / (1000000);
                    area_found *= 0.386102159; //convert to miles squared instead of km squared
                    area_found = parseFloat(area_found.toFixed(2))
                    document.getElementById('area').innerHTML = area_found
                }
            }
        }

    };


    return _;
})();

function initialize() {
    var myOptions = {
        zoom: 10,
        maxZoom: 21,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        panControl: false,
        draggableCursor: "default",
        streetViewControl: true
    }
    
    map = new google.maps.Map(document.getElementById('map_div'), myOptions);

    var geocoder = new google.maps.Geocoder();

    geocoder.geocode({'address': 'Tampa'}, function (results, status) {
        var ne = results[0].geometry.viewport.getNorthEast();
        var sw = results[0].geometry.viewport.getSouthWest();
        map.fitBounds(results[0].geometry.viewport);               
    }); 

    grid = new Graticule(map, true);

    document.getElementById('confirm').style.marginTop = "20px"
    document.getElementById('confirm').style.fontSize = "20px"
    document.getElementById('confirm').style.paddingTop = "10px"
    document.getElementById('confirm').style.paddingBottom = "10px"
    document.getElementById('confirm').style.paddingLeft = "15px"
    document.getElementById('confirm').style.paddingRight = "15px"
}