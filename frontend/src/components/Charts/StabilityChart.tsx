import React from 'react';
import ReactECharts from 'echarts-for-react';

export interface StabilityChartData {
  bucket: number;
  count: number;
  range_min: number;
  range_max: number;
}

interface StabilityChartProps {
  data: StabilityChartData[];
  loading?: boolean;
}

const StabilityChart: React.FC<StabilityChartProps> = ({ data, loading }) => {
  const option = {
    title: {
      text: 'Energy Above Hull Distribution',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = params as Array<{ data: { range_min?: number; range_max?: number; count: number } }>;
        if (!p || !p[0] || !p[0].data) return '';
        const d = p[0].data;
        return `${d.range_min?.toFixed(3)} - ${d.range_max?.toFixed(3)} eV<br/>Count: ${d.count}`;
      },
    },
    xAxis: {
      type: 'category',
      name: 'Energy Above Hull (eV)',
      nameLocation: 'middle',
      nameGap: 30,
      data: data.map(d => d.range_min?.toFixed(2)),
      axisLabel: {
        rotate: 45,
        fontSize: 12
      },
    },
    yAxis: {
      type: 'value',
      name: 'Count',
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: {
        fontSize: 12
      }
    },
    series: [{
      type: 'bar',
      data: data.map(d => ({ value: d.count, ...d })),
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#52c41a' },
            { offset: 1, color: '#95de64' },
          ],
        },
      },
    }],
    grid: {
      left: 60,
      right: 40,
      bottom: 80,
      top: 60
    },
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 400, width: '100%' }}
      showLoading={loading}
      opts={{ renderer: 'canvas' }}
    />
  );
};

export default StabilityChart;