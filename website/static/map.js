mapboxgl.accessToken = window.MAPBOX_SECRET_KEY;

// base map 
var map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [103.8822, 1.2999],
  zoom: 15,
});

async function fetchGeoJSONData() {
  const response = await fetch("/carparks", {
    method: "GET",
  });
  geojsonData = await response.json();
}

async function waitTillTargetReady(isTargetReady, milliseconds) {
  while (!isTargetReady()) {
    // wait 1 second before retrying
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}

function isMapLoaded() {
  return map && map.loaded();
}

// loading carpark data
async function loadGeoJSONData() {
  try {
    await fetchGeoJSONData();
    await waitTillTargetReady(isMapLoaded, 100);

    map.addSource("carparks-data", {
      type: "geojson",
      data: window.geojsonData,
    });

    const defaultColours = {
      colour1: "red",
      colour2: "yellow",
      colour3: "green",
    };

    const shades = defaultColours;

    // Add a layer containing pins using "carparks-data" source
    map.addLayer({
      id: "carparks-layer",
      type: "circle",
      source: "carparks-data",
      paint: {
        "circle-radius": 12,
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "lots_available"],
          0,
          shades.colour1,
          125,
          shades.colour2,
          250,
          shades.colour3,
        ],
        "circle-opacity": 0.6,
      },
    });
  } catch (error) {
    console.error(error);
  }
}

map.on("zoom", function () {
  const zoom = map.getZoom();

  map.setPaintProperty("carparks-layer", "circle-opacity", [
    "interpolate",
    ["linear"],
    ["zoom"],
    10, 0, 14, 0.6, 18, 1,
  ]);
});

loadGeoJSONData();

// search function
map.addControl(
  new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    countries: 'sg',
    mapboxgl: mapboxgl,
  })
);

// get user current location
var geolocate = new mapboxgl.GeolocateControl({
  positionOptions: {
      enableHighAccuracy: true
  },
  trackUserLocation: true
});

map.addControl(geolocate);

var userCoordinates, userLatitude, userLongitude

geolocate.on('geolocate', function(event) {
  userCoordinates = event.coords;
  userLatitude = userCoordinates.latitude;
  userLongitude = userCoordinates.longitude;
  console.log(userLatitude, userLongitude)
});

// interacting with bubbles and route visualisation
async function getRoute(end) {
  const query = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${userLongitude},${userLatitude};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
    { method: 'GET' }
  );
  const json = await query.json();
  const data = json.routes[0];
  const route = data.geometry.coordinates;
  const geojson = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: route
    }
  };
  // if the route already exists on the map, we'll reset it using setData
  if (map.getSource('route')) {
    map.getSource('route').setData(geojson);
  }
  // otherwise, we'll make a new request
  else {
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geojson
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3887be',
        'line-width': 5,
        'line-opacity': 0.75
      }
    });
  }
}

map.on("click", "carparks-layer", function (e) {
  var coordinates = e.features[0].geometry.coordinates.slice();
  var carParkNo = e.features[0].properties.car_park_no;
  var address = e.features[0].properties.address;
  var lotsAvailable = e.features[0].properties.lots_available;
  var lotType = e.features[0].properties.lot_type;

  var popupContent =
    "<div style='background-color: #ffffff; padding: 10px; border-radius: 5px;'>" +
    "<h3 style='margin-bottom: 5px; color: #333;'>" +
    address +
    "</h3>" +
    "<p style='margin: 0; color: #777;'>Carpark No. " +
    carParkNo +
    "</p>" +
    "<p style='margin: 0; color: #777;'>Lots Available: " +
    lotsAvailable +
    "</p>" +
    "<p style='margin: 0; color: #777;'>Lot Type: " +
    lotType +
    "</p>" +
    "<br /> <button class='get-route-button' style= 'background-color: #007bff; color: #ffffff; border: none; border-radius: 4px; padding: 4px 10px; font-size: 13px; cursor: pointer;'>Get Route</button>"
    "</div>";

  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
  }

  var popup = new mapboxgl.Popup().setLngLat(coordinates).setHTML(popupContent).addTo(map);
  popup.getElement().addEventListener('click', function(event) {
    if (event.target.classList.contains('get-route-button')) {
      var end = [coordinates[0], coordinates[1]]
      getRoute(end)
    }
    
  });

});

// not sure - this raises an error but i can't remove it or else search won't work
document.getElementById("geocoder").appendChild(geocoder.onAdd(map));



