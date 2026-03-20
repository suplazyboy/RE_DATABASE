import React from 'react';
import ReactECharts from 'echarts-for-react';

export interface ElementFrequencyData {
  element: string;
  frequency: number;
}

interface ElementFrequencyChartProps {
  data: ElementFrequencyData[];
  loading?: boolean;
  topN?: number;
}

const ElementFrequencyChart: React.FC<ElementFrequencyChartProps> = ({
  data,
  loading,
  topN = 20
}) => {
  // 取前 topN 个元素，按计数升序排序（水平柱状图从下到上显示最高到最低）
  const sortedData = [...data]
    .sort((a, b) => a.frequency - b.frequency)
    .slice(-topN);

  const option = {
    title: {
      text: `Most Common Elements (Top ${sortedData.length})`,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: unknown) => {
        const p = params as Array<{ name: string; value: number }>;
        if (!p || !p[0]) return '';
        const d = p[0];
        return `${d.name}<br/>Count: ${d.value}`;
      }
    },
    xAxis: {
      type: 'value',
      name: 'Count',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        fontSize: 12
      }
    },
    yAxis: {
      type: 'category',
      data: sortedData.map(d => d.element),
      axisLabel: {
        fontSize: 12
      }
    },
    series: [{
      type: 'bar',
      data: sortedData.map(d => d.frequency),
      itemStyle: {
        color: '#1677ff'
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        fontSize: 12
      }
    }],
    grid: {
      left: 60,
      right: 100,
      bottom: 40,
      top: 60
    }
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 500, width: '100%' }}
      showLoading={loading}
      opts={{ renderer: 'canvas' }}
    />
  );
};

export default ElementFrequencyChart;