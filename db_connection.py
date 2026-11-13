import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        cursorclass=pymysql.cursors.DictCursor
    )

if __name__ == "__main__":
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT VERSION() AS version;")
            print("MySQL Version:", cursor.fetchone()["version"])
            cursor.execute("SHOW TABLES;")
            db_name = os.getenv("DB_NAME")
            print("Tables:", [row[f"Tables_in_{db_name}"] for row in cursor.fetchall()])
    finally:
        conn.close()
