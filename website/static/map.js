mapboxgl.accessToken = window.MAPBOX_SECRET_KEY;

var map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [103.8822, 1.2999],
  zoom: 15,
});

async function fetchGeoJSONData() {
    const response = await fetch("/carparks", {
      method: "GET"
    });
    geojsonData = await response.json();
    console.log(geojsonData);
  }

  async function waitTillTargetReady(isTargetReady, milliseconds) {
    while (!isTargetReady()) {
      // wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, milliseconds));
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