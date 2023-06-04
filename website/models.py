from . import db

class CarPark(db.Model):
    __tablename__ = 'carpark'
    car_park_no = db.Column(db.String, primary_key=True)
    address = db.Column(db.String(150))
    # for HDB carparks in svy21 coordinates
    x_coord = db.Column(db.Float)
    y_coord = db.Column(db.Float)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    lots_available = db.Column(db.Integer)
    lot_type = db.Column(db.String(1))