"""Seed the database with initial data."""
import json
from pathlib import Path

from app.db.database import init_db, SessionLocal
from app.db.repositories import (
    PerspectiveRepository,
    SystemRepository,
    EntityRepository,
    ObservationRepository,
    MeasureRepository,
    MetricRepository,
    ProcessRepository,
    SemanticTableRepository,
)
from app.models import (
    Perspective,
    System,
    Entity,
    Observation,
    Measure,
    Metric,
    Process,
)
from app.models.semantic_model import Table


def load_seed_data() -> dict:
    """Load seed data from JSON file."""
    # Try different paths for Docker and local
    possible_paths = [
        Path("/app/data/seed_data.json"),  # Docker volume mount
        Path(__file__).parent / "data" / "seed_data.json",  # Local relative
        Path(__file__).parent.parent / "data" / "seed_data.json",  # Parent directory
    ]

    for seed_path in possible_paths:
        if seed_path.exists():
            print(f"Loading seed data from: {seed_path}")
            with open(seed_path, "r") as f:
                return json.load(f)

    raise FileNotFoundError(f"Could not find seed_data.json in any of: {possible_paths}")


def seed_database():
    """Seed the database with initial data."""
    # Initialize database
    init_db()

    # Load seed data
    data = load_seed_data()

    # Create session
    db = SessionLocal()

    try:
        # Seed perspectives
        print("Seeding perspectives...")
        repo = PerspectiveRepository(db)
        for item in data.get("perspectives", []):
            if not repo.get_by_id(item["id"]):
                repo.create(Perspective(**item))
                print(f"  Created perspective: {item['name']}")

        # Seed systems
        print("Seeding systems...")
        repo = SystemRepository(db)
        for item in data.get("systems", []):
            if not repo.get_by_id(item["id"]):
                repo.create(System(**item))
                print(f"  Created system: {item['name']}")

        # Seed entities
        print("Seeding entities...")
        repo = EntityRepository(db)
        for item in data.get("entities", []):
            if not repo.get_by_id(item["id"]):
                repo.create(Entity(**item))
                print(f"  Created entity: {item['name']}")

        # Seed observations
        print("Seeding observations...")
        repo = ObservationRepository(db)
        for item in data.get("observations", []):
            if not repo.get_by_id(item["id"]):
                repo.create(Observation(**item))
                print(f"  Created observation: {item['name']}")

        # Seed measures
        print("Seeding measures...")
        repo = MeasureRepository(db)
        for item in data.get("measures", []):
            if not repo.get_by_id(item["id"]):
                repo.create(Measure(**item))
                print(f"  Created measure: {item['name']}")

        # Seed metrics
        print("Seeding metrics...")
        repo = MetricRepository(db)
        for item in data.get("metrics", []):
            if not repo.get_by_id(item["id"]):
                repo.create(Metric(**item))
                print(f"  Created metric: {item['name']}")

        # Seed processes
        print("Seeding processes...")
        repo = ProcessRepository(db)
        for item in data.get("processes", []):
            if not repo.get_by_id(item["id"]):
                repo.create(Process(**item))
                print(f"  Created process: {item['name']}")

        # Seed semantic tables
        print("Seeding semantic tables...")
        repo = SemanticTableRepository(db)
        for item in data.get("semantic_tables", []):
            if not repo.get_by_id(item["id"]):
                repo.create(Table(**item))
                measure_count = len(item.get("measures", []))
                print(f"  Created table: {item['name']} ({measure_count} DAX measures)")

        print("\nSeeding complete!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
