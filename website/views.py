from flask import Blueprint, render_template, jsonify
import os
import json

views = Blueprint('views', __name__)

@views.route('/', methods=['GET'])
def get_map():
   MAPBOX_SECRET_KEY=os.getenv("MAPBOX_SECRET_KEY")
   return render_template("index.html", MAPBOX_SECRET_KEY=MAPBOX_SECRET_KEY)

@views.route("/carparks", methods=["GET"])
def get_carparks():
    with open('website/carparks.json') as f:
        data = json.loads(f.read())
    return jsonify(data)