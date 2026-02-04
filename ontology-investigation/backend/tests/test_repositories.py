"""Tests for database repositories."""
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
    EntityLens,
    Observation,
    Measure,
    Metric,
    Process,
    ProcessStep,
)


def test_perspective_repository_create(test_db, sample_perspective):
    """Test creating a perspective."""
    repo = PerspectiveRepository(test_db)
    perspective = Perspective(**sample_perspective)

    created = repo.create(perspective)
    assert created.id == sample_perspective["id"]
    assert created.name == sample_perspective["name"]


def test_perspective_repository_get(test_db, sample_perspective):
    """Test getting a perspective by ID."""
    repo = PerspectiveRepository(test_db)
    perspective = Perspective(**sample_perspective)
    repo.create(perspective)

    retrieved = repo.get_by_id(sample_perspective["id"])
    assert retrieved is not None
    assert retrieved.id == sample_perspective["id"]


def test_perspective_repository_get_all(test_db, sample_perspective):
    """Test getting all perspectives."""
    repo = PerspectiveRepository(test_db)
    perspective = Perspective(**sample_perspective)
    repo.create(perspective)

    all_perspectives = repo.get_all()
    assert len(all_perspectives) == 1
    assert all_perspectives[0].id == sample_perspective["id"]


def test_perspective_repository_update(test_db, sample_perspective):
    """Test updating a perspective."""
    repo = PerspectiveRepository(test_db)
    perspective = Perspective(**sample_perspective)
    repo.create(perspective)

    perspective.name = "Updated Name"
    updated = repo.update(sample_perspective["id"], perspective)
    assert updated.name == "Updated Name"


def test_perspective_repository_delete(test_db, sample_perspective):
    """Test deleting a perspective."""
    repo = PerspectiveRepository(test_db)
    perspective = Perspective(**sample_perspective)
    repo.create(perspective)

    result = repo.delete(sample_perspective["id"])
    assert result is True

    retrieved = repo.get_by_id(sample_perspective["id"])
    assert retrieved is None


def test_system_repository_create(test_db, sample_system):
    """Test creating a system."""
    repo = SystemRepository(test_db)
    system = System(**sample_system)

    created = repo.create(system)
    assert created.id == sample_system["id"]
    assert created.type == sample_system["type"]


def test_system_repository_get_all(test_db, sample_system):
    """Test getting all systems."""
    repo = SystemRepository(test_db)
    system = System(**sample_system)
    repo.create(system)

    all_systems = repo.get_all()
    assert len(all_systems) == 1
    assert all_systems[0].type == "ERP"


def test_entity_repository_create(test_db, sample_entity):
    """Test creating an entity with lenses."""
    repo = EntityRepository(test_db)
    entity = Entity(**sample_entity)

    created = repo.create(entity)
    assert created.id == sample_entity["id"]
    assert len(created.lenses) == 1
    assert created.lenses[0].perspective_id == "test_perspective"


def test_observation_repository_create(
    test_db, sample_perspective, sample_system, sample_entity, sample_observation
):
    """Test creating an observation."""
    # Create dependencies first
    PerspectiveRepository(test_db).create(Perspective(**sample_perspective))
    SystemRepository(test_db).create(System(**sample_system))
    EntityRepository(test_db).create(Entity(**sample_entity))

    repo = ObservationRepository(test_db)
    observation = Observation(**sample_observation)

    created = repo.create(observation)
    assert created.id == sample_observation["id"]
    assert created.reliability == "High"
    assert created.volatility == "Point-in-time"


def test_observation_repository_get_by_system(
    test_db, sample_perspective, sample_system, sample_entity, sample_observation
):
    """Test getting observations by system ID."""
    # Create dependencies
    PerspectiveRepository(test_db).create(Perspective(**sample_perspective))
    SystemRepository(test_db).create(System(**sample_system))
    EntityRepository(test_db).create(Entity(**sample_entity))

    repo = ObservationRepository(test_db)
    observation = Observation(**sample_observation)
    repo.create(observation)

    observations = repo.get_by_system_id(sample_system["id"])
    assert len(observations) == 1
    assert observations[0].system_id == sample_system["id"]


def test_measure_repository_create(
    test_db, sample_perspective, sample_system, sample_entity, sample_observation, sample_measure
):
    """Test creating a measure."""
    # Create dependencies
    PerspectiveRepository(test_db).create(Perspective(**sample_perspective))
    SystemRepository(test_db).create(System(**sample_system))
    EntityRepository(test_db).create(Entity(**sample_entity))
    ObservationRepository(test_db).create(Observation(**sample_observation))

    repo = MeasureRepository(test_db)
    measure = Measure(**sample_measure)

    created = repo.create(measure)
    assert created.id == sample_measure["id"]
    assert len(created.input_observation_ids) == 1


def test_measure_repository_get_by_observation(
    test_db, sample_perspective, sample_system, sample_entity, sample_observation, sample_measure
):
    """Test getting measures that use a specific observation."""
    # Create dependencies
    PerspectiveRepository(test_db).create(Perspective(**sample_perspective))
    SystemRepository(test_db).create(System(**sample_system))
    EntityRepository(test_db).create(Entity(**sample_entity))
    ObservationRepository(test_db).create(Observation(**sample_observation))

    repo = MeasureRepository(test_db)
    measure = Measure(**sample_measure)
    repo.create(measure)

    measures = repo.get_by_observation_id(sample_observation["id"])
    assert len(measures) == 1
    assert measures[0].id == sample_measure["id"]


def test_metric_repository_create(
    test_db, sample_perspective, sample_system, sample_entity,
    sample_observation, sample_measure, sample_metric
):
    """Test creating a metric."""
    # Create dependencies
    PerspectiveRepository(test_db).create(Perspective(**sample_perspective))
    SystemRepository(test_db).create(System(**sample_system))
    EntityRepository(test_db).create(Entity(**sample_entity))
    ObservationRepository(test_db).create(Observation(**sample_observation))
    MeasureRepository(test_db).create(Measure(**sample_measure))

    repo = MetricRepository(test_db)
    metric = Metric(**sample_metric)

    created = repo.create(metric)
    assert created.id == sample_metric["id"]
    assert len(created.calculated_by_measure_ids) == 1


def test_process_repository_create(test_db, sample_perspective, sample_process):
    """Test creating a process with steps."""
    PerspectiveRepository(test_db).create(Perspective(**sample_perspective))

    repo = ProcessRepository(test_db)
    process = Process(**sample_process)

    created = repo.create(process)
    assert created.id == sample_process["id"]
    assert len(created.steps) == 1
    assert created.steps[0].sequence == 1


def test_process_repository_get_all(test_db, sample_perspective, sample_process):
    """Test getting all processes."""
    PerspectiveRepository(test_db).create(Perspective(**sample_perspective))

    repo = ProcessRepository(test_db)
    process = Process(**sample_process)
    repo.create(process)

    all_processes = repo.get_all()
    assert len(all_processes) == 1
    assert all_processes[0].id == sample_process["id"]


def test_repository_cascade_delete(test_db, sample_perspective, sample_system):
    """Test that deleting a system doesn't break referential integrity."""
    # This test ensures our repositories handle relationships correctly
    perspective_repo = PerspectiveRepository(test_db)
    system_repo = SystemRepository(test_db)

    perspective_repo.create(Perspective(**sample_perspective))
    system_repo.create(System(**sample_system))

    # Delete system
    system_repo.delete(sample_system["id"])

    # Perspective should still exist
    perspective = perspective_repo.get_by_id(sample_perspective["id"])
    assert perspective is not None
