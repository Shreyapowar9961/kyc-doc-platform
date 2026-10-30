# backend/scripts/fix-doc-text.py
import psycopg2
from dotenv import dotenv_values

cfg = dotenv_values("backend/.env")
conn = psycopg2.connect(cfg.get("DATABASE_URL"))
cur = conn.cursor()

cur.execute('ALTER TABLE "Document" ALTER COLUMN "text" DROP NOT NULL;')
cur.execute('ALTER TABLE "Document" ALTER COLUMN "text" SET DEFAULT \'\';')
conn.commit()
print("Document text column made nullable with default successfully!")

cur.close()
conn.close()
