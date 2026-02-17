import json
from pathlib import Path
from sqlalchemy import create_engine, Column, String, Integer, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database path
# Use /app/data which is mounted as a volume in Docker
DATA_DIR = Path("/app/data")
DATA_DIR.mkdir(exist_ok=True)
DATABASE_URL = f"sqlite:///{DATA_DIR / 'ontology.db'}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# SQLAlchemy Models
class PerspectiveDB(Base):
    __tablename__ = "perspectives"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    purpose = Column(Text)
    primary_concern = Column(Text)
    typical_actors = Column(JSON, default=list)
    consumes_from = Column(JSON, default=list)
    feeds = Column(JSON, default=list)


class SystemDB(Base):
    __tablename__ = "systems"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    vendor = Column(String)
    reliability_default = Column(String)
    integration_status = Column(String)
    notes = Column(Text)


class EntityDB(Base):
    __tablename__ = "entities"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    core_attributes = Column(JSON, default=list)
    lenses = Column(JSON, default=list)


class AttributeDB(Base):
    __tablename__ = "attributes"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    entity_id = Column(String, nullable=False)
    system_id = Column(String, nullable=False)
    source_actor = Column(String)
    reliability = Column(String)
    volatility = Column(String)
    notes = Column(Text)
    source_table = Column(String)
    source_column = Column(String)
    source_connection = Column(String)
    constraints = Column(JSON)
    perspective_ids = Column(JSON)


class MeasureDB(Base):
    __tablename__ = "measures"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    logic = Column(Text)
    formula = Column(String)
    input_attribute_ids = Column(JSON, default=list)
    input_measure_ids = Column(JSON, default=list)
    perspective_ids = Column(JSON, default=list)


class MetricDB(Base):
    __tablename__ = "metrics"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    business_question = Column(Text, nullable=False)
    calculated_by_measure_ids = Column(JSON, default=list)
    perspective_ids = Column(JSON, default=list)


class ProcessDB(Base):
    __tablename__ = "processes"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    steps = Column(JSON, default=list)


class SemanticMappingDB(Base):
    __tablename__ = "semantic_mappings"

    id = Column(String, primary_key=True)
    ontology_type = Column(String, nullable=False)
    ontology_id = Column(String, nullable=False)
    semantic_object = Column(String)
    semantic_type = Column(String)
    status = Column(String, default="gap")
    notes = Column(Text)


class SemanticTableDB(Base):
    __tablename__ = "semantic_tables"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    table_type = Column(String, nullable=False)
    description = Column(Text)
    mapped_entity_id = Column(String)
    source_system_id = Column(String)
    columns = Column(JSON, default=list)
    measures = Column(JSON, default=list)


class WorkshopSessionDB(Base):
    __tablename__ = "workshop_sessions"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    date = Column(String)
    participants = Column(JSON, default=list)
    session_type = Column(String)
    notes = Column(Text)
    findings = Column(JSON, default=list)


def init_db():
    """Create all tables and migrate schema if needed."""
    Base.metadata.create_all(bind=engine)
    _migrate_schema()


def _migrate_schema():
    """Add any missing columns to existing tables.

    SQLAlchemy's create_all() only creates new tables; it won't ALTER existing
    ones to add new columns.  This lightweight migration inspects each mapped
    table and issues ALTER TABLE ADD COLUMN for anything missing.
    """
    from sqlalchemy import inspect as sa_inspect, text

    inspector = sa_inspect(engine)
    with engine.connect() as conn:
        for table_cls in Base.__subclasses__():
            table_name = table_cls.__tablename__
            if not inspector.has_table(table_name):
                continue

            existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
            for col in table_cls.__table__.columns:
                if col.name not in existing_cols:
                    # Determine SQLite type
                    col_type = col.type.compile(engine.dialect)
                    conn.execute(
                        text(f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type}")
                    )
        conn.commit()


def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
