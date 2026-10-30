# backend/scripts/apply-additive-migration.py
import hashlib
import uuid
from datetime import datetime, timezone
import psycopg2
from dotenv import dotenv_values

cfg = dotenv_values("backend/.env")
conn_str = cfg.get("DIRECT_URL") or cfg.get("DATABASE_URL")
conn = psycopg2.connect(conn_str)
conn.autocommit = False
cur = conn.cursor()

try:
    print("Reading additive migration SQL...")
    with open("backend/prisma/migrations/20261030151500_add_applications/migration.sql", "r", encoding="utf-8") as f:
        sql = f.read()

    checksum = hashlib.sha256(sql.encode("utf-8")).hexdigest()
    print(f"Migration checksum: {checksum}")

    # Check if migration already recorded
    cur.execute("SELECT id FROM _prisma_migrations WHERE migration_name = '20261030151500_add_applications';")
    existing = cur.fetchone()

    if existing:
        print("Migration '20261030151500_add_applications' is ALREADY applied in _prisma_migrations.")
    else:
        print("Executing additive SQL...")
        cur.execute(sql)
        print("Additive SQL executed successfully!")

        mig_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        cur.execute("""
            INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
            VALUES (%s, %s, %s, %s, %s, NULL, %s, %s);
        """, (mig_id, checksum, now, "20261030151500_add_applications", "", now, 1))
        print("Migration recorded in _prisma_migrations.")

    conn.commit()
    print("TRANSACTION COMMITTED SAFELY.")

    # Verification: check tables and row counts
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    tables = [r[0] for r in cur.fetchall()]
    print("Active tables in Neon:", tables)

    for t in ["User", "Document", "AuditLog", "Application", "CheckResult", "Review"]:
        cur.execute(f'SELECT COUNT(*) FROM "{t}";')
        count = cur.fetchone()[0]
        print(f' - Table "{t}" row count: {count}')

except Exception as e:
    conn.rollback()
    print("FAILED! Transaction rolled back:", e)
    raise e
finally:
    cur.close()
    conn.close()
