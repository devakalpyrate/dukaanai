import pymysql

def get_connection():
    return pymysql.connect(
        host="localhost",
        port=3306,
        user="root",
        password="Subham@2007",
        database="dukaanai",
        cursorclass=pymysql.cursors.DictCursor
    )

if __name__ == "__main__":
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT VERSION() AS version;")
            print("MySQL Version:", cursor.fetchone()["version"])
            cursor.execute("SHOW TABLES;")
            print("Tables:", [row[f"Tables_in_dukaanai"] for row in cursor.fetchall()])
    finally:
        conn.close()
