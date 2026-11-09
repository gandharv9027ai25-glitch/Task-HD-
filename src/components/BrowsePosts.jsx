import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './BrowsePosts.css';

const API_URL = 'http://localhost:3000/api/posts';
const POSTS_PER_PAGE = 5;

// Convert a Firestore timestamp into a JavaScript Date.
function getPostDate(createdAt) {
  if (!createdAt) return null;

  if (createdAt._seconds) {
    return new Date(createdAt._seconds * 1000);
  }

  if (createdAt.seconds) {
    return new Date(createdAt.seconds * 1000);
  }

  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function BrowsePosts() {
  const { currentUser, loading: authLoading } = useAuth();

  const [posts, setPosts] = useState([]);
  const [userPlan, setUserPlan] = useState('Free');

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Pagination states
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [typeFilter, setTypeFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [hiddenPosts, setHiddenPosts] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState([]);

  // Prevent older requests from replacing newer results.
  const latestRequest = useRef(0);

  // Fetch posts from backend with search and filters.
  async function fetchPosts(cursor = null, append = false) {
    const requestNumber = ++latestRequest.current;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError('');

      const headers = {};

      // Get Firebase authentication token.
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      // Create API query parameters.
      const params = new URLSearchParams({
        limit: String(POSTS_PER_PAGE)
      });

      if (cursor) {
        params.set('cursor', cursor);
      }

      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      if (typeFilter !== 'All') {
        params.set('type', typeFilter);
      }

      if (planFilter !== 'All') {
        params.set('plan', planFilter);
      }

      if (tagFilter.trim()) {
        params.set('tag', tagFilter.trim());
      }

      if (fromDate) {
        params.set('fromDate', fromDate);
      }

      if (toDate) {
        params.set('toDate', toDate);
      }

      // Send request to backend.
      const response = await fetch(
        `${API_URL}?${params.toString()}`,
        {
          method: 'GET',
          headers
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load posts.');
      }

      // Ignore outdated responses.
      if (requestNumber !== latestRequest.current) {
        return;
      }

      // Replace posts or append the next batch.
      setPosts(previous => {
        if (!append) {
          return data.posts || [];
        }

        const existingIds = new Set(
          previous.map(post => post.id)
        );

        const newPosts = (data.posts || []).filter(
          post => !existingIds.has(post.id)
        );

        return [...previous, ...newPosts];
      });

      setUserPlan(data.userPlan || 'Free');
      setNextCursor(data.nextCursor || null);
      setHasMore(Boolean(data.hasMore));

    } catch (err) {
      if (requestNumber === latestRequest.current) {
        console.error('Loading posts error:', err);

        setError(
          err.message || 'Unable to load posts.'
        );

        if (!append) {
          setPosts([]);
          setNextCursor(null);
          setHasMore(false);
        }
      }

    } finally {
      if (requestNumber === latestRequest.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  // Load the first batch whenever authentication or filters change.
  // Search is delayed by 400ms to avoid unnecessary API requests.
  useEffect(() => {
    if (authLoading) return undefined;

    setPosts([]);
    setNextCursor(null);
    setHasMore(false);

    setHiddenPosts([]);
    setExpandedPosts([]);

    const timer = setTimeout(() => {
      fetchPosts();
    }, 400);

    return () => {
      clearTimeout(timer);

      // Mark previous requests as outdated.
      latestRequest.current += 1;
    };

  }, [
    currentUser,
    authLoading,
    searchTerm,
    typeFilter,
    planFilter,
    tagFilter,
    fromDate,
    toDate
  ]);

  // Load the next five posts.
  function handleLoadMore() {
    if (
      !nextCursor ||
      !hasMore ||
      loadingMore ||
      loading
    ) {
      return;
    }

    fetchPosts(nextCursor, true);
  }

  // Hide a post.
  function hidePost(postId) {
    setHiddenPosts(previous => [
      ...previous,
      postId
    ]);
  }

  // Expand or collapse a post.
  function toggleExpand(postId) {
    setExpandedPosts(previous =>
      previous.includes(postId)
        ? previous.filter(id => id !== postId)
        : [...previous, postId]
    );
  }

  // Reset all filters.
  function resetFilters() {
    setSearchTerm('');
    setTypeFilter('All');
    setPlanFilter('All');
    setTagFilter('');
    setFromDate('');
    setToDate('');

    setHiddenPosts([]);
    setExpandedPosts([]);
  }

  // useMemo hides posts without repeating unnecessary calculations.
  const visiblePosts = useMemo(() => {
    return posts.filter(
      post => !hiddenPosts.includes(post.id)
    );
  }, [posts, hiddenPosts]);

  // Loading screen.
  if (authLoading || loading) {
    return (
      <p className="browse-message">
        Loading posts...
      </p>
    );
  }

  return (
    <main className="browse-container">

      <h2>Browse Posts</h2>

      {/* Current subscription plan */}
      <p className="plan-message">
        Your current plan: <strong>{userPlan}</strong>
      </p>

      {/* Premium promotion for Free users */}
      {userPlan === 'Free' && (
        <section className="premium-promotion">

          <div className="premium-promotion-content">

            <span className="premium-icon">★</span>

            <div>
              <h3>Unlock Premium Content</h3>

              <p>
                Upgrade to a Paid subscription to explore
                exclusive premium posts and articles.
              </p>
            </div>

          </div>

          <Link
            to="/pricing"
            className="premium-upgrade-button"
          >
            Upgrade to Paid
          </Link>

        </section>
      )}

      {/* Search and Filter Section */}
      <section className="filter-section">

        <h3>Search and Filter Posts</h3>

        <div className="filter-grid">

          {/* Global Search */}
          <div>
            <label htmlFor="searchTerm">
              Search Posts
            </label>

            <input
              id="searchTerm"
              type="text"
              value={searchTerm}
              onChange={event =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search title, content or tags..."
            />
          </div>

          {/* Post Type Filter */}
          <div>
            <label htmlFor="typeFilter">
              Post Type
            </label>

            <select
              id="typeFilter"
              value={typeFilter}
              onChange={event =>
                setTypeFilter(event.target.value)
              }
            >
              <option value="All">All Types</option>
              <option value="Question">Question</option>
              <option value="Article">Article</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <label htmlFor="planFilter">
              Post Plan
            </label>

            <select
              id="planFilter"
              value={planFilter}
              onChange={event =>
                setPlanFilter(event.target.value)
              }
            >
              <option value="All">All Plans</option>
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* Tag Filter */}
          <div>
            <label htmlFor="tagFilter">
              Search by Tag
            </label>

            <input
              id="tagFilter"
              type="text"
              value={tagFilter}
              onChange={event =>
                setTagFilter(event.target.value)
              }
              placeholder="Enter a tag"
            />
          </div>

          {/* From Date */}
          <div>
            <label htmlFor="fromDate">
              From Date
            </label>

            <input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={event =>
                setFromDate(event.target.value)
              }
            />
          </div>

          {/* To Date */}
          <div>
            <label htmlFor="toDate">
              To Date
            </label>

            <input
              id="toDate"
              type="date"
              min={fromDate || undefined}
              value={toDate}
              onChange={event =>
                setToDate(event.target.value)
              }
            />
          </div>

        </div>

        <button
          type="button"
          className="reset-button"
          onClick={resetFilters}
        >
          Reset Filters
        </button>

      </section>

      {/* Posts Heading */}
      <div className="posts-heading">

        <h3>Available Posts</h3>

        <span>
          {visiblePosts.length} posts in this batch
        </span>

      </div>

      {/* Error Message */}
      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {/* No Posts Message */}
      {!error && visiblePosts.length === 0 && (
        <p className="browse-message">
          No posts found. Try changing your search or filters.
        </p>
      )}

      {/* Posts List */}
      <div className="posts-list">

        {visiblePosts.map(post => {

          const isExpanded = expandedPosts.includes(post.id);
          const postDate = getPostDate(post.createdAt);

          return (
            <article
              className="post-card"
              key={post.id}
            >

              {/* Post Type and Premium Badge */}
              <div className="post-card-header">

                <span className="post-type-label">
                  {post.postType}
                </span>

                <span
                  className={`post-plan-label ${
                    post.postPlan === 'Paid'
                      ? 'premium-post-label'
                      : 'free-post-label'
                  }`}
                >
                  {post.postPlan === 'Paid'
                    ? '★ PREMIUM'
                    : 'FREE'}
                </span>

              </div>

              {/* Post Title */}
              <h3>{post.title}</h3>

              {/* Post Date */}
              {postDate && (
                <p className="post-date">
                  {postDate.toLocaleString()}
                </p>
              )}

              {/* Question or Article Content */}
              {post.postType === 'Question' ? (

                <p className="post-content">
                  {post.description}
                </p>

              ) : (

                <>

                  <h4>Abstract</h4>

                  <p className="post-content">
                    {post.abstract}
                  </p>

                  {isExpanded && (
                    <>

                      <h4>Article Text</h4>

                      <p className="post-content">
                        {post.articleText}
                      </p>

                    </>
                  )}

                </>

              )}

              {/* Post Tags */}
              {post.tags?.length > 0 && (
                <div className="post-tags">

                  {post.tags.map((tag, index) => (
                    <span key={`${post.id}-${index}`}>
                      #{tag}
                    </span>
                  ))}

                </div>
              )}

              {/* Post Actions */}
              <div className="post-actions">

                <button
                  type="button"
                  onClick={() => toggleExpand(post.id)}
                >
                  {isExpanded ? 'Show Less' : 'Expand'}
                </button>

                <button
                  type="button"
                  className="hide-button"
                  onClick={() => hidePost(post.id)}
                >
                  Hide
                </button>

              </div>

            </article>
          );

        })}

      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="load-more-container">

          <button
            type="button"
            className="load-more-button"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore
              ? 'Loading...'
              : 'Load More Posts'}
          </button>

        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="browse-message">
          You have reached the end of the posts.
        </p>
      )}

    </main>
  );
}

export default BrowsePosts;