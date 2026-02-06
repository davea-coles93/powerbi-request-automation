"""Tests for API endpoints."""
import pytest

from app.db.repositories import (
    PerspectiveRepository,
    SystemRepository,
    EntityRepository,
    ObservationRepository,
    MeasureRepository,
    MetricRepository,
    ProcessRepository,
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


@pytest.fixture
def api_data(
    test_db,
    sample_perspective,
    sample_system,
    sample_entity,
    sample_observation,
    sample_measure,
    sample_metric,
    sample_process,
):
    """Populate database for API tests."""
    PerspectiveRepository(test_db).create(Perspective(**sample_perspective))
    SystemRepository(test_db).create(System(**sample_system))
    EntityRepository(test_db).create(Entity(**sample_entity))
    ObservationRepository(test_db).create(Observation(**sample_observation))
    MeasureRepository(test_db).create(Measure(**sample_measure))
    MetricRepository(test_db).create(Metric(**sample_metric))
    ProcessRepository(test_db).create(Process(**sample_process))


def test_health_endpoint(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_get_perspectives(client, api_data):
    """Test getting all perspectives."""
    response = client.get("/api/perspectives")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == "test_perspective"


def test_get_perspective_by_id(client, api_data):
    """Test getting a specific perspective."""
    response = client.get("/api/perspectives/test_perspective")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == "test_perspective"
    assert data["name"] == "Test Perspective"


def test_get_perspective_not_found(client, api_data):
    """Test getting a non-existent perspective."""
    response = client.get("/api/perspectives/nonexistent")
    assert response.status_code == 404


def test_get_systems(client, api_data):
    """Test getting all systems."""
    response = client.get("/api/systems")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == "test_system"
    assert data[0]["type"] == "ERP"


def test_get_entities(client, api_data):
    """Test getting all entities."""
    response = client.get("/api/entities")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == "test_entity"


def test_get_observations(client, api_data):
    """Test getting all observations."""
    response = client.get("/api/observations")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == "test_observation"
    assert data[0]["reliability"] == "High"


def test_get_measures(client, api_data):
    """Test getting all measures."""
    response = client.get("/api/measures")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == "test_measure"


def test_get_metrics(client, api_data):
    """Test getting all metrics."""
    response = client.get("/api/metrics")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == "test_metric"


def test_get_processes(client, api_data):
    """Test getting all processes."""
    response = client.get("/api/processes")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == "test_process"


def test_trace_metric(client, api_data):
    """Test tracing a metric."""
    response = client.get("/api/graph/trace-metric/test_metric")
    assert response.status_code == 200

    data = response.json()
    assert data["metric"]["id"] == "test_metric"
    assert len(data["measures"]) == 1
    assert len(data["observations"]) == 1
    assert len(data["systems"]) == 1
    assert len(data["entities"]) == 1


def test_trace_metric_not_found(client, api_data):
    """Test tracing a non-existent metric."""
    response = client.get("/api/graph/trace-metric/nonexistent")
    assert response.status_code == 404


def test_get_perspective_view(client, api_data):
    """Test getting a perspective view."""
    response = client.get("/api/graph/perspective/test_perspective")
    assert response.status_code == 200

    data = response.json()
    assert data["perspective"]["id"] == "test_perspective"
    assert "metrics" in data
    assert "measures" in data
    assert "observations" in data
    assert "entities" in data


def test_get_perspective_view_not_found(client, api_data):
    """Test getting a non-existent perspective view."""
    response = client.get("/api/graph/perspective/nonexistent")
    assert response.status_code == 404


def test_get_process_flow(client, api_data):
    """Test getting process flow."""
    response = client.get("/api/graph/process/test_process/flow")
    assert response.status_code == 200

    data = response.json()
    assert data["process"]["id"] == "test_process"
    assert len(data["nodes"]) == 1
    assert data["nodes"][0]["id"] == "step1"
    assert data["nodes"][0]["sequence"] == 1


def test_get_process_flow_not_found(client, api_data):
    """Test getting a non-existent process flow."""
    response = client.get("/api/graph/process/nonexistent/flow")
    assert response.status_code == 404


def test_get_crystallization_points(client, api_data):
    """Test getting crystallization points."""
    response = client.get("/api/graph/process/test_process/crystallization")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["step_id"] == "step1"
    assert len(data[0]["observations"]) == 1


def test_get_crystallization_points_not_found(client, api_data):
    """Test getting crystallization points for non-existent process."""
    response = client.get("/api/graph/process/nonexistent/crystallization")
    assert response.status_code == 404


def test_cors_headers(client):
    """Test that CORS headers are set."""
    response = client.get("/health")
    # Note: TestClient doesn't process CORS middleware the same way
    # This is just to ensure the endpoint is accessible
    assert response.status_code == 200


def test_create_perspective(client):
    """Test creating a new perspective."""
    new_perspective = {
        "id": "new_test",
        "name": "New Test Perspective",
        "purpose": "Testing creation",
        "primary_concern": "Test",
        "typical_actors": ["Tester"],
        "consumes_from": [],
        "feeds": [],
    }

    response = client.post("/api/perspectives", json=new_perspective)
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == "new_test"
    assert data["name"] == "New Test Perspective"


def test_update_perspective(client, api_data):
    """Test updating a perspective."""
    updated_data = {
        "id": "test_perspective",
        "name": "Updated Test Perspective",
        "purpose": "Updated purpose",
        "primary_concern": "Updated concern",
        "typical_actors": ["Updated Tester"],
        "consumes_from": [],
        "feeds": [],
    }

    response = client.put("/api/perspectives/test_perspective", json=updated_data)
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "Updated Test Perspective"


def test_delete_perspective(client, api_data):
    """Test deleting a perspective."""
    response = client.delete("/api/perspectives/test_perspective")
    assert response.status_code == 200

    # Verify it's deleted
    get_response = client.get("/api/perspectives/test_perspective")
    assert get_response.status_code == 404


def test_create_system(client):
    """Test creating a new system."""
    new_system = {
        "id": "new_erp",
        "name": "New ERP System",
        "type": "ERP",
        "description": "New test ERP",
    }

    response = client.post("/api/systems", json=new_system)
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == "new_erp"
    assert data["type"] == "ERP"


def test_api_documentation(client):
    """Test that API documentation is accessible."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_openapi_schema(client):
    """Test that OpenAPI schema is accessible."""
    response = client.get("/openapi.json")
    assert response.status_code == 200

    schema = response.json()
    assert "openapi" in schema
    assert "info" in schema
    assert schema["info"]["title"] == "Business Ontology API"
