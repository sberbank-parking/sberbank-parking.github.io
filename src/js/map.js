var info_container = document.querySelector('.info-container');
var filter = { id: "", address: "", region: [], type: [], xck: false, minRisk: 0.0, maxRisk: 10000.0 };

var map = L.map(
    "map",
    {
        center: [64.6863136, 97.7453061],
        crs: L.CRS.EPSG3857,
        zoom: 4,
        /*zoomControl: true,*/
        zoomControl: false,
        preferCanvas: false,
    }
);

var cur_pos;
map.locate({ setView: true, watch: false })
    .on('locationfound', function (e) {
        cur_pos = L.marker([e.latitude, e.longitude], { icon: L.icon({ iconUrl: 'src/image/locate.svg', iconSize: [40, 40] }) }).addTo(map);
    })
    .on('locationerror', function (e) {
        L.popup()
            .setLatLng(map.getCenter())
            .setContent('Доступ к определению местоположения отключён')
            .openOn(map);
            showBoundsInfo();
    });

var tile_layer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { "attribution": "Data by \u0026copy; \u003ca href=\"http://openstreetmap.org\"\u003eOpenStreetMap\u003c/a\u003e, under \u003ca href=\"http://www.openstreetmap.org/copyright\"\u003eODbL\u003c/a\u003e.", "detectRetina": false, "maxNativeZoom": 18, "maxZoom": 18, "minZoom": 0, "noWrap": false, "opacity": 1, "subdomains": "abc", "tms": false }
).addTo(map);

const basemaps = {
    StreetView: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }),
    // Topography: L.tileLayer.wms('http://ows.mundialis.de/services/service?',   {layers: 'TOPO-WMS'}),
    Places: L.tileLayer.wms('http://ows.mundialis.de/services/service?', { layers: 'OSM-Overlay-WMS' })
};
L.control.layers(basemaps).addTo(map);

var marker_cluster = L.markerClusterGroup();

markers.forEach(m => {
    var marker = L.marker([m[0], m[1]], { id: m[2], type: m[3], address: m[4], xck: m[5], risk: m[6] }).addTo(marker_cluster);
    /*var icon = L.AwesomeMarkers.icon(
        { "extraClasses": m[7], "icon": m[8], "iconColor": m[9], "markerColor": m[10], "prefix": m[11] }
    );*/
    var icon = L.icon({
        iconUrl: 'src/image/marker.svg',
        // shadowUrl: 'leaf-shadow.png',

        iconSize: [38, 44],
        // shadowSize:   [50, 64], 
        iconAnchor: [19, 39]
        // shadowAnchor: [4, 62],  
        // popupAnchor:  [-3, -76] 
    });
    marker.setIcon(icon);

    marker.on('click', function (e) {
        info_container.innerHTML =
            `<p><span>${e.target.options.id} ${e.target.options.type}</span></p>
        <p>${e.target.options.address}</p>    
        <p><span>${e.target.options.risk}</span> млн.рублей под риском</p> 
        ${e.target.options.xck != 0 ? '<p>&check; Хранилище ценностей клиентов</p>' : ''}`;
        //info_container.style.visibility = "visible";
    });

    marker.on('mouseout', function (e) {
        showBoundsInfo();
    });
});

map.on('zoomend', function () {
    if (map.hasLayer(cur_pos))
        cur_pos.removeFrom(map);

    showBoundsInfo();
});


function showBoundsInfo() {
    let count = 0;
    let sum = 0;
    //info_container.style.visibility = "hidden";
    let bounds = map.getBounds();
    marker_cluster.eachLayer(function (layer) {
        if (bounds.contains(layer.getLatLng())) {
            sum += layer.options.risk;
            count++;
        }
    });
    info_container.innerHTML = `<p><span>${count}</span> ВСП</p>
        <p><span>${sum.toFixed(2)}</span> млн.рублей под риском</p>`;
    //info_container.style.visibility = "visible";
}


marker_cluster.options.iconCreateFunction = function (cluster) {
    var markers = cluster.getAllChildMarkers();
    var sum = 0;
    var childCount = cluster.getChildCount();
    var c = ' marker-cluster-';
    for (var i = 0; i < markers.length; i++) {
        sum += markers[i].options.risk;
    }
    var avg = sum.toFixed(2);
    if (childCount < 50) {
        c += 'small';
    } else if (childCount < 300) {
        c += 'medium';
    } else {
        c += 'large';
    };

    return L.divIcon({
        // html: '<div><span>' + avg + '</span></div>',
        html: '<div><span>' + childCount + '</span></div>',
        className: 'marker-cluster' + c,
        iconSize: new L.Point(40, 40)
    });
};
map.addLayer(marker_cluster);

void document.querySelectorAll('.filter-input').forEach((element) => {
    element.addEventListener('change', function () {
        search(element.id, element.value);
    });
});

void document.querySelectorAll('.filter-checkbox').forEach((element) => {
    element.addEventListener('change', function () {
        search(element.id, element.checked);
    });
});

let selected = [];
const checkboxes = document.querySelectorAll('.type, .region');
checkboxes.forEach((element) => {
    element.addEventListener('change', function () {
        selected = Array.from(checkboxes).filter(x => x.checked && x.className === element.className).map(x => x.value);
        search(element.className, selected);
    });
});

function search(key, value) {
    if (filter[key] != value) {
        filter[key] = value;
        //console.log("filter: " + JSON.stringify(filter));
        let latlngs = [];
        marker_cluster.eachLayer(function (layer) {
            let found = false;
            for (const key in filter) {
                //console.log("filter: " + JSON.stringify(filter));
                //console.log("filter key: " + key + " value: " + filter[key]);
                switch (key) {
                    case 'id':
                        found = layer.options.id.startsWith(filter[key]);
                        break;
                    case 'address':
                        found = layer.options.address.includes(filter[key]);
                        break;
                    case 'region':
                        found = filter[key].length > 0 ? filter[key].filter(e => layer.options.id.startsWith(e)).length > 0 : true;
                        break;
                    case 'type':
                        found = filter[key].length > 0 ? filter[key].includes(layer.options.type) : true;
                        break;
                    case 'xck':
                        found = (layer.options.xck === (filter[key] ? 1 : 0));
                        break;
                    case 'minRisk':
                        found = (layer.options.risk >= filter[key]);
                        break;
                    case 'maxRisk':
                        found = (layer.options.risk <= filter[key]);
                        break;
                    default:
                        break;
                }
                if (!found)
                    break;
            }

            if (found)
                latlngs.push(layer.getLatLng());
        });
        //console.log(latlngs.length);
        if (latlngs.length > 0) {
            let bounds = L.latLngBounds(latlngs);
            map.fitBounds(bounds);
        }
        else {
            map.locate({ setView: true, watch: false });
        }
    }
}
