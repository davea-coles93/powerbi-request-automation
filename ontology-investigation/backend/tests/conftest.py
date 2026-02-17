"""Pytest configuration and fixtures."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.db.database import Base
from app.main import app


@pytest.fixture(scope="function")
def test_db():
    """Create a fresh test database for each test."""
    # Use in-memory SQLite with StaticPool so all connections share the same DB
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client(test_db):
    """Create a test client with test database."""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    from app.db.database import get_db
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def sample_perspective():
    """Sample perspective data."""
    return {
        "id": "test_perspective",
        "name": "Test Perspective",
        "purpose": "Testing purposes",
        "primary_concern": "Test concern",
        "typical_actors": ["Tester"],
        "consumes_from": [],
        "feeds": [],
    }


@pytest.fixture
def sample_system():
    """Sample system data."""
    return {
        "id": "test_system",
        "name": "Test System",
        "type": "ERP",
        "description": "Test ERP system",
    }


@pytest.fixture
def sample_entity():
    """Sample entity data."""
    return {
        "id": "test_entity",
        "name": "Test Entity",
        "description": "Test entity description",
        "lenses": [
            {
                "perspective_id": "test_perspective",
                "interpretation": "Test interpretation",
                "derived_attributes": [{"name": "attr1"}],
            }
        ],
    }


@pytest.fixture
def sample_attribute():
    """Sample attribute data."""
    return {
        "id": "test_attribute",
        "name": "Test Attribute",
        "description": "Test attribute",
        "system_id": "test_system",
        "entity_id": "test_entity",
        "perspective_ids": ["test_perspective"],
        "reliability": "High",
        "volatility": "Point-in-time",
    }


@pytest.fixture
def sample_measure():
    """Sample measure data."""
    return {
        "id": "test_measure",
        "name": "Test Measure",
        "description": "Test measure",
        "logic": "sum(test_attribute)",
        "input_attribute_ids": ["test_attribute"],
        "perspective_ids": ["test_perspective"],
    }


@pytest.fixture
def sample_metric():
    """Sample metric data."""
    return {
        "id": "test_metric",
        "name": "Test Metric",
        "description": "Test metric",
        "business_question": "What is the test value?",
        "calculated_by_measure_ids": ["test_measure"],
        "perspective_ids": ["test_perspective"],
    }


@pytest.fixture
def sample_process():
    """Sample process data."""
    return {
        "id": "test_process",
        "name": "Test Process",
        "description": "Test process",
        "steps": [
            {
                "id": "step1",
                "name": "Step 1",
                "sequence": 1,
                "perspective_id": "test_perspective",
                "actor": "Tester",
                "depends_on_step_ids": [],
                "crystallizes_attribute_ids": ["test_attribute"],
            }
        ],
    }
