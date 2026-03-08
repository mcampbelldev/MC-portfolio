import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import './Blog.css';
import { getBlogPosts, getTags, getBlogPost } from '../../services/portfolioService';
import ArticleRenderer from './ArticleRenderer';

const Blog = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTagSlug = searchParams.get('tag');
    const urlSearchQuery = searchParams.get('search') || '';

    // Estado para las entradas de blog
    const [posts, setPosts] = useState([]);
    const [tags, setTags] = useState([]);
    const [searchInput, setSearchInput] = useState(urlSearchQuery);
    const [nextUrl, setNextUrl] = useState(null);
    const [activePost, setActivePost] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTagsExpanded, setIsTagsExpanded] = useState(false);

    // Auto-desplegar tags si el tag activo en URL no está en el top 5
    useEffect(() => {
        if (tags.length > 5 && activeTagSlug && !isTagsExpanded) {
            const index = tags.findIndex(t => t.slug === activeTagSlug);
            if (index >= 4) { // Top 4 porque el slice luego mostrará 4 + botón (o similar), dejemos top 5 (índices 0-4)
                setIsTagsExpanded(true);
            }
        }
    }, [tags, activeTagSlug]);

    useEffect(() => {
        const fetchTags = async () => {
            try {
                const data = await getTags();
                setTags(data);
            } catch (error) {
                console.error("Error cargando tags:", error);
            }
        };
        fetchTags();
    }, []);

    useEffect(() => {
        if (slug) return; // Si estamos viendo un apunte, no recargamos la grilla

        const fetchPosts = async () => {
            setIsLoading(true);
            try {
                const data = await getBlogPosts(activeTagSlug, urlSearchQuery);
                setPosts(data.results || []);
                setNextUrl(data.next || null);
            } catch (error) {
                console.error("Error cargando blog posts:", error);
                setPosts([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPosts();
    }, [activeTagSlug, urlSearchQuery, slug]);

    useEffect(() => {
        if (!slug) {
            setActivePost(null);
            return;
        }

        const found = posts.find(p => p.slug === slug);
        if (found) {
            setActivePost(found);
            return;
        }

        const fetchSinglePost = async () => {
            setIsLoading(true);
            try {
                const data = await getBlogPost(slug);
                setActivePost(data && !data.detail ? data : null);
            } catch (error) {
                setActivePost(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSinglePost();
    }, [slug, posts]);

    const handleLoadMore = async () => {
        if (!nextUrl) return;
        try {
            const data = await getBlogPosts(null, nextUrl);
            setPosts(prev => [...prev, ...(data.results || [])]);
            setNextUrl(data.next || null);
        } catch (error) {
            console.error("Error al cargar más entradas:", error);
        }
    };

    const handleTagClick = (tagSlug) => {
        if (activeTagSlug === tagSlug) {
            searchParams.delete('tag');
        } else {
            searchParams.set('tag', tagSlug);
        }
        searchParams.delete('search'); // Clear search when clicking a tag to avoid confusion
        setSearchInput('');
        setSearchParams(searchParams);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchInput.trim()) {
            searchParams.set('search', searchInput.trim());
            searchParams.delete('tag'); // Clear tag filter when searching
        } else {
            searchParams.delete('search');
        }
        setSearchParams(searchParams);
    };

    // Si estamos en la url de un apunte concreto, pero todavía se está cargando el array de posts:
    if (slug && isLoading) {
        return (
            <div className="blog-index-container">
                <div className="section-subtitle" style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando apunte...</div>
            </div>
        );
    }

    // Si pasamos un slug pero el post no existe:
    if (slug && !activePost && !isLoading) {
        return (
            <div className="blog-post-container">
                <button
                    className="back-to-index-btn"
                    onClick={() => navigate('/blog')}
                >
                    ← Volver al diario
                </button>
                <div className="section-subtitle" style={{ textAlign: 'center', marginTop: '2rem' }}>Apunte no encontrado.</div>
            </div>
        );
    }

    // Vista de Índice de Blog (cuando NO hay slug)
    if (!slug) {
        return (
            <div className="blog-index-container">
                <header className="blog-header">
                    <h2 className="section-title">Diario Visual</h2>
                    <p className="section-subtitle">Anotaciones sobre la luz y el concreto.</p>
                </header>

                {/* Barra de Herramientas Compacta (Filtros + Buscador) */}
                <div className="blog-toolbar">
                    {/* Filtros de Etiquetas */}
                    {tags.length > 0 && (
                        <div className="blog-filters">
                            <button
                                className={`blog-filter-btn ${!activeTagSlug ? 'active' : ''}`}
                                onClick={() => {
                                    searchParams.delete('tag');
                                    setSearchParams(searchParams);
                                }}
                            >
                                Todos
                            </button>
                            {(isTagsExpanded ? tags : tags.slice(0, 5)).map(tag => (
                                <button
                                    key={tag.id}
                                    className={`blog-filter-btn ${activeTagSlug === tag.slug ? 'active' : ''}`}
                                    onClick={() => handleTagClick(tag.slug)}
                                >
                                    {tag.name}
                                </button>
                            ))}
                            {!isTagsExpanded && tags.length > 5 && (
                                <button
                                    className="blog-filter-btn blog-filter-more"
                                    onClick={() => setIsTagsExpanded(true)}
                                >
                                    + {tags.length - 5}
                                </button>
                            )}
                            {isTagsExpanded && tags.length > 5 && (
                                <button
                                    className="blog-filter-btn blog-filter-less"
                                    style={{ border: 'none', color: '#999', padding: '0.5rem' }}
                                    onClick={() => setIsTagsExpanded(false)}
                                >
                                    - Ocultar
                                </button>
                            )}
                        </div>
                    )}

                    {/* Formulario de Búsqueda */}
                    <form className="blog-search-form" onSubmit={handleSearchSubmit}>
                        <input
                            type="text"
                            className="blog-search-input"
                            placeholder="Buscar apuntes, recuerdos..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <button type="submit" className="blog-search-btn">Buscar</button>
                        {urlSearchQuery && (
                            <button
                                type="button"
                                className="blog-search-clear"
                                onClick={() => {
                                    setSearchInput('');
                                    searchParams.delete('search');
                                    setSearchParams(searchParams);
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </form>
                </div>


                {isLoading ? (
                    <div className="section-subtitle" style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando bitácora...</div>
                ) : posts.length === 0 ? (
                    <div className="section-subtitle" style={{ textAlign: 'center', marginTop: '2rem' }}>Aún no hay apuntes en el diario.</div>
                ) : (
                    <div className="blog-list">
                        {posts.map(post => {
                            // Convertir fecha (asumiendo formato ISO YYYY-MM-DD)
                            const dateObj = new Date(post.published_date);
                            const options = { year: 'numeric', month: 'short', day: 'numeric' };
                            const formattedDate = dateObj.toLocaleDateString('es-ES', options).toUpperCase();

                            return (
                                <article
                                    key={post.id}
                                    className="blog-list-item"
                                    onClick={() => navigate(`/blog/${post.slug}`)}
                                >
                                    <div className="blo-item-meta">
                                        <span className="blog-meta">{formattedDate}</span>
                                        <span className="blog-separator">/</span>
                                        <span className="blog-tag text-accent">ENTRADA #{post.id}</span>
                                    </div>
                                    <div className="blog-item-content">
                                        <h3 className="blog-item-title">{post.title}</h3>
                                        <p className="blog-item-excerpt">{post.excerpt}</p>
                                        <button className="read-more-btn">Leer apunte →</button>
                                    </div>
                                    {post.cover_image && (
                                        <div className="blog-item-thumb matte-photo">
                                            <img src={post.cover_image} alt={post.title} loading="lazy" />
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}


                {/* Zona de Pie (Cargar más y Archivo Histórico) */}
                <div className="blog-footer-actions">
                    {nextUrl && (
                        <div className="load-more-container">
                            <button className="load-more-btn" onClick={handleLoadMore}>Cargar más apuntes ↓</button>
                        </div>
                    )}

                    <div className="archive-link-container">
                        <button
                            className="blog-archive-link"
                            onClick={() => navigate('/blog/archivo')}
                        >
                            [ Ver índice completo en el Archivo Histórico ]
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // A partir de aquí, dibujamos un Post Activo encontrado exitosamente

    // Formatear la fecha para el Post activo
    const dateObj = new Date(activePost.published_date);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString('es-ES', options).toUpperCase();

    // Vista de Lectura de Post (Editorial, calmada, centrada)
    return (
        <article className="blog-post-container">
            <button
                className="back-to-index-btn"
                onClick={() => navigate('/blog')}
            >
                ← Volver al diario
            </button>

            <header className="post-header">
                <div className="post-meta-top">
                    <span className="blog-meta">{formattedDate}</span>
                    <span className="blog-separator">/</span>
                    <span className="blog-tag text-accent">ENTRADA #{activePost.id}</span>
                </div>
                <h1 className="post-title">{activePost.title}</h1>
            </header>

            {/* Opcional: Cover Image (Si existe y se quiere mostrar a tamaño completo al inicio) */}
            {activePost.cover_image && (
                <figure className="post-full-image matte-photo">
                    <img src={activePost.cover_image} alt={activePost.title} />
                </figure>
            )}

            <div className="post-body">
                {activePost.excerpt && (
                    <p className="post-dropcap">
                        {activePost.excerpt}
                    </p>
                )}

                {/* Aquí inyectamos el renderer de nuestro modelo JSON generado por Editor.js */}
                {activePost.content ? (
                    <ArticleRenderer content={activePost.content} />
                ) : (
                    <p>Contenido no disponible.</p>
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
        </article>
    );
};

export default Blog;
