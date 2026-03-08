import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBlogPosts } from '../../../services/portfolioService';
import './Archive.css';

const Archive = () => {
    const navigate = useNavigate();
    const [postsByYear, setPostsByYear] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAllArchivedPosts = async () => {
            setIsLoading(true);
            try {
                // To display an archive properly, we should Ideally fetch ALL posts from the backend 
                // OR have a specific backend endpoint for archives. 
                // Since this is a lightweight portfolio, we fetch them and group them here.
                // We'll traverse the pagination to get them all (or ask backend for an unpaginated view).
                // For now, we will repeatedly fetch until we get all of them.

                let allResults = [];
                let next = null;

                // First Fetch
                const firstData = await getBlogPosts();
                allResults = [...(firstData.results || [])];
                next = firstData.next || null;

                // Subsequent Fetches
                while (next) {
                    const data = await getBlogPosts(null, null, next);
                    allResults = [...allResults, ...(data.results || [])];
                    next = data.next || null;
                }

                // Group by year
                const grouped = allResults.reduce((acc, post) => {
                    const year = new Date(post.published_date).getFullYear();
                    if (!acc[year]) acc[year] = [];
                    acc[year].push(post);
                    return acc;
                }, {});

                // Sort years in descending order
                const sortedGrouped = Object.keys(grouped).sort((a, b) => b - a).reduce((acc, key) => {
                    acc[key] = grouped[key];
                    return acc;
                }, {});

                setPostsByYear(sortedGrouped);

            } catch (error) {
                console.error("Error al cargar el archivo:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllArchivedPosts();
    }, []);

    if (isLoading) {
        return (
            <div className="archive-container">
                <div className="section-subtitle" style={{ textAlign: 'center', marginTop: '2rem' }}>Recopilando archivos...</div>
            </div>
        );
    }

    return (
        <div className="archive-container">
            <button
                className="back-to-index-btn"
                onClick={() => navigate('/blog')}
            >
                ← Volver al diario
            </button>

            <header className="archive-header">
                <h1 className="archive-title">Archivo Histórico</h1>
                <p className="archive-subtitle">Índice completo de apuntes ordenados cronológicamente.</p>
            </header>

            <div className="archive-content">
                {Object.keys(postsByYear).length === 0 ? (
                    <p className="section-subtitle" style={{ textAlign: 'center' }}>No hay apuntes disponibles.</p>
                ) : (
                    Object.keys(postsByYear).map(year => (
                        <div key={year} className="archive-year-group">
                            <h2 className="archive-year">{year}</h2>
                            <ul className="archive-list">
                                {postsByYear[year].map(post => {
                                    const dateObj = new Date(post.published_date);
                                    const options = { month: 'long', day: 'numeric' };
                                    const formattedDate = dateObj.toLocaleDateString('es-ES', options);

                                    return (
                                        <li key={post.id} className="archive-item">
                                            <span className="archive-date">{formattedDate}</span>
                                            <span
                                                className="archive-post-title"
                                                onClick={() => navigate(`/blog/${post.slug}`)}
                                            >
                                                {post.title}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))
                )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '4rem', marginBottom: '2rem' }}>
                <button
                    className="back-to-index-btn"
                    onClick={() => navigate('/blog')}
                >
                    ← Volver al diario
                </button>
            </div>
        </div>
    );
};

export default Archive;
