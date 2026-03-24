// 材料摘要（列表页）
export interface MaterialSummary {
  material_id: string;
  formula_pretty: string | null;
  elements: string[] | null;
  nelements: number | null;
  chemsys: string | null;
  crystal_system: string | null;
  space_group_symbol: string | null;
  nsites: number | null;
  volume: number | null;
  density: number | null;
  band_gap: number | null;
  is_metal: boolean | null;
  is_stable: boolean | null;
  is_magnetic: boolean | null;
  energy_above_hull: number | null;
  formation_energy_per_atom: number | null;
}

// 材料详情（详情页）
export interface MaterialDetail extends MaterialSummary {
  structure: Record<string, unknown> | null;
  lattice: Record<string, unknown> | null;
  symmetry: Record<string, unknown> | null;
  cif: string | null;
  space_group_number: number | null;
  point_group: string | null;

  energy_per_atom: number | null;
  decomposes_to: Record<string, unknown>[] | null;

  cbm: number | null;
  vbm: number | null;
  efermi: number | null;
  is_gap_direct: boolean | null;
  dos: Record<string, unknown> | null;
  bandstructure: Record<string, unknown> | null;

  ordering: string | null;
  total_magnetization: number | null;
  types_of_magnetic_species: string[] | null;

  bulk_modulus: Record<string, unknown> | null;
  shear_modulus: Record<string, unknown> | null;
  universal_anisotropy: number | null;
  homogeneous_poisson: number | null;

  e_total: number | null;
  e_ionic: number | null;
  e_electronic: number | null;
  n: number | null;

  weighted_surface_energy: number | null;
  weighted_work_function: number | null;

  database_IDs: Record<string, unknown> | null;
  last_updated: string | null;
  deprecated: boolean | null;
  warnings: string[] | null;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

// 搜索参数
export interface SearchParams {
  page?: number;
  per_page?: number;
  sort_field?: string;
  sort_order?: 'asc' | 'desc';

  formula?: string;
  elements?: string;
  exclude_elements?: string;
  chemsys?: string;
  nelements_min?: number;
  nelements_max?: number;

  band_gap_min?: number;
  band_gap_max?: number;
  is_metal?: boolean;
  is_gap_direct?: boolean;

  is_stable?: boolean;
  energy_above_hull_max?: number;

  is_magnetic?: boolean;
  ordering?: string;

  crystal_system?: string;
  space_group_number?: number;
  nsites_min?: number;
  nsites_max?: number;
  volume_min?: number;
  volume_max?: number;
  density_min?: number;
  density_max?: number;
}