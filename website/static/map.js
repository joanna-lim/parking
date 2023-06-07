mapboxgl.accessToken = window.MAPBOX_SECRET_KEY;

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
    10,
    0,
    14,
    0.6,
    18,
    1,
  ]);
});

loadGeoJSONData();

map.on("click", "carparks-layer", function (e) {
  var coordinates = e.features[0].geometry.coordinates.slice();
  var carParkNo = e.features[0].properties.car_park_no;
  var address = e.features[0].properties.address;
  var lotsAvailable = e.features[0].properties.lots_available;
  var lotType = e.features[0].properties.lot_type;

  var popupContent =
    "<div style='background-color: #ffffff; padding: 10px; border-radius: 5px;'>" +
    "<h3 style='margin-bottom: 5px; color: #333;'>Address: " +
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
    "</div>";

  while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
  }

  new mapboxgl.Popup().setLngLat(coordinates).setHTML(popupContent).addTo(map);
});

map.addControl(
  new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    countries: 'sg',
    mapboxgl: mapboxgl,
  })
);

document.getElementById("geocoder").appendChild(geocoder.onAdd(map));
