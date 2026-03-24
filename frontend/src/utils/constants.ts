// 常量定义

// 化学元素符号列表
export const ELEMENT_SYMBOLS = [
  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
  'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
  'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
  'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr',
  'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn',
  'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd',
  'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb',
  'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
  'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th',
  'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm',
  'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds',
  'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'
];

// 晶体系统列表
export const CRYSTAL_SYSTEMS = [
  'triclinic',
  'monoclinic',
  'orthorhombic',
  'tetragonal',
  'trigonal',
  'hexagonal',
  'cubic'
];

// 空间群符号列表（部分）
export const SPACE_GROUP_SYMBOLS = [
  'P1', 'P-1', 'P2', 'P21', 'C2', 'Pm', 'Pc', 'Cm', 'Cc', 'P2/m',
  'P21/m', 'C2/m', 'P2/c', 'P21/c', 'C2/c', 'P222', 'P2221', 'P21212',
  'P212121', 'C2221', 'C222', 'F222', 'I222', 'I212121', 'Pmm2', 'Pmc21',
  'Pcc2', 'Pma2', 'Pca21', 'Pnc2', 'Pmn21', 'Pba2', 'Pna21', 'Pnn2',
  'Cmm2', 'Cmc21', 'Ccc2', 'Amm2', 'Aem2', 'Ama2', 'Aea2', 'Fmm2',
  'Fdd2', 'Imm2', 'Iba2', 'Ima2', 'Pmmm', 'Pnnn', 'Pccm', 'Pban',
  'Pmma', 'Pnna', 'Pmna', 'Pcca', 'Pbam', 'Pccn', 'Pbcm', 'Pnnm',
  'Pmmn', 'Pbcn', 'Pbca', 'Pnma', 'Cmcm', 'Cmce', 'Cmmm', 'Cccm',
  'Cmme', 'Ccce', 'Fmmm', 'Fddd', 'Immm', 'Ibam', 'Ibca', 'Imma'
];

// 分页每页选项
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// 默认分页大小
export const DEFAULT_PAGE_SIZE = 20;

// 稀土元素定义
export const RARE_EARTH_ELEMENTS = [
  'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd',
  'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu',  // 镧系 15 种
  'Sc', 'Y',                                     // 另外 2 种
];

export const RARE_EARTH_NAMES: Record<string, string> = {
  La: '镧', Ce: '铈', Pr: '镨', Nd: '钕', Pm: '钷', Sm: '钐', Eu: '铕',
  Gd: '钆', Tb: '铽', Dy: '镝', Ho: '钬', Er: '铒', Tm: '铥', Yb: '镱',
  Lu: '镥', Sc: '钪', Y: '钇',
};

// 轻/重稀土分组
export const LIGHT_RE = ['La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu'];
export const HEAVY_RE = ['Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Sc', 'Y'];