import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import v2SetRaw from '../../data/v2_public_training_set.json.txt?raw';

const v2Set: string[] = JSON.parse(v2SetRaw).sort();

interface PuzzleSelectorProps {
  taskId: string;
  onChangeTaskId: (id: string) => void;
  onSelectTaskId: (id: string) => void;
  savedSolutions?: Record<string, any>;
  documentedPuzzles?: string[];
  failedPuzzles?: Set<string>;
  placeholder?: string;
}

export const PuzzleSelector: React.FC<PuzzleSelectorProps> = ({
  taskId,
  onChangeTaskId,
  onSelectTaskId,
  savedSolutions = {},
  documentedPuzzles = [],
  failedPuzzles = new Set(),
  placeholder = "Enter Task ID (e.g. 00576224)"
}) => {
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const searchTerm = taskId.trim();
  let filteredPuzzles = v2Set;

  if (searchTerm) {
    try {
      const pattern = searchTerm.startsWith('^') ? searchTerm : `^${searchTerm}`;
      const regex = new RegExp(pattern, 'i');
      filteredPuzzles = v2Set.filter(id => regex.test(id));
    } catch (e) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredPuzzles = v2Set.filter(id => id.toLowerCase().startsWith(lowerSearch));
    }
  }

  return (
    <div className="puzzle-selector-container" ref={containerRef} style={{ position: 'relative', width: '250px' }}>
      <input
        type="text"
        value={taskId}
        onChange={(e) => {
          onChangeTaskId(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSelectTaskId(taskId);
            setShowDropdown(false);
          } else if (e.key === 'Escape') {
            setShowDropdown(false);
          }
        }}
        placeholder={placeholder}
        style={{
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #444',
          backgroundColor: '#2a2a2a',
          color: '#fff',
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />

      {showDropdown && (
        <ul className="puzzle-dropdown-list" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '250px',
          overflowY: 'auto',
          backgroundColor: '#1e1e1e',
          border: '1px solid #444',
          borderRadius: '4px',
          marginTop: '4px',
          padding: 0,
          listStyle: 'none',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}>
          {filteredPuzzles.length > 0 ? (
            filteredPuzzles.map((id) => {
              const isSolved = !!savedSolutions[id];
              const isDocumented = documentedPuzzles.includes(id);
              const isFailed = failedPuzzles.has(id);
              return (
                <li
                  key={id}
                  className={`puzzle-dropdown-item ${id === taskId ? 'selected' : ''}`}
                  onClick={() => {
                    onChangeTaskId(id);
                    onSelectTaskId(id);
                    setShowDropdown(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: id === taskId ? '#333' : 'transparent',
                    color: '#fff',
                    fontSize: '0.95rem'
                  }}
                >
                  <span className="puzzle-id-text">{id}</span>
                  <div className="puzzle-status-icons" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isSolved && (
                      <span className="status-icon solved-icon" style={{ color: '#2ecc40', fontWeight: 'bold' }} title="Solved">✓</span>
                    )}
                    {isDocumented && (
                      <span className="status-icon documented-icon" style={{ color: '#0074D9', fontWeight: 'bold' }} title="Documented">✓</span>
                    )}
                    {isFailed && (
                      <span className="status-icon failed-icon" style={{ color: '#ff4136', fontWeight: 'bold' }} title="Failed to load">✗</span>
                    )}
                  </div>
                </li>
              );
            })
          ) : (
            <li className="puzzle-dropdown-no-matches" style={{ padding: '8px 12px', color: '#888', fontStyle: 'italic', fontSize: '0.95rem' }}>No matching puzzles</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default PuzzleSelector;
