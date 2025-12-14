from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies, jwt_required, get_jwt_identity, get_jwt, unset_jwt_cookies
from Models.get_db_connection import get_db_connection
from Utils.hash_password import generate_hash_password, check_hash_password
from datetime import timedelta
import datetime
from database.db import fetch_all
import json
import urllib.parse

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"err": "Username and password required"}), 400

    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT uid, username, first_name, last_name, password FROM user_table WHERE username = %s", 
            (username,)
        )
        user = cursor.fetchone()
        
        if not user or not check_hash_password(user["password"], password):
            return jsonify({"err": "Invalid credentials"}), 401

        # Create token with ALL user data in claims
        additional_claims = {
            "uid": user["uid"],
            "username": user["username"],
        }
        
        access_token = create_access_token(
            identity=str(user["uid"]),
            additional_claims=additional_claims,
            expires_delta=timedelta(minutes=30)
        )
        refresh_token = create_refresh_token(
            identity=str(user["uid"]),
            expires_delta=timedelta(days=7)
        )

        userData = {
            "uid": user["uid"],
            "username": user["username"]
        }

        encode = urllib.parse.quote(json.dumps(userData))
        
        response = make_response(jsonify({
            "message": "success",
            "user": userData
        }), 200)

        response.set_cookie(
            "_u",
            encode,
            httponly=False,
            samesite="Lax",
            secure=True,
            max_age=60*60*24*7
        )

        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)

        return response

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"err": "Server error"}), 500
    finally:
        # SAFELY close connections only if they exist
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@auth_bp.route('/api/debug-cookies', methods=['GET'])
def debug_cookies():
    """Debug endpoint to check what cookies are being sent"""
    return jsonify({
        'cookies_received': dict(request.cookies),
        'has_access_token': 'access_token_cookie' in request.cookies,
        'has_refresh_token': 'refresh_token_cookie' in request.cookies,
        'user_agent': request.headers.get('User-Agent'),
        'origin': request.headers.get('Origin'),
        'referer': request.headers.get('Referer')
    })

@auth_bp.route('/api/refresh', methods=['POST'])
@jwt_required(refresh=True)  # Requires refresh token cookie
def refresh():
    try:
        current_user_id = get_jwt_identity()
        current_jwt = get_jwt()
        
        # Get original claims from the refresh token if needed
        additional_claims = {
            "uid": current_jwt.get("uid"),
            "username": current_jwt.get("username")
        } if current_jwt else {}
        
        # Create new access token
        new_access_token = create_access_token(
            identity=current_user_id,
            additional_claims=additional_claims,
            expires_delta=timedelta(minutes=15)
        )
        
        response = make_response(jsonify({
            "message": "refreshed",
            "user": {
                "uid": current_jwt.get("uid") if current_jwt else current_user_id,
                "username": current_jwt.get("username") if current_jwt else ""
            }
        }), 200)
        
        set_access_cookies(response, new_access_token)
        
        return response
    except Exception as e:
        print("Refresh error:", e)
        return jsonify({"err": "Refresh failed"}), 401

@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({"message": "Logged out"}), 200)
    unset_jwt_cookies(response)
    return response

@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username").strip()
    password = data.get("password")
    gender = data.get("gender").strip()
    fname = data.get("first_name").strip()
    lname = data.get("last_name").strip()

    if not username or not password or not gender or not fname or not lname:
        return jsonify({"err": "All fields are required!"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT uid FROM user_table WHERE username = %s", (username,))
        existing_user = cursor.fetchone()
        if existing_user:
            return jsonify({"err": "Username already taken"}), 409

        hashed_password = generate_hash_password(password)

        # Insert new user into database
        cursor.execute(
            "INSERT INTO user_table (username, password, date_created, gender, first_name, last_name) VALUES (%s, %s, NOW(), %s, %s, %s) RETURNING uid",
            (username, hashed_password, gender, fname, lname)
        )
        new_user_id = cursor.fetchone()["uid"]
        conn.commit()

        user_data = {
            "id": new_user_id,
            "username": username
        }

        return jsonify({
            "message": "success",
            "user": user_data
        }), 201

    except Exception as e:
        print("REGISTER ERROR:", e)
        return jsonify({"err": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@auth_bp.route("/api/profile", methods=['GET']) 
@jwt_required()
def profile():
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        print(f"\n=== PROFILE ENDPOINT ===")
        print(f"Current user ID from JWT: {current_user_id}")
        print(f"JWT claims: {claims}")
        
        # Use current_user_id directly (it's the uid from the token)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT uid, username, first_name, last_name FROM user_table WHERE uid = %s", 
            (int(current_user_id),)  # Convert to int since database uid is int
        )
        user_data = cursor.fetchone()
        cursor.close()
        conn.close()
        
        print(f"Database query result: {user_data}")
        
        if user_data:
            return jsonify(user_data), 200
        else:
            print(f"❌ User with ID {current_user_id} not found in database")
            return jsonify({"err": "User not found"}), 404
            
    except Exception as e:
        print(f"❌ PROFILE ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"err": "Server error"}), 500
            
    except Exception as e:
        print("PROFILE ERROR:", e)
        return jsonify({"err": "Unauthorize Access"}), 500
        
@auth_bp.route("/users", methods=["GET"])
@jwt_required()
def get_users():
    """Get all users except current user"""
    try:
        current_user_id = get_jwt_identity()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
        SELECT uid, username, first_name, last_name, gender
        FROM user_table
        WHERE uid != %s
        ORDER BY first_name;
        """
        cursor.execute(query, (current_user_id,))
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(users)
    except Exception as e:
        print(f"❌ Error getting users: {e}")
        return jsonify({"error": str(e)}), 500