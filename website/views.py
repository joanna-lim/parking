from flask import Blueprint, render_template
import os

views = Blueprint('views', __name__)

@views.route('/', methods=['GET'])
def get_map():
   MAPBOX_SECRET_KEY=os.getenv("MAPBOX_SECRET_KEY")
   return render_template("home.html", MAPBOX_SECRET_KEY=MAPBOX_SECRET_KEY)