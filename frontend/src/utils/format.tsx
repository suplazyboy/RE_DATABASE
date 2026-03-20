// 数值格式化工具
import React from 'react';

/**
 * 格式化能带间隙值
 */
export function formatBandGap(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(3)} eV`;
}

/**
 * 格式化体积值
 */
export function formatVolume(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(2)} Å³`;
}

/**
 * 格式化密度值
 */
export function formatDensity(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(2)} g/cm³`;
}

/**
 * 格式化能量值
 */
export function formatEnergy(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(4)} eV/atom`;
}

/**
 * 格式化浮点数，保留指定位小数
 */
export function formatFloat(value: number | null | undefined, decimals = 3): string {
  if (value === null || value === undefined) return '-';
  return value.toFixed(decimals);
}

/**
 * 格式化布尔值
 */
export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value ? 'Yes' : 'No';
}

/**
 * 化学式格式化（下标数字）—— 返回 React 元素
 */
export function formatFormula(formula: string | null): React.ReactNode {
  if (!formula) return '-';
  // 将数字包裹在 <sub> 标签中
  return formula.split(/(\d+)/).map((part, i) =>
    /^\d+$/.test(part) ? <sub key={i}>{part}</sub> : part
  );
}