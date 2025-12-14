from psycopg2.extras import RealDictCursor
from Config.Config import Config
import psycopg2

def get_db_connection():
    try:
        conn =  psycopg2.connect("postgresql://postgres:gabgab2024@localhost:5432/WorldChat", cursor_factory=RealDictCursor)
        print("database connected!")
        return conn
    except Exception as e:
        print("DB CONNECTION ERROR:", e)
        raise  
