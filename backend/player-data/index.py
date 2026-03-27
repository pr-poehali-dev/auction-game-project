"""
Чтение и сохранение данных игрока (монеты, инвентарь, прокруты и т.д.).
GET  / — получить данные игрока
POST / — сохранить данные игрока
"""
import json
import os
import hashlib
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")


def verify_session(player_id: int, session_token: str) -> bool:
    google_id_hash = session_token  # мы не храним google_id в открытую, проверяем через БД
    secret = os.environ.get("DATABASE_URL", "secret")[-16:]
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(f"SELECT google_id FROM {SCHEMA}.players WHERE id = %s", (player_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return False
    expected = hashlib.sha256(f"{row[0]}:{player_id}:{secret}".encode()).hexdigest()
    return expected == session_token


def handler(event: dict, context) -> dict:
    headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, X-Player-Id, X-Session-Token", "Access-Control-Allow-Methods": "GET, POST, OPTIONS"}

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    req_headers = event.get("headers") or {}
    player_id_raw = req_headers.get("X-Player-Id") or req_headers.get("x-player-id", "")
    session_token = req_headers.get("X-Session-Token") or req_headers.get("x-session-token", "")

    if not player_id_raw or not session_token:
        return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Unauthorized"})}

    try:
        player_id = int(player_id_raw)
    except ValueError:
        return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Invalid player_id"})}

    if not verify_session(player_id, session_token):
        return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Forbidden"})}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    method = event.get("httpMethod", "GET")

    if method == "GET":
        cur.execute(
            f"""SELECT coins, spins_left, spin_refill_at, inventory,
                       spin_history, stats, purchased_items, name, avatar, email
                FROM {SCHEMA}.players WHERE id = %s""",
            (player_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Player not found"})}
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "coins": row[0],
                "spins_left": row[1],
                "spin_refill_at": row[2],
                "inventory": row[3],
                "spin_history": row[4],
                "stats": row[5],
                "purchased_items": row[6],
                "name": row[7],
                "avatar": row[8],
                "email": row[9],
            })
        }

    elif method == "POST":
        body = json.loads(event.get("body") or "{}")
        fields = []
        values = []

        allowed = ["coins", "spins_left", "spin_refill_at", "inventory", "spin_history", "stats", "purchased_items"]
        for field in allowed:
            if field in body:
                val = body[field]
                if field in ("inventory", "spin_history", "stats", "purchased_items"):
                    fields.append(f"{field} = %s")
                    values.append(json.dumps(val))
                else:
                    fields.append(f"{field} = %s")
                    values.append(val)

        if not fields:
            cur.close()
            conn.close()
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Nothing to update"})}

        values.append(player_id)
        cur.execute(
            f"UPDATE {SCHEMA}.players SET {', '.join(fields)}, updated_at=NOW() WHERE id = %s",
            values
        )
        conn.commit()
        cur.close()
        conn.close()
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

    cur.close()
    conn.close()
    return {"statusCode": 405, "headers": headers, "body": json.dumps({"error": "Method not allowed"})}
