import React from 'react';

const COLOR_MAP: { [key: number]: string } = {
  0: '#000000', // Black
  1: '#0074D9', // Blue
  2: '#FF4136', // Red
  3: '#2ECC40', // Green
  4: '#FFDC00', // Yellow
  5: '#AAAAAA', // Gray
  6: '#F012BE', // Magenta
  7: '#FF851B', // Orange
  8: '#7FDBFF', // Teal
  9: '#871B1B', // Maroon
};

interface MatrixVisualizationProps {
  data: number[][];
  componentMap?: number[][];
}

const MatrixVisualization: React.FC<MatrixVisualizationProps> = ({ data, componentMap }) => {
  if (!data || !Array.isArray(data) || data.length === 0 || !Array.isArray(data[0])) {
    return <div style={{ color: '#ff4136', fontSize: '0.8rem' }}>Invalid Matrix</div>;
  }

  const rows = data.length;
  const cols = data[0].length;

  // Adaptive cell size based on matrix dimensions to avoid huge grids
  const cellSize = rows > 20 || cols > 20 ? 10 : 20;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '4px', alignSelf: 'flex-end', fontFamily: 'monospace' }}>
        ({rows}x{cols})
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gap: '1px',
          backgroundColor: '#444', // This creates the grid lines
          border: '1px solid #444',
          padding: '0',
          lineHeight: 0,
        }}
      >
        {data.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            let borderStyle = {};

            // Draw a solid white border on adjacent boundaries of different components
            if (componentMap && componentMap[rowIndex] && componentMap[rowIndex][colIndex] !== undefined) {
              const currentComp = componentMap[rowIndex][colIndex];

              if (currentComp !== 0) {
                // Top border
                const topComp = rowIndex > 0 ? componentMap[rowIndex - 1][colIndex] : 0;
                // Bottom border
                const bottomComp = rowIndex < rows - 1 ? componentMap[rowIndex + 1][colIndex] : 0;
                // Left border
                const leftComp = colIndex > 0 ? componentMap[rowIndex][colIndex - 1] : 0;
                // Right border
                const rightComp = colIndex < cols - 1 ? componentMap[rowIndex][colIndex + 1] : 0;

                borderStyle = {
                  borderTop: currentComp !== topComp ? '1px solid #ffffff' : undefined,
                  borderBottom: currentComp !== bottomComp ? '1px solid #ffffff' : undefined,
                  borderLeft: currentComp !== leftComp ? '1px solid #ffffff' : undefined,
                  borderRight: currentComp !== rightComp ? '1px solid #ffffff' : undefined,
                  boxSizing: 'border-box'
                };
              }
            }

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  backgroundColor: COLOR_MAP[cell] ?? '#000000',
                  ...borderStyle
                }}
                title={`(${rowIndex}, ${colIndex}): ${cell}${componentMap ? ` (Comp: ${componentMap[rowIndex][colIndex]})` : ''}`}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default MatrixVisualization;
