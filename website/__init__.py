from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os
from .update_carparks import update_carparks, update_carparks_availability, generate_geojson, ltadatamall
from time import sleep
from threading import Thread, active_count

db = SQLAlchemy()
DB_NAME = "database.db"

def do_with_app_context_periodically(app, interval, target, args=None, kwargs=None):
    args = args or []
    kwargs = kwargs or {}
    while True:
        with app.app_context():
            target(*args, **kwargs)
        sleep(interval)

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.urandom(24)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_NAME}'
    db.init_app(app)
    
    from .views import views
    

    app.register_blueprint(views, url_prefix='/')

    from .models import CarPark
    
    with app.app_context():
        db.create_all()

    def f():
        update_carparks_availability()
        ltadatamall()
        generate_geojson()
        

    t1 = Thread(target=do_with_app_context_periodically, args=(app, 60*60*24, update_carparks))
    t1.daemon = True
    t2 = Thread(target=do_with_app_context_periodically, args=(app, 60*5, f))
    t2.daemon = True

    # Comment this out if you want
    t1.start()
    t2.start()

    return app
 