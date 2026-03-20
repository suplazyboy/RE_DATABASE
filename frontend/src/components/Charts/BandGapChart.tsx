import React from 'react';
import ReactECharts from 'echarts-for-react';

export interface BandGapChartData {
  bucket: number;
  count: number;
  range_min: number;
  range_max: number;
}

interface BandGapChartProps {
  data: BandGapChartData[];
  loading?: boolean;
}

const BandGapChart: React.FC<BandGapChartProps> = ({ data, loading }) => {
  const option = {
    title: {
      text: 'Band Gap Distribution',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        // ECharts tooltip params type
        const p = params as Array<{ data: { range_min?: number; range_max?: number; count: number } }>;
        if (!p || !p[0] || !p[0].data) return '';
        const d = p[0].data;
        return `${d.range_min?.toFixed(2)} - ${d.range_max?.toFixed(2)} eV<br/>Count: ${d.count}`;
      },
    },
    xAxis: {
      type: 'category',
      name: 'Band Gap (eV)',
      nameLocation: 'middle',
      nameGap: 30,
      data: data.map(d => d.range_min?.toFixed(1)),
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
            { offset: 0, color: '#1677ff' },
            { offset: 1, color: '#69b1ff' },
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

export default BandGapChart;