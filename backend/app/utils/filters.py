"""
Filter builder for material search queries.
Converts search parameters to SQLAlchemy where clauses.
"""

from sqlalchemy import and_, cast, Integer, Text
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from app.models.material import Material
from app.utils.constants import RARE_EARTH_ELEMENTS, LIGHT_RE, HEAVY_RE


class FilterBuilder:
    """动态构建查询过滤条件"""

    def __init__(self):
        self.conditions = []

    def add_formula(self, formula: str | None):
        """精确匹配化学式"""
        if formula:
            self.conditions.append(Material.formula_pretty == formula)

    def add_elements_include(self, elements: str | None):
        """包含指定元素（AND 逻辑：必须全部包含）"""
        if elements:
            element_list = [e.strip() for e in elements.split(",")]
            # 使用 PostgreSQL @> 操作符（数组包含）
            # 数据库数组列是 TEXT[]，必须用 ARRAY(Text) 不能用 ARRAY(String)
            self.conditions.append(
                Material.elements.op("@>")(cast(element_list, PG_ARRAY(Text)))
            )

    def add_elements_exclude(self, elements: str | None):
        """排除含有指定元素的材料"""
        if elements:
            element_list = [e.strip() for e in elements.split(",")]
            # 使用 && 操作符（数组重叠）的否定
            # 数据库数组列是 TEXT[]，必须用 ARRAY(Text) 不能用 ARRAY(String)
            self.conditions.append(
                ~Material.elements.op("&&")(cast(element_list, PG_ARRAY(Text)))
            )

    def add_chemsys(self, chemsys: str | None):
        """化学体系匹配"""
        if chemsys:
            self.conditions.append(Material.chemsys == chemsys)

    def add_range(self, field_name: str, min_val: float | None, max_val: float | None):
        """范围查询（通用）"""
        column = getattr(Material, field_name, None)
        if column is None:
            return
        if min_val is not None:
            self.conditions.append(column >= min_val)
        if max_val is not None:
            self.conditions.append(column <= max_val)

    def add_int_range(self, field_name: str, min_val: int | None, max_val: int | None):
        """整数范围查询"""
        column = getattr(Material, field_name, None)
        if column is None:
            return
        if min_val is not None:
            self.conditions.append(column >= min_val)
        if max_val is not None:
            self.conditions.append(column <= max_val)

    def add_boolean(self, field_name: str, value: bool | None):
        """布尔过滤"""
        if value is not None:
            column = getattr(Material, field_name, None)
            if column is not None:
                self.conditions.append(column == value)

    def add_exact(self, field_name: str, value: str | None):
        """精确匹配"""
        if value is not None:
            column = getattr(Material, field_name, None)
            if column is not None:
                self.conditions.append(column == value)

    def add_crystal_system(self, crystal_system: str | None):
        """过滤晶系（从 symmetry JSONB 中提取）"""
        if crystal_system and hasattr(Material, 'symmetry'):
            # 使用 JSONB 字段的 ->> 操作符提取文本值，不区分大小写
            self.conditions.append(
                Material.symmetry['crystal_system'].astext.ilike(crystal_system)
            )

    def add_space_group_number(self, space_group_number: int | None):
        """过滤空间群号（从 symmetry JSONB 中提取）"""
        if space_group_number is not None and hasattr(Material, 'symmetry'):
            # 使用 JSONB 字段的 ->> 操作符提取文本值并转换为整数
            self.conditions.append(
                cast(Material.symmetry['number'].astext, Integer) == space_group_number
            )

    def add_rare_earth_filter(self, contains_rare_earth: bool | None, rare_earth_type: str | None):
        """稀土元素过滤"""
        if contains_rare_earth is True:
            # 包含任意稀土元素
            self.conditions.append(
                Material.elements.op("&&")(cast(RARE_EARTH_ELEMENTS, PG_ARRAY(Text)))
            )
        elif contains_rare_earth is False:
            # 不含任何稀土元素
            self.conditions.append(
                ~Material.elements.op("&&")(cast(RARE_EARTH_ELEMENTS, PG_ARRAY(Text)))
            )

        if rare_earth_type == "light":
            self.conditions.append(
                Material.elements.op("&&")(cast(LIGHT_RE, PG_ARRAY(Text)))
            )
        elif rare_earth_type == "heavy":
            self.conditions.append(
                Material.elements.op("&&")(cast(HEAVY_RE, PG_ARRAY(Text)))
            )

    def build(self):
        """返回组合后的条件"""
        if not self.conditions:
            return None
        return and_(*self.conditions)