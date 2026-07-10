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
  type TabType = 'functions' | 'solutions';
  const [activeTab, setActiveTab] = useState<TabType>('functions');

  // Functions tab state
  const [readmeFunctions, setReadmeFunctions] = useState<string>('');
  const [clustersFunctions, setClustersFunctions] = useState<Cluster[]>([]);
  const [isLoadingFunctions, setIsLoadingFunctions] = useState<boolean>(false);
  const [isClusteringFunctions, setIsClusteringFunctions] = useState<boolean>(false);
  const [isPublishingFunctions, setIsPublishingFunctions] = useState<boolean>(false);
  const [publishUrlFunctions, setPublishUrlFunctions] = useState<string | null>(null);
  const [errorFunctions, setErrorFunctions] = useState<string | null>(null);

  // Solutions tab state
  const [readmeSolutions, setReadmeSolutions] = useState<string>('');
  const [clustersSolutions, setClustersSolutions] = useState<Cluster[]>([]);
  const [isLoadingSolutions, setIsLoadingSolutions] = useState<boolean>(false);
  const [isClusteringSolutions, setIsClusteringSolutions] = useState<boolean>(false);
  const [isPublishingSolutions, setIsPublishingSolutions] = useState<boolean>(false);
  const [publishUrlSolutions, setPublishUrlSolutions] = useState<string | null>(null);
  const [errorSolutions, setErrorSolutions] = useState<string | null>(null);

  // Fetch functions README
  useEffect(() => {
    const fetchFunctionsReadme = async () => {
      setIsLoadingFunctions(true);
      setErrorFunctions(null);
      try {
        const response = await fetch('https://raw.githubusercontent.com/sanmquin/Matrix/main/library/README.md');
        if (!response.ok) {
          throw new Error('Failed to fetch library README');
        }
        const text = await response.text();
        setReadmeFunctions(text);
      } catch (err: any) {
        setErrorFunctions(err.message);
      } finally {
        setIsLoadingFunctions(false);
      }
    };

    fetchFunctionsReadme();
  }, []);

  // Fetch solutions README
  useEffect(() => {
    const fetchSolutionsReadme = async () => {
      setIsLoadingSolutions(true);
      setErrorSolutions(null);
      try {
        const response = await fetch('https://raw.githubusercontent.com/sanmquin/Matrix/main/solutions/README.md');
        if (!response.ok) {
          throw new Error('Failed to fetch solutions README');
        }
        const text = await response.text();
        setReadmeSolutions(text);
      } catch (err: any) {
        setErrorSolutions(err.message);
      } finally {
        setIsLoadingSolutions(false);
      }
    };

    fetchSolutionsReadme();
  }, []);

  const handleCluster = async () => {
    if (activeTab === 'functions') {
      setIsClusteringFunctions(true);
      setErrorFunctions(null);
      setPublishUrlFunctions(null);
      try {
        const response = await fetch('/.netlify/functions/cluster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ readme: readmeFunctions, type: 'functions' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to cluster functions');
        }

        const data = await response.json();
        setClustersFunctions(data.clusters);
      } catch (err: any) {
        setErrorFunctions(err.message);
      } finally {
        setIsClusteringFunctions(false);
      }
    } else {
      setIsClusteringSolutions(true);
      setErrorSolutions(null);
      setPublishUrlSolutions(null);
      try {
        const response = await fetch('/.netlify/functions/cluster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ readme: readmeSolutions, type: 'solutions' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to cluster solutions');
        }

        const data = await response.json();
        setClustersSolutions(data.clusters);
      } catch (err: any) {
        setErrorSolutions(err.message);
      } finally {
        setIsClusteringSolutions(false);
      }
    }
  };

  const handlePublishClusters = async () => {
    if (activeTab === 'functions') {
      if (clustersFunctions.length === 0) return;
      setIsPublishingFunctions(true);
      setErrorFunctions(null);
      try {
        const response = await fetch('/.netlify/functions/publish_clusters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clusters: clustersFunctions, type: 'functions' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to publish function clusters');
        }

        const data = await response.json();
        setPublishUrlFunctions(data.prUrl);
      } catch (err: any) {
        setErrorFunctions(err.message);
      } finally {
        setIsPublishingFunctions(false);
      }
    } else {
      if (clustersSolutions.length === 0) return;
      setIsPublishingSolutions(true);
      setErrorSolutions(null);
      try {
        const response = await fetch('/.netlify/functions/publish_clusters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clusters: clustersSolutions, type: 'solutions' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to publish solution clusters');
        }

        const data = await response.json();
        setPublishUrlSolutions(data.prUrl);
      } catch (err: any) {
        setErrorSolutions(err.message);
      } finally {
        setIsPublishingSolutions(false);
      }
    }
  };

  // Derive current state based on active tab
  const currentReadme = activeTab === 'functions' ? readmeFunctions : readmeSolutions;
  const currentClusters = activeTab === 'functions' ? clustersFunctions : clustersSolutions;
  const currentIsLoading = activeTab === 'functions' ? isLoadingFunctions : isLoadingSolutions;
  const currentIsClustering = activeTab === 'functions' ? isClusteringFunctions : isClusteringSolutions;
  const currentIsPublishing = activeTab === 'functions' ? isPublishingFunctions : isPublishingSolutions;
  const currentPublishUrl = activeTab === 'functions' ? publishUrlFunctions : publishUrlSolutions;
  const currentError = activeTab === 'functions' ? errorFunctions : errorSolutions;

  return (
    <div className="library-screen">
      <div className="library-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
        <div>
          <h2>{activeTab === 'functions' ? 'Matrix Function Library' : 'Matrix Puzzle Solutions'}</h2>
          <p style={{ margin: '0.5rem 0 0' }}>
            {activeTab === 'functions'
              ? 'A collection of modular functions for solving ARC puzzles, extracted from refactored solutions.'
              : 'Detailed solution logic for various ARC puzzles and tasks.'}
          </p>
        </div>
        <div className="tab-toggle" style={{ display: 'flex', gap: '0.5rem', background: '#222', padding: '0.25rem', borderRadius: '4px' }}>
          <button
            onClick={() => setActiveTab('functions')}
            className={activeTab === 'functions' ? 'active' : ''}
            style={{ margin: 0, padding: '0.4rem 1rem', fontSize: '0.9rem', border: 'none' }}
          >
            Individual Functions
          </button>
          <button
            onClick={() => setActiveTab('solutions')}
            className={activeTab === 'solutions' ? 'active' : ''}
            style={{ margin: 0, padding: '0.4rem 1rem', fontSize: '0.9rem', border: 'none' }}
          >
            Full Solutions
          </button>
        </div>
      </div>

      {currentError && <div className="error-message" style={{ marginBottom: '1rem' }}>{currentError}</div>}

      <div className="library-actions">
        <button
          onClick={handleCluster}
          disabled={!currentReadme || currentIsClustering}
          className={currentIsClustering ? 'loading' : ''}
        >
          {currentIsClustering
            ? 'Clustering...'
            : activeTab === 'functions'
              ? 'Cluster Functions (AI)'
              : 'Cluster Solutions (AI)'}
        </button>

        {currentClusters.length > 0 && (
          <button
            onClick={handlePublishClusters}
            disabled={currentIsPublishing}
            className={currentIsPublishing ? 'loading' : ''}
          >
            {currentIsPublishing
              ? 'Publishing...'
              : activeTab === 'functions'
                ? 'Publish Clusters to GitHub (CLUSTERS.md)'
                : 'Publish Clusters to GitHub (solutions.md)'}
          </button>
        )}
      </div>

      {currentPublishUrl && (
        <div className="success-message" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#1b3a1b', borderRadius: '4px', border: '1px solid #2ecc40' }}>
          Clusters published! View Pull Request: <a href={currentPublishUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2ecc40', textDecoration: 'underline' }}>{currentPublishUrl}</a>
        </div>
      )}

      <div className="library-content">
        {currentClusters.length > 0 ? (
          <div className="clusters-container">
            {currentClusters.map((cluster, idx) => (
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
            {currentIsLoading ? (
              <p>Loading documentation...</p>
            ) : (
              <pre className="readme-pre">{currentReadme}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryScreen;
