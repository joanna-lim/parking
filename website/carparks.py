import json
import pyproj
import urllib.request
import os 
from dotenv import load_dotenv

def svy21_to_wgs84(x, y):
    try:
        x, y = svy21_to_wgs84.transformer.transform(x, y)
    except AttributeError:
        svy21_to_wgs84.svy21 = pyproj.CRS.from_proj4("+proj=tmerc +lat_0=1.366666666666667 +lon_0=103.83333333333333 +k_0=1.0 +x_0=28001.642 +y_0=38744.572 +ellps=WGS84 +units=m +no_defs")
        svy21_to_wgs84.wgs84 = pyproj.CRS.from_proj4("+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs")
        svy21_to_wgs84.transformer = pyproj.Transformer.from_crs(svy21_to_wgs84.svy21, svy21_to_wgs84.wgs84)
        x, y = svy21_to_wgs84.transformer.transform(x, y)
    return y, x
    
# Format the carpark information to match the database
def format_carpark_information(record):
    carpark_info = list()
    carpark_info.append(record[1])
    carpark_info.append(float(record[2]))
    carpark_info.append(float(record[3]))
    carpark_info.append(record[4])
    carpark_info.append(record[5])
    carpark_info.append(record[6])
    carpark_info.append(record[7])

    np = record[8]
    if np == "YES":
        carpark_info.append(True)
    elif np == "NO":
        carpark_info.append(False)
    else:
        print("Error")
        return None

    carpark_info.append(int(record[9]))
    carpark_info.append(float(record[10]))

    cpb = record[11]
    if cpb == "Y":
        carpark_info.append(True)
    elif cpb == "N":
        carpark_info.append(False)
    else:
        print("Error")
        return None
    
    return carpark_info

# HDB carpark information mainly consists of information that changes rarely
# We will only need to update everytime the webapp is started
def update_carparks():
    print("-- updating HDB carparks --")
    from . import db
    from .models import CarPark
    import csv

    records = list()
    with open('./website/hdb-carpark-information.csv', newline='') as csvfile:
        reader = csv.reader(csvfile, delimiter=',', quotechar='"')
        for row in reader:
            records.append(row)

    for record in records:
        carpark = CarPark.query.get(record[0])

        # Will only create and fill the database if it hasn't been created yet, won't update
        # May need to delete and run main.py again if you wan to update
        if not carpark:
            carpark_info = format_carpark_information(record)
            lat, lon = svy21_to_wgs84(carpark_info[1], carpark_info[2])
            carpark = CarPark(
                car_park_no = record[0],
                address = fattributes[0],
                x_coord = fattributes[1],
                y_coord = fattributes[2],
                latitude = lat,
                longitude = lon,
                lots_available = None,
                lot_type = None,
            )
            db.session.add(carpark)
    
    db.session.commit()

def generate_geojson():
    from . import db
    from .models import CarPark
    print("-- generating geojson for mapbox --")
    carparks = CarPark.query.all()
    features = []
    for carpark in carparks:
        if carpark.lots_available is None:
            continue
        feature = {
            'geometry': {
                'type': 'Point',
                'coordinates': [carpark.longitude, carpark.latitude]
            },
            'properties': {
                'car_park_no': carpark.car_park_no,
                'address': carpark.address,
                'lots_available': carpark.lots_available,
                'lot_type': carpark.lot_type
            },
            'type': "Feature"
        }
        features.append(feature)

    geojson = {
        'type': 'FeatureCollection',
        'features': features
    }
    json_str = json.dumps(geojson, indent=4)
    with open(os.path.join('website', 'carparks.json'), 'w') as f:
        f.write(json_str)

def update_carparks_availability():
    print("-- updating HDB carpark availabilities --")
    from . import db
    from .models import CarPark

    url = 'https://api.data.gov.sg/v1/transport/carpark-availability'

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }

    req = urllib.request.Request(url, headers=headers)
    fileobj = urllib.request.urlopen(req)
    json_data = json.load(fileobj)
    json_str = json.dumps(json_data, indent=4)
    with open(os.path.join('website', 'datagov.json'), 'w') as f:
        f.write(json_str)
    abs_path = os.path.abspath('datagov.json')

    records = json_data['items'][0]['carpark_data']
    
    for record in records:
        carpark_info = record.get("carpark_info")[0]
        lots_available = int(carpark_info.get("lots_available"))
        lot_type = carpark_info.get("lot_type")
        carpark = CarPark.query.get(record.get("carpark_number"))
        if carpark:
            carpark.lots_available = lots_available
            carpark.lot_type = lot_type
            
    db.session.commit()

def ltadatamall():
    from . import db
    from .models import CarPark

    dotenv_path = os.path.abspath("../.env")
    load_dotenv(dotenv_path)    

    url = 'http://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2'
    api_key = os.getenv('LTA_DATAMALL_KEY')
    headers = {'AccountKey': api_key}

    req = urllib.request.Request(url, headers=headers)
    fileobj = urllib.request.urlopen(req)
    json_data = json.load(fileobj)
    filtered_data = [item for item in json_data['value'] if item['Agency'] in ['LTA', 'URA']]
    with open(os.path.join('website', 'ltadatamall.json'), 'w') as f:
        json.dump(filtered_data, f, indent=4)
    print("-- updating LTA and URA carpark availabilities --")

    for item in filtered_data:
        car_park_no = item.get("CarParkID")
        address = item.get("Development")
        location = item.get("Location")
        latitude, longitude = map(float, location.split(" "))
        lot_type = item.get("LotType")
        lots_available = item.get("AvailableLots")
       
        carpark = CarPark.query.filter_by(car_park_no=car_park_no).first()
        if carpark:
            carpark.address = address
            carpark.lot_type = lot_type
            carpark.lots_available= lots_available
        
        else: 
            new_carpark = CarPark(car_park_no=car_park_no, address=address, latitude=latitude, longitude=longitude, lot_type=lot_type, lots_available=lots_available)
            db.session.add(new_carpark)

        db.session.commit()
           
