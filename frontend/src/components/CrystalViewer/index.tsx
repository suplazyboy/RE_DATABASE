import React, { useEffect, useRef, useState } from 'react';
import { Switch, Space, Divider } from 'antd';

declare global {
  interface Window {
    $3Dmol: any;
  }
}

interface CrystalViewerProps {
  cif?: string | null;
  width?: string;
  height?: string;
  backgroundColor?: string;
  style?: React.CSSProperties;
}

const CrystalViewer: React.FC<CrystalViewerProps> = ({
  cif,
  width = '100%',
  height = '400px',
  backgroundColor = 'white',
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [sphereOnly, setSphereOnly] = useState(false);

  useEffect(() => {
    if (typeof window.$3Dmol === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://3dmol.org/build/3Dmol-min.js';
      script.async = true;
      script.onload = () => {
        if (cif && containerRef.current) {
          renderCrystal();
        }
      };
      document.head.appendChild(script);
    } else if (cif && containerRef.current) {
      renderCrystal();
    }

    function renderCrystal() {
      if (!containerRef.current || !cif) return;

      if (viewerRef.current) {
        containerRef.current.innerHTML = '';
      }

      const viewer = window.$3Dmol.createViewer(containerRef.current, {
        backgroundColor,
      });
      viewerRef.current = viewer;

      try {
        const model = viewer.addModel(cif, 'cif');
        model.setStyle({}, sphereOnly
          ? { sphere: { scale: 0.5 } }
          : { sphere: { scale: 0.3 }, stick: { radius: 0.12 } }
        );
        viewer.addUnitCell(model, {
          box: { color: '#888888', linewidth: 1.5 },
          astyle: { hidden: true },
          bstyle: { hidden: true },
          cstyle: { hidden: true },
        });

        if (showLabels) {
          const atoms = model.selectedAtoms({});
          atoms.forEach((atom: any) => {
            viewer.addLabel(atom.elem, {
              position: { x: atom.x, y: atom.y, z: atom.z },
              backgroundColor: 'rgba(255,255,255,0.75)',
              fontColor: '#222222',
              fontSize: 11,
              borderThickness: 0,
              inFront: true,
            });
          });
        }

        viewer.zoomTo();
        viewer.render();
      } catch (error) {
        console.error('Failed to parse CIF:', error);
        containerRef.current.innerHTML = '<p style="color: red; padding: 20px; text-align: center;">Failed to load crystal structure. Invalid CIF data.</p>';
      }
    }

    return () => {
      if (viewerRef.current && containerRef.current) {
        containerRef.current.innerHTML = '';
        viewerRef.current = null;
      }
    };
  }, [cif, backgroundColor, showLabels, sphereOnly]);

  if (!cif) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        No CIF data available for this material.
      </div>
    );
  }

  return (
    <div style={{ width }}>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        <Space>
          <Switch
            size="small"
            checked={showLabels}
            onChange={setShowLabels}
            id="crystal-labels-toggle"
          />
          <label htmlFor="crystal-labels-toggle" style={{ cursor: 'pointer', fontSize: 13, color: '#555' }}>
            显示原子标签
          </label>
        </Space>
        <Divider type="vertical" />
        <Space>
          <Switch
            size="small"
            checked={sphereOnly}
            onChange={setSphereOnly}
            id="crystal-sphere-toggle"
          />
          <label htmlFor="crystal-sphere-toggle" style={{ cursor: 'pointer', fontSize: 13, color: '#555' }}>
            空间填充模型
          </label>
        </Space>
      </div>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height,
          position: 'relative',
          border: '1px solid #d9d9d9',
          borderRadius: '8px',
          overflow: 'hidden',
          ...style,
        }}
      />
    </div>
  );
};

export default CrystalViewer;