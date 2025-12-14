import psycopg2
from psycopg2.extras import RealDictCursor
from Models.get_db_connection import get_db_connection

def fetch_all(query, params=()):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(query, params)
    results = cur.fetchall()
    cur.close()
    conn.close()
    return results

def fetch_one(query, params=()):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(query, params)
    result = cur.fetchone()
    cur.close()
    conn.close()
    return result

def execute(query, params=()):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    cur.close()
    conn.close()