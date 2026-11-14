from collections .abc import Iterable ,Sequence
from typing import Any

from app .database .db_connection import get_connection

def fetch_one (sql :str ,params :Sequence [Any ]|None =None )->dict [str ,Any ]|None :

    connection =get_connection ()
    try :
        with connection .cursor ()as cursor :
            cursor .execute (sql ,params or ())
            return cursor .fetchone ()
    finally :
        connection .close ()

def fetch_all (sql :str ,params :Sequence [Any ]|None =None )->list [dict [str ,Any ]]:

    connection =get_connection ()
    try :
        with connection .cursor ()as cursor :
            cursor .execute (sql ,params or ())
            return cursor .fetchall ()
    finally :
        connection .close ()

def execute_query (
sql :str ,
params :Sequence [Any ]|None =None ,
)->dict [str ,int ]:

    connection =get_connection ()
    try :
        with connection .cursor ()as cursor :
            cursor .execute (sql ,params or ())
            result ={
            "rowcount":cursor .rowcount ,
            "lastrowid":cursor .lastrowid or 0 ,
            }
        connection .commit ()
        return result
    except Exception :
        connection .rollback ()
        raise
    finally :
        connection .close ()

def execute_transaction (
statements :Iterable [tuple [str ,Sequence [Any ]|None ]],
)->list [dict [str ,int ]]:

    connection =get_connection ()
    results :list [dict [str ,int ]]=[]

    try :
        with connection .cursor ()as cursor :
            for sql ,params in statements :
                cursor .execute (sql ,params or ())
                results .append (
                {
                "rowcount":cursor .rowcount ,
                "lastrowid":cursor .lastrowid or 0 ,
                }
                )
        connection .commit ()
        return results
    except Exception :
        connection .rollback ()
        raise
    finally :
        connection .close ()
