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
}

const MatrixVisualization: React.FC<MatrixVisualizationProps> = ({ data }) => {
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
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                backgroundColor: COLOR_MAP[cell] ?? '#000000',
              }}
              title={`(${rowIndex}, ${colIndex}): ${cell}`}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MatrixVisualization;
