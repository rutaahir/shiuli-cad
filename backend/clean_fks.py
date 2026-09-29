import sqlite3

conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()

cur.execute("SELECT id FROM catalog_category")
valid_cat_ids = [r[0] for r in cur.fetchall()]
print("Valid category IDs:", valid_cat_ids)
valid_cat = valid_cat_ids[0]

cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]

for t in tables:
    cur.execute(f"PRAGMA table_info({t})")
    cols = [c[1] for c in cur.fetchall()]
    if 'category_id' in cols:
        placeholders = ','.join('?' for _ in valid_cat_ids)
        cur.execute(f"SELECT count(*) FROM {t} WHERE category_id IS NOT NULL AND category_id NOT IN ({placeholders})", valid_cat_ids)
        cnt = cur.fetchone()[0]
        if t == 'custom_orders_pricingrule':
            print(f"Deleting {cnt} orphaned rows in {t}")
            cur.execute(f"DELETE FROM {t} WHERE category_id IS NOT NULL AND category_id NOT IN ({placeholders})", valid_cat_ids)
        else:
            print(f"Fixing {cnt} rows in {t}")
            cur.execute(f"UPDATE {t} SET category_id = ? WHERE category_id IS NOT NULL AND category_id NOT IN ({placeholders})", [valid_cat] + valid_cat_ids)

conn.commit()
conn.close()
print("Done cleaning all foreign key references.")
