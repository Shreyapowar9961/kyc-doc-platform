# backend/scripts/add-user-updatedat.py
import psycopg2
from dotenv import dotenv_values

cfg = dotenv_values("backend/.env")
conn = psycopg2.connect(cfg.get("DATABASE_URL"))
cur = conn.cursor()

cur.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;')
conn.commit()
print("Added updatedAt to User table successfully!")

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position;", ("User",))
print("User columns now:", [c[0] for c in cur.fetchall()])

cur.close()
conn.close()
