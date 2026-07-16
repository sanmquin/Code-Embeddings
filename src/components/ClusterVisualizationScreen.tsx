import React, { useState, useMemo, useEffect } from 'react';
import MatrixVisualization from './MatrixVisualization';

// @ts-ignore
import puzzleClustersRaw from '../../data/puzzle_clusters.csv?raw';
// @ts-ignore
import arcTrainingRaw from '../../data/arc_training.min.json?raw';

interface CSVRow {
  taskId: string;
  cluster: number;
  similarity: number;
  numGrids: number;
}

const parseCSV = (csvText: string): CSVRow[] => {
  const lines = csvText.split('\n');
  const rows: CSVRow[] = [];
  if (lines.length === 0) return rows;

  const headerLine = lines[0].trim();
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());

  const taskIdIdx = headers.indexOf('task_id');
  const clusterIdx = headers.indexOf('puzzle_cluster');
  const similarityIdx = headers.indexOf('puzzle_distance_to_centroid');
  const numGridsIdx = headers.indexOf('num_grids');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');

    const tId = taskIdIdx !== -1 ? parts[taskIdIdx] : parts[0];
    const clusterPart = clusterIdx !== -1 ? parts[clusterIdx] : parts[1];
    const similarityPart = similarityIdx !== -1 ? parts[similarityIdx] : (parts.length > 3 ? parts[2] : '0');
    const numGridsPart = numGridsIdx !== -1 ? parts[numGridsIdx] : (parts.length > 3 ? parts[3] : parts[2]);

    if (tId && clusterPart) {
      const clusterVal = parseInt(clusterPart.trim(), 10);
      const similarityVal = parseFloat(similarityPart?.trim() || '0');
      const numGridsVal = parseInt(numGridsPart?.trim() || '0', 10);

      rows.push({
        taskId: tId.trim(),
        cluster: isNaN(clusterVal) ? -1 : clusterVal,
        similarity: isNaN(similarityVal) ? 0 : similarityVal,
        numGrids: isNaN(numGridsVal) ? 0 : numGridsVal,
      });
    }
  }
  return rows;
};

// Color naming for reference
const COLOR_NAMES: { [key: number]: string } = {
  0: 'Black',
  1: 'Blue',
  2: 'Red',
  3: 'Green',
  4: 'Yellow',
  5: 'Gray',
  6: 'Magenta',
  7: 'Orange',
  8: 'Teal',
  9: 'Maroon',
};

const ClusterVisualizationScreen: React.FC = () => {
  const [selectedCluster, setSelectedCluster] = useState<number>(0);
  const [loadedCount, setLoadedCount] = useState<number>(10);

  // Parse CSV and JSON data once
  const clusterRows = useMemo(() => {
    try {
      return parseCSV(puzzleClustersRaw);
    } catch (e) {
      console.error('Failed to parse puzzle_clusters.csv', e);
      return [];
    }
  }, []);

  const arcTrainingData = useMemo(() => {
    try {
      return JSON.parse(arcTrainingRaw);
    } catch (e) {
      console.error('Failed to parse arc_training.min.json', e);
      return {};
    }
  }, []);

  // Dynamically compute unique clusters from the data
  const uniqueClusters = useMemo(() => {
    const clustersSet = new Set<number>();
    clusterRows.forEach(row => {
      if (row.cluster !== -1) {
        clustersSet.add(row.cluster);
      }
    });
    return Array.from(clustersSet).sort((a, b) => a - b);
  }, [clusterRows]);

  // Handle selectedCluster initialization or updates if uniqueClusters list shifts
  useEffect(() => {
    if (uniqueClusters.length > 0 && !uniqueClusters.includes(selectedCluster)) {
      setSelectedCluster(uniqueClusters[0]);
    }
  }, [uniqueClusters, selectedCluster]);

  // Filter tasks belonging to the selected cluster
  const clusterTasks = useMemo(() => {
    return clusterRows.filter((row) => row.cluster === selectedCluster);
  }, [clusterRows, selectedCluster]);

  // Map to only those tasks that actually exist in arc_training.min.json
  const availableClusterTasks = useMemo(() => {
    return clusterTasks.map((row) => {
      const taskJson = arcTrainingData[row.taskId];
      return {
        ...row,
        taskData: taskJson,
      };
    }).filter(t => !!t.taskData);
  }, [clusterTasks, arcTrainingData]);

  // Compute cluster statistics for researcher analysis
  const clusterStats = useMemo(() => {
    if (availableClusterTasks.length === 0) return null;

    let totalGridsSum = 0;
    const colorCounts: Record<number, number> = {};
    const sizeChanges = { same: 0, different: 0 };
    const gridSizes: Record<string, number> = {};

    availableClusterTasks.forEach((task) => {
      totalGridsSum += task.numGrids;

      // Check all train cases
      const trainCases = task.taskData?.train || [];
      trainCases.forEach((tc: any) => {
        const inRows = tc.input?.length || 0;
        const inCols = tc.input?.[0]?.length || 0;
        const outRows = tc.output?.length || 0;
        const outCols = tc.output?.[0]?.length || 0;

        // Size check
        if (inRows === outRows && inCols === outCols) {
          sizeChanges.same++;
        } else {
          sizeChanges.different++;
        }

        // Grid size logging
        const inSizeStr = `${inRows}x${inCols}`;
        gridSizes[inSizeStr] = (gridSizes[inSizeStr] || 0) + 1;

        // Color counting in inputs
        if (Array.isArray(tc.input)) {
          tc.input.forEach((row: any) => {
            if (Array.isArray(row)) {
              row.forEach((cell: number) => {
                colorCounts[cell] = (colorCounts[cell] || 0) + 1;
              });
            }
          });
        }
      });
    });

    // Sort sizes
    const sortedSizes = Object.entries(gridSizes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([size]) => size);

    // Sort colors (excluding black/0 as background often skews the statistics)
    const sortedColors = Object.entries(colorCounts)
      .filter(([color]) => color !== '0')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([color]) => COLOR_NAMES[parseInt(color, 10)] || `Color ${color}`);

    const sameSizePct = Math.round((sizeChanges.same / (sizeChanges.same + sizeChanges.different || 1)) * 100);

    return {
      averageGrids: Math.round((totalGridsSum / availableClusterTasks.length) * 10) / 10,
      commonSizes: sortedSizes.join(', ') || 'N/A',
      dominantColors: sortedColors.join(', ') || 'N/A',
      sameSizePercentage: sameSizePct,
    };
  }, [availableClusterTasks]);

  // Slice list of tasks to load based on loadedCount
  const visibleTasks = useMemo(() => {
    return availableClusterTasks.slice(0, loadedCount);
  }, [availableClusterTasks, loadedCount]);

  const handleClusterSelect = (clusterNum: number) => {
    setSelectedCluster(clusterNum);
    setLoadedCount(10); // Reset load limit on cluster switch
  };

  const loadMore = () => {
    setLoadedCount((prev) => prev + 10);
  };

  return (
    <div className="cluster-visualization" style={{ padding: '20px', color: '#e0e0e0' }}>
      <h2>Cluster Visualization Dashboard</h2>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>
        Analyze the structural similarities and shared transformation characteristics of ARC puzzles grouped into clusters. Use this tool to isolate the visual invariants that define each category.
      </p>

      {/* Cluster selector bar */}
      <div style={{ marginBottom: '25px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#bbb', marginBottom: '10px' }}>Select Cluster:</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {uniqueClusters.map((clusterId) => {
            const countInCsv = clusterRows.filter(r => r.cluster === clusterId).length;
            const countInJson = clusterRows.filter(r => r.cluster === clusterId && arcTrainingData[r.taskId]).length;
            const isSelected = selectedCluster === clusterId;

            return (
              <button
                key={`cluster-btn-${clusterId}`}
                onClick={() => handleClusterSelect(clusterId)}
                style={{
                  padding: '10px 14px',
                  backgroundColor: isSelected ? '#0074D9' : '#1e1e1e',
                  border: isSelected ? '1px solid #0074D9' : '1px solid #333',
                  borderRadius: '4px',
                  color: isSelected ? '#fff' : '#ccc',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  minWidth: '110px',
                }}
              >
                <div style={{ fontSize: '0.95rem' }}>Cluster {clusterId}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
                  {countInCsv > 0 ? `${countInJson} / ${countInCsv} parsed` : '0 puzzles'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cluster statistics panel */}
      {clusterStats && (
        <div
          style={{
            backgroundColor: '#161616',
            border: '1px solid #333',
            borderRadius: '6px',
            padding: '20px',
            marginBottom: '30px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase' }}>Cluster Size</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffdc00', marginTop: '5px' }}>
              {availableClusterTasks.length} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#888' }}>puzzles parsed</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase' }}>Average Grid Count</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2ECC40', marginTop: '5px' }}>
              {clusterStats.averageGrids} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#888' }}>grids/task</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase' }}>Dominant Colors</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0074D9', marginTop: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {clusterStats.dominantColors}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase' }}>Same Dimension Ratio</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F012BE', marginTop: '5px' }}>
              {clusterStats.sameSizePercentage}% <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#888' }}>retain size</span>
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #222', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
              <strong>Common Grid Dimensions:</strong> {clusterStats.commonSizes}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#777' }}>
              Showing {Math.min(loadedCount, availableClusterTasks.length)} of {availableClusterTasks.length} puzzles
            </div>
          </div>
        </div>
      )}

      {/* Puzzles List */}
      {availableClusterTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#1e1e1e', borderRadius: '6px', border: '1px solid #333' }}>
          <p style={{ fontSize: '1.1rem', color: '#aaa' }}>No parsed puzzles found for Cluster {selectedCluster}.</p>
          <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>This cluster might be empty or the puzzles are not included in the dataset.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {visibleTasks.map((task) => (
            <div
              key={task.taskId}
              style={{
                backgroundColor: '#1e1e1e',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              {/* Task ID and Title/Metadata header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2a2a', paddingBottom: '12px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ margin: 0, color: '#ffdc00', fontSize: '1.25rem', fontFamily: 'monospace' }}>
                    Task: {task.taskId}
                  </h3>
                  <span style={{ backgroundColor: '#2a2a2a', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                    {task.numGrids} total grids
                  </span>
                  {task.similarity !== undefined && (
                    <span style={{ backgroundColor: '#2a2a2a', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                      Distance to Centroid (Similarity): {task.similarity.toFixed(4)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#888' }}>
                  Train Examples: {task.taskData?.train?.length || 0} | Test Examples: {task.taskData?.test?.length || 0}
                </div>
              </div>

              {/* Grid pairs showcase */}
              <div
                style={{
                  display: 'flex',
                  gap: '20px',
                  overflowX: 'auto',
                  paddingBottom: '10px',
                  scrollSnapType: 'x mandatory',
                }}
              >
                {/* Train examples mapping */}
                {task.taskData?.train?.map((tc: any, idx: number) => (
                  <div
                    key={`pair-${idx}`}
                    style={{
                      flex: '0 0 auto',
                      backgroundColor: '#161616',
                      border: '1px solid #2a2a2a',
                      borderRadius: '6px',
                      padding: '15px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '15px',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2196F3', borderBottom: '1px solid #222', paddingBottom: '5px' }}>
                      Train Example #{idx + 1}
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px' }}>INPUT</div>
                        <MatrixVisualization data={tc.input} />
                      </div>
                      <div style={{ color: '#444', fontSize: '1.5rem', fontWeight: 'bold' }}>→</div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px' }}>OUTPUT</div>
                        <MatrixVisualization data={tc.output} />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Test examples mapping */}
                {task.taskData?.test?.map((tc: any, idx: number) => (
                  <div
                    key={`test-pair-${idx}`}
                    style={{
                      flex: '0 0 auto',
                      backgroundColor: '#161616',
                      border: '1px solid #ff851b', // orange border for test examples
                      borderRadius: '6px',
                      padding: '15px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '15px',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ff851b', borderBottom: '1px solid #222', paddingBottom: '5px' }}>
                      Test Example #{idx + 1}
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px' }}>INPUT</div>
                        <MatrixVisualization data={tc.input} />
                      </div>
                      {tc.output && (
                        <>
                          <div style={{ color: '#444', fontSize: '1.5rem', fontWeight: 'bold' }}>→</div>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px' }}>OUTPUT</div>
                            <MatrixVisualization data={tc.output} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {loadedCount < availableClusterTasks.length && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', marginBottom: '20px' }}>
              <button
                onClick={loadMore}
                style={{
                  padding: '12px 30px',
                  backgroundColor: '#2ecc40',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#27ae3f')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2ecc40')}
              >
                Load More ({availableClusterTasks.length - loadedCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClusterVisualizationScreen;
