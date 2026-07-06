import React, { useEffect, useState } from 'react';

interface Cluster {
  id: string;
  title: string;
  description: string;
  functions: string[];
}

const LibraryScreen: React.FC = () => {
  const [readme, setReadme] = useState<string>('');
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const readmeRes = await fetch('https://raw.githubusercontent.com/sanmquin/Code-Embeddings/refs/heads/main/library/README.md');
        if (readmeRes.ok) {
          setReadme(await readmeRes.text());
        }

        const clustersRes = await fetch('/library_clusters/clusters.json');
        if (clustersRes.ok) {
          const clustersData = await clustersRes.json();
          const clustersWithContent = await Promise.all(clustersData.map(async (c: any) => {
            const contentRes = await fetch(`/library_clusters/${c.id}.md`);
            const content = contentRes.ok ? await contentRes.text() : 'No description available.';
            return { ...c, description: content };
          }));
          setClusters(clustersWithContent);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="library-screen">
      <header>
        <h1>Function Library</h1>
        <p>Explore modular ARC transformation functions and their clusters.</p>
      </header>

      {loading ? (
        <p>Loading library data...</p>
      ) : error ? (
        <p className="error-message">Error: {error}</p>
      ) : (
        <div className="library-content">
          <section className="clusters-section">
            <h2>Function Clusters</h2>
            <div className="clusters-grid">
              {clusters.map(cluster => (
                <div key={cluster.id} className="cluster-card">
                  <h3>{cluster.title}</h3>
                  <div className="cluster-description">
                    {cluster.description.split('\n').map((line, i) => {
                      const cleanLine = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^- /, '');
                      return cleanLine ? <p key={i}>{cleanLine}</p> : null;
                    })}
                  </div>
                  <div className="cluster-functions">
                    <strong>Functions:</strong> {cluster.functions.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="readme-section">
            <h2>Raw Library README</h2>
            <pre className="readme-pre">{readme}</pre>
          </section>
        </div>
      )}
    </div>
  );
};

export default LibraryScreen;
