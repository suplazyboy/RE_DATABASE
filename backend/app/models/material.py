from __future__ import annotations

"""
Material model mapping to existing PostgreSQL table 'materials'.
Based on ALL_INFO.sql table definition.
All fields are Optional because many columns allow NULL in database.
"""
import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import JSONB, ARRAY, UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase

# Field length constants
MAX_MATERIAL_ID_LENGTH = 50
MAX_FORMULA_LENGTH = 100
MAX_CHEMSYS_LENGTH = 50
MAX_ORDERING_LENGTH = 20
MAX_DATA_SOURCE_LENGTH = 50
MAX_ES_SOURCE_CALC_ID_LENGTH = 100


class Base(DeclarativeBase):
    pass


class Material(Base):
    __tablename__ = "materials"

    # ===== 基础信息 =====
    uuid: uuid.UUID | None = Column(PG_UUID(as_uuid=True), primary_key=True, default=None)
    id: int | None = Column(Integer, unique=True, nullable=False)  # SERIAL in DB
    material_id: str = Column(String(MAX_MATERIAL_ID_LENGTH), unique=True, nullable=False)
    last_updated: DateTime | None = Column(DateTime(timezone=True))
    commit_time: DateTime | None = Column(DateTime(timezone=True), default=None)
    deprecated: bool | None = Column(Boolean, default=False)
    deprecation_reasons: list[str] | None = Column(ARRAY(Text))
    theoretical: bool | None = Column(Boolean, default=False)

    # ===== 成分与组成 =====
    elements: list[str] | None = Column(ARRAY(Text))
    nelements: int | None = Column(Integer)
    composition: dict | None = Column(JSONB)
    composition_reduced: dict | None = Column(JSONB)
    formula_pretty: str | None = Column(String(MAX_FORMULA_LENGTH))
    formula_anonymous: str | None = Column(String(MAX_FORMULA_LENGTH))
    chemsys: str | None = Column(String(MAX_CHEMSYS_LENGTH))
    nsites: int | None = Column(Integer)
    possible_species: list[str] | None = Column(ARRAY(Text))
    data_source: str | None = Column(String(MAX_DATA_SOURCE_LENGTH), default='Materials Project')

    # ===== 结构信息 =====
    structure: dict | None = Column(JSONB)
    symmetry: dict | None = Column(JSONB)
    volume: float | None = Column(Float)
    density: float | None = Column(Float)
    density_atomic: float | None = Column(Float)
    cif: str | None = Column(Text)

    # ===== 热力学性质和稳定性 =====
    uncorrected_energy_per_atom: float | None = Column(Float)
    energy_per_atom: float | None = Column(Float)
    formation_energy_per_atom: float | None = Column(Float)
    energy_above_hull: float | None = Column(Float)
    is_stable: bool | None = Column(Boolean)
    equilibrium_reaction_energy_per_atom: float | None = Column(Float)
    decomposes_to: dict | None = Column(JSONB)

    # ===== 电子结构 =====
    is_metal: bool | None = Column(Boolean)
    band_gap: float | None = Column(Float)
    cbm: float | None = Column(Float)
    vbm: float | None = Column(Float)
    efermi: float | None = Column(Float)
    is_gap_direct: bool | None = Column(Boolean)
    es_source_calc_id: str | None = Column(String(MAX_ES_SOURCE_CALC_ID_LENGTH))
    bandstructure: dict | None = Column(JSONB)
    dos: dict | None = Column(JSONB)
    dos_energy_up: dict | None = Column(JSONB)
    dos_energy_down: dict | None = Column(JSONB)

    # ===== 磁性 =====
    is_magnetic: bool | None = Column(Boolean)
    ordering: str | None = Column(String(MAX_ORDERING_LENGTH))
    total_magnetization: float | None = Column(Float)
    total_magnetization_normalized_vol: float | None = Column(Float)
    total_magnetization_normalized_formula_units: float | None = Column(Float)
    num_magnetic_sites: int | None = Column(Integer)
    num_unique_magnetic_sites: int | None = Column(Integer)
    types_of_magnetic_species: list[str] | None = Column(ARRAY(Text))

    # ===== 力学性质 =====
    bulk_modulus: dict | None = Column(JSONB)
    shear_modulus: dict | None = Column(JSONB)
    universal_anisotropy: float | None = Column(Float)
    homogeneous_poisson: float | None = Column(Float)

    # ===== 介电与压电性质 =====
    e_total: float | None = Column(Float)  # REAL in SQL
    e_ionic: float | None = Column(Float)
    e_electronic: float | None = Column(Float)
    n: float | None = Column(Float)
    e_ij_max: float | None = Column(Float)

    # ===== 表面性质 =====
    weighted_surface_energy_EV_PER_ANG2: float | None = Column("weighted_surface_energy_ev_per_ang2", Float)
    weighted_surface_energy: float | None = Column(Float)
    weighted_work_function: float | None = Column(Float)
    surface_anisotropy: float | None = Column(Float)
    shape_factor: float | None = Column(Float)
    has_reconstructed: bool | None = Column(Boolean)

    # ===== 其他性质 =====
    xas: dict | None = Column(JSONB)
    grain_boundaries: dict | None = Column(JSONB)
    database_IDs: dict | None = Column("database_ids", JSONB)
    has_props: dict | None = Column(JSONB)
    created_at: DateTime | None = Column(DateTime(timezone=True), default=None)
    raw_data: dict | None = Column(JSONB)

    # Indexes (matching existing database indexes)
    __table_args__ = (
        Index("idx_material_id", "material_id"),
        Index("idx_formula_pretty", "formula_pretty"),
        Index("idx_elements", "elements", postgresql_using="gin"),
        Index("idx_is_stable", "is_stable"),
        Index("idx_band_gap", "band_gap"),
        Index("idx_is_metal", "is_metal"),
        Index("idx_stable_bandgap", "is_stable", "band_gap"),
        Index("idx_chemsys_bandgap", "chemsys", "band_gap"),
    )