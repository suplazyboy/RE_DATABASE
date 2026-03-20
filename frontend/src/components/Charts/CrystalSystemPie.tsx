import React from 'react';
import ReactECharts from 'echarts-for-react';

export interface CrystalSystemData {
  crystal_system: string;
  count: number;
}

interface CrystalSystemPieProps {
  data: CrystalSystemData[];
  loading?: boolean;
}

const CrystalSystemPie: React.FC<CrystalSystemPieProps> = ({ data, loading }) => {
  const option = {
    title: {
      text: 'Crystal System Distribution',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: {
        fontSize: 12
      }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      data: data.map(d => ({
        name: d.crystal_system,
        value: d.count
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      },
      label: {
        formatter: '{b}\n{d}%',
        fontSize: 12
      },
      labelLine: {
        length: 10,
        length2: 10
      }
    }]
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

export default CrystalSystemPie;