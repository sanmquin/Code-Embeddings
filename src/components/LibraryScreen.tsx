import React, { useState, useEffect } from 'react';

interface Example {
  name: string;
  description: string;
}

interface Cluster {
  title: string;
  description: string;
  examples: Example[];
}

const LibraryScreen: React.FC = () => {
  const [readme, setReadme] = useState<string>('');
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClustering, setIsClustering] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReadme = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('https://raw.githubusercontent.com/sanmquin/Matrix/main/library/README.md');
        if (!response.ok) {
          throw new Error('Failed to fetch library README');
        }
        const text = await response.text();
        setReadme(text);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReadme();
  }, []);

  const handleCluster = async () => {
    setIsClustering(true);
    setError(null);
    setPublishUrl(null);
    try {
      const response = await fetch('/.netlify/functions/cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readme }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cluster functions');
      }

      const data = await response.json();
      setClusters(data.clusters);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClustering(false);
    }
  };

  const handlePublishClusters = async () => {
    if (clusters.length === 0) return;
    setIsPublishing(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/publish_clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusters }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish clusters');
      }

      const data = await response.json();
      setPublishUrl(data.prUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="library-screen">
      <h2>Matrix Function Library</h2>
      <p>A collection of modular functions for solving ARC puzzles, extracted from refactored solutions.</p>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="library-actions">
        <button
          onClick={handleCluster}
          disabled={!readme || isClustering}
          className={isClustering ? 'loading' : ''}
        >
          {isClustering ? 'Clustering...' : 'Cluster Functions (AI)'}
        </button>

        {clusters.length > 0 && (
          <button
            onClick={handlePublishClusters}
            disabled={isPublishing}
            className={isPublishing ? 'loading' : ''}
          >
            {isPublishing ? 'Publishing...' : 'Publish Clusters to GitHub'}
          </button>
        )}
      </div>

      {publishUrl && (
        <div className="success-message" style={{ marginBottom: '1rem' }}>
          Clusters published! View Pull Request: <a href={publishUrl} target="_blank" rel="noopener noreferrer">{publishUrl}</a>
        </div>
      )}

      <div className="library-content">
        {clusters.length > 0 ? (
          <div className="clusters-container">
            {clusters.map((cluster, idx) => (
              <div key={idx} className="cluster-card">
                <h3>{cluster.title}</h3>
                <p className="cluster-description">{cluster.description}</p>
                <div className="cluster-examples">
                  <h4>Examples:</h4>
                  <ul>
                    {cluster.examples.map((ex, eIdx) => (
                      <li key={eIdx}>
                        <strong>{ex.name}</strong>: {ex.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="readme-viewer">
            {isLoading ? (
              <p>Loading library documentation...</p>
            ) : (
              <pre className="readme-pre">{readme}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryScreen;
