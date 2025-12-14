from psycopg2.extras import RealDictCursor
from ..Config.Config import Config
import psycopg2

def get_db_connection():
    try:
        return psycopg2.connect(Config.DB_URL, cursor_factory=RealDictCursor)
    except Exception as e:
        print("DB CONNECTION ERROR:", e)
        raise  
