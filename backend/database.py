import aiosqlite
import os

DEFAULT_DATABASE_PATH = os.path.join(os.path.dirname(__file__), "uarm.db")


def get_database_path():
    return os.environ.get("UARM_DB_PATH", DEFAULT_DATABASE_PATH)


async def initialize_database(database_path: str | None = None):
    path = database_path or get_database_path()
    async with aiosqlite.connect(path) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS calibration_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_name TEXT NOT NULL,
                serial_port_path TEXT NOT NULL,
                baud_rate INTEGER NOT NULL DEFAULT 115200,
                home_offset_x REAL NOT NULL DEFAULT 0.0,
                home_offset_y REAL NOT NULL DEFAULT 0.0,
                home_offset_z REAL NOT NULL DEFAULT 0.0,
                workspace_min_x REAL NOT NULL DEFAULT -350.0,
                workspace_max_x REAL NOT NULL DEFAULT 350.0,
                workspace_min_y REAL NOT NULL DEFAULT -350.0,
                workspace_max_y REAL NOT NULL DEFAULT 350.0,
                workspace_min_z REAL NOT NULL DEFAULT 0.0,
                workspace_max_z REAL NOT NULL DEFAULT 150.0,
                vacuum_verified INTEGER NOT NULL DEFAULT 0,
                calibrated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sequences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS waypoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sequence_id INTEGER NOT NULL,
                order_index INTEGER NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                z REAL NOT NULL,
                speed REAL NOT NULL DEFAULT 50.0,
                vacuum_on INTEGER NOT NULL DEFAULT 0,
                delay_ms INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS safety_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                max_speed REAL NOT NULL DEFAULT 200.0,
                boundary_slowdown_distance REAL NOT NULL DEFAULT 10.0,
                boundary_slowdown_factor REAL NOT NULL DEFAULT 0.25,
                loaded_max_speed REAL NOT NULL DEFAULT 100.0,
                estop_release_vacuum INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS exclusion_zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                min_x REAL NOT NULL,
                max_x REAL NOT NULL,
                min_y REAL NOT NULL,
                max_y REAL NOT NULL,
                min_z REAL NOT NULL,
                max_z REAL NOT NULL
            );

            INSERT OR IGNORE INTO safety_config (id, max_speed, boundary_slowdown_distance, boundary_slowdown_factor, loaded_max_speed, estop_release_vacuum)
            VALUES (1, 200.0, 10.0, 0.25, 100.0, 0);
        """)
        await db.commit()


async def get_connection(database_path: str | None = None):
    path = database_path or get_database_path()
    db = await aiosqlite.connect(path)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    return db
