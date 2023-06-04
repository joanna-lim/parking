mapboxgl.accessToken = window.MAPBOX_SECRET_KEY;

const map = new mapboxgl.Map({
container: 'map', 
style: 'mapbox://styles/mapbox/streets-v12', 
center: [103.8822, 1.2999], 
zoom: 15 
});
