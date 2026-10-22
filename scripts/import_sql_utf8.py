"""Import SQL migration files directly into MySQL container using UTF-8."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

user_dir = ROOT / "backend" / "services" / "user-service" / "src" / "main" / "resources" / "db" / "migration"
cv_dir = ROOT / "backend" / "services" / "customer-vehicle-service" / "src" / "main" / "resources" / "db" / "migration"

def run_query(sql: str):
    cmd = [
        "docker", "compose", "exec", "-T", "mysql",
        "mysql", "--default-character-set=utf8mb4",
        "-uroot", "-prootpassword123", "-e", sql
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if res.returncode != 0:
        print(f"Query error: {res.stderr}")

def run_sql(db_name: str, sql_file: Path):
    print(f"Importing {sql_file.name} into {db_name}...")
    sql_bytes = sql_file.read_bytes()
    cmd = [
        "docker", "compose", "exec", "-T", "mysql",
        "mysql", "--default-character-set=utf8mb4",
        "-uroot", "-prootpassword123", db_name
    ]
    res = subprocess.run(cmd, input=sql_bytes, capture_output=True)
    if res.returncode != 0:
        print(f"  Error: {res.stderr.decode('utf-8', errors='replace')}")
    else:
        print("  OK")

print("Resetting databases cleanly...")
run_query("""
DROP DATABASE IF EXISTS customer_vehicle_service;
CREATE DATABASE customer_vehicle_service CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON customer_vehicle_service.* TO 'app'@'%';

DROP DATABASE IF EXISTS user_service;
CREATE DATABASE user_service CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON user_service.* TO 'app'@'%';
FLUSH PRIVILEGES;
""")

print("\n--- Running user_service migrations ---")
for f in sorted(user_dir.glob("*.sql")):
    run_sql("user_service", f)

print("\n--- Running customer_vehicle_service migrations ---")
for f in sorted(cv_dir.glob("*.sql")):
    run_sql("customer_vehicle_service", f)

print("\nAll migrations imported successfully with UTF-8!")

