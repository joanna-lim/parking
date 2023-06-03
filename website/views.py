from flask import Blueprint, render_template, request, flash, jsonify, redirect, url_for

views = Blueprint('views', __name__)

@views.route('/', methods=['GET'])
def get_map():
   return render_template("home.html")