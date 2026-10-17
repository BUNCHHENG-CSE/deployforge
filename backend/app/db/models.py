import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    BigInteger,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# Use JSONB if on PostgreSQL, fallback to standard JSON
JsonType = JSONB().with_variant(JSON(), "sqlite")

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String(64), primary_key=True, index=True)
    display_name = Column(String(255), nullable=False)
    auth_mode = Column(String(32), nullable=False, default="simulation") # simulation, device_code, service_principal
    client_id = Column(String(128), nullable=True)
    client_secret = Column(Text, nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    is_simulation = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))

    jobs = relationship("DeploymentJob", back_populates="tenant", cascade="all, delete-orphan")

class DeploymentJob(Base):
    __tablename__ = "deployment_jobs"

    job_id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    app_name = Column(String(255), nullable=False)
    publisher = Column(String(255), nullable=False)
    version = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False, default="pending", index=True) # pending, running, completed, failed
    progress = Column(Integer, default=0, nullable=False)
    current_step = Column(String(255), nullable=False)
    target_group_id = Column(String(128), nullable=False)
    assignment_intent = Column(String(32), nullable=False, default="required")
    architecture = Column(String(32), default="x64")
    install_command = Column(Text, nullable=False)
    uninstall_command = Column(Text, nullable=False)
    install_behavior = Column(String(32), default="system")
    device_restart_behavior = Column(String(32), default="suppress")
    detection_rules = Column(JsonType, nullable=False, default=list)
    logs = Column(JsonType, nullable=False, default=list)
    intunewin_filename = Column(String(255), nullable=True)
    intune_app_id = Column(String(128), nullable=True)
    is_simulation = Column(Boolean, default=False, nullable=False)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    tenant = relationship("Tenant", back_populates="jobs")

    __table_args__ = (
        Index("idx_tenant_created", "tenant_id", "created_at"),
        Index("idx_status_created", "status", "created_at"),
    )

class CustomPackage(Base):
    __tablename__ = "custom_packages"

    id = Column(String(64), primary_key=True, index=True)
    file_token = Column(String(64), unique=True, nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    file_type = Column(String(16), nullable=False) # .exe, .msi, .zip
    engine = Column(String(64), nullable=False)
    analysis_metadata = Column(JsonType, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
