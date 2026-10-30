# backend/scripts/inspect-neon.py
import psycopg2
from dotenv import dotenv_values

cfg = dotenv_values("backend/.env")
conn = psycopg2.connect(cfg.get("DATABASE_URL"))
cur = conn.cursor()

cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
""")
tables = [r[0] for r in cur.fetchall()]
print("Existing tables:", tables)

cur.execute("SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at;")
migs = cur.fetchall()
print("Recorded migrations in DB:")
for m in migs:
    print(f" - {m[0]} (finished: {bool(m[1])}, rolled_back: {bool(m[2])})")

for t in ["User", "Document", "AuditLog"]:
    if t in tables:
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position;", (t,))
        cols = [c[0] for c in cur.fetchall()]
        print(f"Columns in {t}:", cols)
        cur.execute(f'SELECT COUNT(*) FROM "{t}";')
        print(f'Row count in {t}: {cur.fetchone()[0]}')

conn.close()
