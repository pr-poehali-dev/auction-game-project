"""
Авторизация через Google OAuth.
Принимает Google ID Token, верифицирует его и возвращает сессию игрока.
"""
import json
import os
import time
import hashlib
import urllib.request
import urllib.parse
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")


def verify_google_token(token: str) -> dict:
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(token)}"
    with urllib.request.urlopen(url, timeout=10) as resp:
        data = json.loads(resp.read())
    if "error" in data:
        raise ValueError(f"Invalid token: {data.get('error_description', data['error'])}")
    return data


def make_session_token(google_id: str, player_id: int) -> str:
    secret = os.environ.get("DATABASE_URL", "secret")[-16:]
    raw = f"{google_id}:{player_id}:{secret}"
    return hashlib.sha256(raw.encode()).hexdigest()


def handler(event: dict, context) -> dict:
    headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS"}

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
        token = body.get("token", "").strip()
        if not token:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Token required"})}

        # Верифицируем Google токен
        payload = verify_google_token(token)
        google_id = payload["sub"]
        email = payload.get("email", "")
        name = payload.get("name", email.split("@")[0])
        avatar = payload.get("picture", "")

        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()

        # Ищем или создаём игрока
        cur.execute(
            f"SELECT id, coins, spins_left, spin_refill_at FROM {SCHEMA}.players WHERE google_id = %s",
            (google_id,)
        )
        row = cur.fetchone()

        if row:
            player_id = row[0]
            # Обновляем имя/аватар
            cur.execute(
                f"UPDATE {SCHEMA}.players SET name=%s, avatar=%s, updated_at=NOW() WHERE id=%s",
                (name, avatar, player_id)
            )
        else:
            # Новый игрок — даём прокруты с таймером на 5 часов
            refill_at = int(time.time() * 1000) + 5 * 60 * 60 * 1000
            cur.execute(
                f"""INSERT INTO {SCHEMA}.players (google_id, email, name, avatar, coins, spins_left, spin_refill_at)
                    VALUES (%s, %s, %s, %s, 2500, 2, %s) RETURNING id""",
                (google_id, email, name, avatar, refill_at)
            )
            player_id = cur.fetchone()[0]

        conn.commit()
        cur.close()
        conn.close()

        session_token = make_session_token(google_id, player_id)

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "ok": True,
                "player_id": player_id,
                "session_token": session_token,
                "name": name,
                "email": email,
                "avatar": avatar,
            })
        }

    except ValueError as e:
        return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": str(e)})}
    except Exception as e:
        return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": str(e)})}
