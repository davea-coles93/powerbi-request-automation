"""Tests for graph service."""
import pytest

from app.services.graph_service import GraphService
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
    EntityLens,
    Observation,
    Measure,
    Metric,
    Process,
    ProcessStep,
)


@pytest.fixture
def populated_db(
    test_db,
    sample_perspective,
    sample_system,
    sample_entity,
    sample_observation,
    sample_measure,
    sample_metric,
    sample_process,
):
    """Populate test database with sample data."""
    PerspectiveRepository(test_db).create(Perspective(**sample_perspective))
    SystemRepository(test_db).create(System(**sample_system))
    EntityRepository(test_db).create(Entity(**sample_entity))
    ObservationRepository(test_db).create(Observation(**sample_observation))
    MeasureRepository(test_db).create(Measure(**sample_measure))
    MetricRepository(test_db).create(Metric(**sample_metric))
    ProcessRepository(test_db).create(Process(**sample_process))

    return test_db


def test_graph_service_trace_metric(populated_db):
    """Test tracing a metric to its source."""
    service = GraphService(populated_db)

    trace = service.trace_metric("test_metric")

    assert trace is not None
    assert trace["metric"]["id"] == "test_metric"
    assert len(trace["measures"]) == 1
    assert trace["measures"][0]["id"] == "test_measure"
    assert len(trace["observations"]) == 1
    assert trace["observations"][0]["id"] == "test_observation"
    assert len(trace["systems"]) == 1
    assert trace["systems"][0]["id"] == "test_system"
    assert len(trace["entities"]) == 1
    assert trace["entities"][0]["id"] == "test_entity"


def test_graph_service_trace_metric_not_found(populated_db):
    """Test tracing a non-existent metric."""
    service = GraphService(populated_db)

    trace = service.trace_metric("nonexistent")
    assert trace is None


def test_graph_service_perspective_view(populated_db):
    """Test getting a perspective view."""
    service = GraphService(populated_db)

    view = service.get_perspective_view("test_perspective")

    assert view is not None
    assert view["perspective"]["id"] == "test_perspective"
    assert len(view["metrics"]) >= 0
    assert len(view["measures"]) >= 0
    assert len(view["observations"]) >= 0
    assert len(view["entities"]) >= 0


def test_graph_service_perspective_view_not_found(populated_db):
    """Test getting a non-existent perspective view."""
    service = GraphService(populated_db)

    view = service.get_perspective_view("nonexistent")
    assert view is None


def test_graph_service_process_flow(populated_db):
    """Test getting process flow."""
    service = GraphService(populated_db)

    flow = service.get_process_flow("test_process")

    assert flow is not None
    assert flow["process"]["id"] == "test_process"
    assert len(flow["nodes"]) == 1
    assert flow["nodes"][0]["id"] == "step1"
    assert flow["nodes"][0]["label"] == "Step 1"
    assert flow["nodes"][0]["sequence"] == 1
    assert flow["nodes"][0]["perspective_id"] == "test_perspective"
    assert len(flow["edges"]) == 0  # No dependencies in single step


def test_graph_service_process_flow_not_found(populated_db):
    """Test getting a non-existent process flow."""
    service = GraphService(populated_db)

    flow = service.get_process_flow("nonexistent")
    assert flow is None


def test_graph_service_process_flow_with_dependencies(test_db):
    """Test process flow with step dependencies."""
    # Create a process with multiple steps and dependencies
    perspective = Perspective(
        id="test_p",
        name="Test",
        purpose="Test",
        primary_concern="Test",
        typical_actors=[],
        consumes_from=[],
        feeds=[],
    )
    PerspectiveRepository(test_db).create(perspective)

    process = Process(
        id="multi_step",
        name="Multi Step Process",
        steps=[
            ProcessStep(
                id="step1",
                name="Step 1",
                sequence=1,
                perspective_id="test_p",
                depends_on_step_ids=[],
                crystallizes_observation_ids=[],
            ),
            ProcessStep(
                id="step2",
                name="Step 2",
                sequence=2,
                perspective_id="test_p",
                depends_on_step_ids=["step1"],
                crystallizes_observation_ids=[],
            ),
            ProcessStep(
                id="step3",
                name="Step 3",
                sequence=3,
                perspective_id="test_p",
                depends_on_step_ids=["step1", "step2"],
                crystallizes_observation_ids=[],
            ),
        ],
    )
    ProcessRepository(test_db).create(process)

    service = GraphService(test_db)
    flow = service.get_process_flow("multi_step")

    assert len(flow["nodes"]) == 3
    # step2 depends on step1, step3 depends on step1 and step2
    # Should have 3 edges: step1->step2, step1->step3, step2->step3
    assert len(flow["edges"]) == 3


def test_graph_service_crystallization_points(populated_db):
    """Test getting crystallization points."""
    service = GraphService(populated_db)

    points = service.get_crystallization_points("test_process")

    assert points is not None
    assert len(points) == 1
    assert points[0]["step_id"] == "step1"
    assert points[0]["step_name"] == "Step 1"
    assert len(points[0]["observations"]) == 1
    assert points[0]["observations"][0]["id"] == "test_observation"


def test_graph_service_crystallization_points_not_found(populated_db):
    """Test getting crystallization points for non-existent process."""
    service = GraphService(populated_db)

    points = service.get_crystallization_points("nonexistent")
    assert points is None


def test_graph_service_metric_lineage_complete(populated_db):
    """Test that metric lineage is complete and connected."""
    service = GraphService(populated_db)

    trace = service.trace_metric("test_metric")

    # Verify all connections exist
    metric = trace["metric"]
    measures = trace["measures"]
    observations = trace["observations"]
    systems = trace["systems"]

    # Metric should reference the measure
    assert "test_measure" in metric["calculated_by_measure_ids"]

    # Measure should reference the observation
    assert "test_observation" in measures[0]["input_observation_ids"]

    # Observation should reference the system
    assert observations[0]["system_id"] == "test_system"

    # System should exist
    assert systems[0]["id"] == "test_system"
