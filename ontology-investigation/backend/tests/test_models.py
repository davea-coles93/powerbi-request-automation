"""Tests for Pydantic models."""
import pytest
from pydantic import ValidationError

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


def test_perspective_model():
    """Test Perspective model validation."""
    perspective = Perspective(
        id="test",
        name="Test Perspective",
        purpose="Testing",
        primary_concern="Test concern",
        typical_actors=["Tester"],
        consumes_from=[],
        feeds=[]
    )
    assert perspective.id == "test"
    assert perspective.name == "Test Perspective"
    assert len(perspective.typical_actors) == 1


def test_perspective_model_invalid():
    """Test Perspective model with missing required fields."""
    with pytest.raises(ValidationError):
        Perspective(id="test")


def test_system_model():
    """Test System model validation."""
    system = System(
        id="erp1",
        name="ERP System",
        type="ERP",
        description="Main ERP"
    )
    assert system.id == "erp1"
    assert system.type == "ERP"


def test_system_type_validation():
    """Test System type validation."""
    valid_types = ["ERP", "MES", "WMS", "Spreadsheet", "Manual"]
    for sys_type in valid_types:
        system = System(id="test", name="Test", type=sys_type)
        assert system.type == sys_type


def test_entity_lens():
    """Test EntityLens model."""
    lens = EntityLens(
        perspective_id="operational",
        interpretation="Work instruction",
        key_attributes=["order_number"]
    )
    assert lens.perspective_id == "operational"
    assert len(lens.key_attributes) == 1


def test_entity_model():
    """Test Entity model with lenses."""
    entity = Entity(
        id="production_order",
        name="Production Order",
        description="Manufacturing order",
        lenses=[
            EntityLens(
                perspective_id="operational",
                interpretation="Work instruction",
                key_attributes=["order_number"]
            )
        ]
    )
    assert entity.id == "production_order"
    assert len(entity.lenses) == 1


def test_observation_model():
    """Test Observation model validation."""
    obs = Observation(
        id="qty_produced",
        name="Quantity Produced",
        description="Actual quantity produced",
        system_id="mes",
        entity_id="production_order",
        perspective_ids=["operational"],
        reliability="High",
        volatility="Point-in-time"
    )
    assert obs.id == "qty_produced"
    assert obs.reliability == "High"
    assert obs.volatility == "Point-in-time"


def test_observation_reliability_validation():
    """Test Observation reliability validation."""
    valid_levels = ["High", "Medium", "Low"]
    for level in valid_levels:
        obs = Observation(
            id="test",
            name="Test",
            system_id="test",
            entity_id="test",
            perspective_ids=["operational"],
            reliability=level,
            volatility="Point-in-time"
        )
        assert obs.reliability == level


def test_observation_volatility_validation():
    """Test Observation volatility validation."""
    valid_types = ["Point-in-time", "Accumulating", "Continuous"]
    for vol_type in valid_types:
        obs = Observation(
            id="test",
            name="Test",
            system_id="test",
            entity_id="test",
            perspective_ids=["operational"],
            reliability="High",
            volatility=vol_type
        )
        assert obs.volatility == vol_type


def test_measure_model():
    """Test Measure model validation."""
    measure = Measure(
        id="total_cost",
        name="Total Cost",
        description="Sum of costs",
        logic="sum(material_cost) + sum(labor_cost)",
        input_observation_ids=["material_cost", "labor_cost"],
        perspective_ids=["management"]
    )
    assert measure.id == "total_cost"
    assert len(measure.input_observation_ids) == 2


def test_metric_model():
    """Test Metric model validation."""
    metric = Metric(
        id="cogs",
        name="COGS",
        description="Cost of goods sold",
        business_question="What did it cost?",
        calculated_by_measure_ids=["total_cost"],
        perspective_ids=["financial"]
    )
    assert metric.id == "cogs"
    assert len(metric.calculated_by_measure_ids) == 1


def test_process_step_model():
    """Test ProcessStep model validation."""
    step = ProcessStep(
        id="step1",
        name="First Step",
        sequence=1,
        perspective_id="operational",
        actor="Operator",
        depends_on_step_ids=[],
        crystallizes_observation_ids=["qty_produced"]
    )
    assert step.id == "step1"
    assert step.sequence == 1
    assert len(step.crystallizes_observation_ids) == 1


def test_process_model():
    """Test Process model with steps."""
    process = Process(
        id="month_end",
        name="Month End Close",
        description="Close the month",
        steps=[
            ProcessStep(
                id="step1",
                name="Cutoff",
                sequence=1,
                perspective_id="operational",
                depends_on_step_ids=[],
                crystallizes_observation_ids=[]
            ),
            ProcessStep(
                id="step2",
                name="Count",
                sequence=2,
                perspective_id="operational",
                depends_on_step_ids=["step1"],
                crystallizes_observation_ids=["qty_on_hand"]
            )
        ]
    )
    assert process.id == "month_end"
    assert len(process.steps) == 2
    assert process.steps[1].depends_on_step_ids == ["step1"]


def test_process_step_dependencies():
    """Test ProcessStep dependency relationships."""
    step1 = ProcessStep(
        id="step1",
        name="Step 1",
        sequence=1,
        perspective_id="operational",
        depends_on_step_ids=[],
        crystallizes_observation_ids=[]
    )
    step2 = ProcessStep(
        id="step2",
        name="Step 2",
        sequence=2,
        perspective_id="management",
        depends_on_step_ids=["step1"],
        crystallizes_observation_ids=[]
    )

    assert step1.depends_on_step_ids == []
    assert step2.depends_on_step_ids == ["step1"]
