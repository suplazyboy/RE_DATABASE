-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- 创建主表
CREATE TABLE IF NOT EXISTS materials (
    -- 基础信息
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id SERIAL UNIQUE NOT NULL,
    material_id VARCHAR(50) UNIQUE NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE,
    commit_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deprecated BOOLEAN DEFAULT FALSE,
    deprecation_reasons TEXT[],
    theoretical BOOLEAN DEFAULT FALSE,

    -- 成分与组成
    elements TEXT[],
    nelements INTEGER,
    composition JSONB,
    composition_reduced JSONB,
    formula_pretty VARCHAR(100),
    formula_anonymous VARCHAR(100),
    chemsys VARCHAR(50),
    nsites INTEGER,
    possible_species TEXT[],
    data_source VARCHAR(50) DEFAULT 'Materials Project',

    -- 结构信息
    structure JSONB,
    symmetry JSONB,
    volume FLOAT,
    density FLOAT,
    density_atomic FLOAT,
    cif TEXT,                                   -- CIF 文件内容

    -- 热力学性质和稳定性
    uncorrected_energy_per_atom FLOAT,
    energy_per_atom FLOAT,
    formation_energy_per_atom FLOAT,
    energy_above_hull FLOAT,
    is_stable BOOLEAN,
    equilibrium_reaction_energy_per_atom FLOAT,
    decomposes_to JSONB,

    -- 电子结构
    is_metal BOOLEAN,
    band_gap FLOAT,
    cbm FLOAT,
    vbm FLOAT,
    efermi FLOAT,
    is_gap_direct BOOLEAN,
    es_source_calc_id VARCHAR(100),
    bandstructure JSONB,
    dos JSONB,
    dos_energy_up JSONB,
    dos_energy_down JSONB,

    -- 磁性
    is_magnetic BOOLEAN,
    ordering VARCHAR(20),
    total_magnetization FLOAT,
    total_magnetization_normalized_vol FLOAT,
    total_magnetization_normalized_formula_units FLOAT,
    num_magnetic_sites INTEGER,
    num_unique_magnetic_sites INTEGER,
    types_of_magnetic_species TEXT[],

    -- 力学性质
    bulk_modulus JSONB,
    shear_modulus JSONB,
    universal_anisotropy FLOAT,
    homogeneous_poisson FLOAT,

    -- 介电与压电性质
    e_total REAL,
    e_ionic REAL,
    e_electronic REAL,
    n REAL,
    e_ij_max REAL,

    -- 表面性质
    weighted_surface_energy_EV_PER_ANG2 FLOAT,
    weighted_surface_energy FLOAT,
    weighted_work_function FLOAT,
    surface_anisotropy FLOAT,
    shape_factor FLOAT,
    has_reconstructed BOOLEAN,

    -- 其他性质
    xas JSONB,
    grain_boundaries JSONB,
    database_IDs JSONB,
    has_props JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB                         -- 原始 JSON 备份
);

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_material_id ON materials(material_id);
CREATE INDEX IF NOT EXISTS idx_id ON materials(id);
CREATE INDEX IF NOT EXISTS idx_formula_pretty ON materials(formula_pretty);
CREATE INDEX IF NOT EXISTS idx_elements ON materials USING GIN(elements);
CREATE INDEX IF NOT EXISTS idx_composition ON materials USING GIN(composition);
CREATE INDEX IF NOT EXISTS idx_symmetry ON materials USING GIN(symmetry);
CREATE INDEX IF NOT EXISTS idx_structure ON materials USING GIN(structure);
CREATE INDEX IF NOT EXISTS idx_is_stable ON materials(is_stable);
CREATE INDEX IF NOT EXISTS idx_band_gap ON materials(band_gap);
CREATE INDEX IF NOT EXISTS idx_is_metal ON materials(is_metal);
CREATE INDEX IF NOT EXISTS idx_raw_data ON materials USING GIN(raw_data);

-- JSONB字段的GIN索引
CREATE INDEX IF NOT EXISTS idx_composition ON materials USING GIN(composition);
CREATE INDEX IF NOT EXISTS idx_symmetry ON materials USING GIN(symmetry);
CREATE INDEX IF NOT EXISTS idx_structure ON materials USING GIN(structure);
CREATE INDEX IF NOT EXISTS idx_bulk_modulus ON materials USING GIN(bulk_modulus);
CREATE INDEX IF NOT EXISTS idx_has_props ON materials USING GIN(has_props);
CREATE INDEX IF NOT EXISTS idx_raw_data ON materials USING GIN(raw_data);

-- 复合索引（常用组合）
CREATE INDEX IF NOT EXISTS idx_stable_bandgap ON materials(is_stable, band_gap);
CREATE INDEX IF NOT EXISTS idx_chemsys_bandgap ON materials(chemsys, band_gap);

-- 更新时间触发器（可选）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.commit_time = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;
CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为所有字段添加注释
COMMENT ON TABLE materials IS '材料属性主表，存储材料的各类计算和实验性质';

-- 材料标识与组成信息注释
COMMENT ON COLUMN materials.material_id IS '材料唯一标识符，通常是MP-ID或其他数据库中的唯一ID';
COMMENT ON COLUMN materials.last_updated IS '数据最后更新时间，记录原始数据源的更新时间';
COMMENT ON COLUMN materials.commit_time IS '数据入库时间，记录数据被插入到当前数据库的时间';
COMMENT ON COLUMN materials.deprecated IS '是否已废弃标记，True表示该材料数据已不再推荐使用';
COMMENT ON COLUMN materials.deprecation_reasons IS '废弃原因，说明为什么该材料数据被废弃';
COMMENT ON COLUMN materials.theoretical IS '是否为理论计算材料，False表示实验数据';
COMMENT ON COLUMN materials.elements IS '组成元素列表，包含材料中所有的化学元素';
COMMENT ON COLUMN materials.nelements IS '元素种类数量，即材料中包含多少种不同的元素';
COMMENT ON COLUMN materials.composition IS '完整化学组成，包含元素的化学计量比';
COMMENT ON COLUMN materials.composition_reduced IS '约化化学组成，简化后的化学计量比表示';
COMMENT ON COLUMN materials.formula_pretty IS '美观格式化的化学式，便于显示';
COMMENT ON COLUMN materials.formula_anonymous IS '匿名化学式，使用A、B等字母替代具体元素';
COMMENT ON COLUMN materials.chemsys IS '化学体系，如"Fe-O"表示铁氧体系';
COMMENT ON COLUMN materials.nsites IS '原子个数，晶胞中原子的总数';
COMMENT ON COLUMN materials.possible_species IS '可能存在的价态，如["Fe2+","Fe3+"]';

-- 结构信息注释
COMMENT ON COLUMN materials.structure IS '晶体结构信息，包含晶格参数、原子坐标等完整结构数据';
COMMENT ON COLUMN materials.symmetry IS '对称性信息，包括空间群、点群等晶体学对称性数据';
COMMENT ON COLUMN materials.volume IS '晶胞体积，单位为立方埃(Å³)';
COMMENT ON COLUMN materials.density IS '理论密度，单位为g/cm³';
COMMENT ON COLUMN materials.density_atomic IS '每个原子平均所占体积，单位为Å³/atom';

-- 热力学性质和稳定性注释
COMMENT ON COLUMN materials.uncorrected_energy_per_atom IS '未修正能量，DFT计算得到的原始能量值，单位为eV/atom';
COMMENT ON COLUMN materials.energy_per_atom IS '修正能量，经过各种修正后的能量值，单位为eV/atom';
COMMENT ON COLUMN materials.formation_energy_per_atom IS '每个原子的形成能，单位为eV/atom';
COMMENT ON COLUMN materials.energy_above_hull IS '相较于凸包图的能量距离，单位为eV/atom，0表示稳定';
COMMENT ON COLUMN materials.is_stable IS '是否热力学稳定，基于凸包图判断';
COMMENT ON COLUMN materials.equilibrium_reaction_energy_per_atom IS '平衡反应能量，单位为eV/atom';
COMMENT ON COLUMN materials.decomposes_to IS '热力学分解产物，包含分解反应的产物和能量信息';

-- 电子结构注释
COMMENT ON COLUMN materials.is_metal IS '金属性标记，True表示材料具有金属导电性';
COMMENT ON COLUMN materials.band_gap IS '带隙，单位为eV，半导体或绝缘体的能隙大小';
COMMENT ON COLUMN materials.cbm IS '导带底能量，单位为eV，相对于某个参考能级';
COMMENT ON COLUMN materials.vbm IS '价带顶能量，单位为eV，相对于某个参考能级';
COMMENT ON COLUMN materials.efermi IS '费米能级，单位为eV';
COMMENT ON COLUMN materials.is_gap_direct IS '是否为直接带隙，True表示直接带隙半导体';
COMMENT ON COLUMN materials.es_source_calc_id IS '电子结构计算源ID，指向产生该电子结构的计算任务';
COMMENT ON COLUMN materials.bandstructure IS '能带结构数据，包含k路径、本征值等完整能带信息';
COMMENT ON COLUMN materials.dos IS '总态密度数据，包含能量和态密度值';
COMMENT ON COLUMN materials.dos_energy_up IS '自旋向上态密度数据，用于磁性材料';
COMMENT ON COLUMN materials.dos_energy_down IS '自旋向下态密度数据，用于磁性材料';

-- 磁性注释
COMMENT ON COLUMN materials.is_magnetic IS '是否具有磁性，True表示材料显示磁性行为';
COMMENT ON COLUMN materials.ordering IS '磁有序类型，如FM(铁磁)、AFM(反铁磁)、FiM(亚铁磁)等';
COMMENT ON COLUMN materials.total_magnetization IS '总磁化强度，单位为μB';
COMMENT ON COLUMN materials.total_magnetization_normalized_vol IS '单位体积的磁化强度，单位为μB/Å³';
COMMENT ON COLUMN materials.total_magnetization_normalized_formula_units IS '单位化学式的磁化强度，单位为μB/f.u.';
COMMENT ON COLUMN materials.num_magnetic_sites IS '磁性位点总数，包含所有磁性原子的位置数';
COMMENT ON COLUMN materials.num_unique_magnetic_sites IS '独特磁性位点数量，考虑对称性等效的磁性位置数';
COMMENT ON COLUMN materials.types_of_magnetic_species IS '磁性物种类型，如["Fe","Co"]等磁性元素列表';

-- 力学性质注释
COMMENT ON COLUMN materials.bulk_modulus IS '体积模量，包含数值、单位和拟合方法，单位为GPa';
COMMENT ON COLUMN materials.shear_modulus IS '剪切模量，包含数值、单位和拟合方法，单位为GPa';
COMMENT ON COLUMN materials.universal_anisotropy IS '通用各向异性指数，衡量材料弹性各向异性程度';
COMMENT ON COLUMN materials.homogeneous_poisson IS '均匀泊松比，材料在均匀变形下的泊松比';

-- 介电与压电性质注释
COMMENT ON COLUMN materials.e_total IS '总介电张量，包含电子和离子贡献的完整介电常数张量';
COMMENT ON COLUMN materials.e_ionic IS '离子介电张量，晶格振动对介电常数的贡献部分';
COMMENT ON COLUMN materials.e_electronic IS '电子介电张量，电子极化对介电常数的贡献部分';
COMMENT ON COLUMN materials.n IS '折射率，光学性质相关的折射率张量';
COMMENT ON COLUMN materials.e_ij_max IS '最大压电应力系数，压电张量元素的最大值';

-- 表面性质注释
COMMENT ON COLUMN materials.weighted_surface_energy_EV_PER_ANG2 IS '加权表面能，单位为eV/Å²，考虑不同晶面的贡献';
COMMENT ON COLUMN materials.weighted_surface_energy IS '加权表面能，单位为J/m²，考虑不同晶面的贡献';
COMMENT ON COLUMN materials.weighted_work_function IS '加权功函数，单位为eV，考虑不同晶面的贡献';
COMMENT ON COLUMN materials.surface_anisotropy IS '表面各向异性指数，衡量表面能的方向依赖性';
COMMENT ON COLUMN materials.shape_factor IS '形状因子，描述平衡晶体形状的参数';
COMMENT ON COLUMN materials.has_reconstructed IS '是否存在表面重构，True表示表面原子发生了重构';

-- 其他性质注释
COMMENT ON COLUMN materials.xas IS 'X射线吸收谱(XAS)数据，包含近边结构和扩展边结构';
COMMENT ON COLUMN materials.grain_boundaries IS '晶界信息，包含不同类型晶界的结构和能量数据';
COMMENT ON COLUMN materials.database_IDs IS '其他数据库中的ID，如ICSD、COD等外部数据库的标识符';
COMMENT ON COLUMN materials.has_props IS '属性标记，指示该材料具有哪些计算或实验性质';
COMMENT ON COLUMN materials.raw_data IS '完整原始数据备份，保存从源获取的原始JSON数据';
