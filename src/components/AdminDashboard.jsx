
import {useEffect, useState, useOptimistic, useTransition} from 'react';

import { useAuth } from './AuthContext';
import './AdminDashboard.css';

const API_BASE = 'http://localhost:3000/api/admin';

// Convert Firestore timestamp into readable date
function getPostDate(createdAt) {
  if (!createdAt) return 'Date unavailable';

  if (createdAt._seconds) {
    return new Date(createdAt._seconds * 1000).toLocaleString();
  }

  if (createdAt.seconds) {
    return new Date(createdAt.seconds * 1000).toLocaleString();
  }

  const date = new Date(createdAt);

  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString();
}

function AdminDashboard() {
  const { currentUser } = useAuth();

  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    totalPosts: 0,
    freeUsers: 0,
    paidUsers: 0
  });

  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [planChanges, setPlanChanges] = useState({});

  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [deletingPost, setDeletingPost] = useState(null);
  const [updatingUser, setUpdatingUser] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // React 19: Optimistic post deletion
  const [optimisticPosts, setOptimisticPosts] = useOptimistic(
    posts,
    (currentPosts, postId) =>
      currentPosts.filter(post => post.id !== postId)
  );

  const [isPending, startTransition] = useTransition();

  // Load dashboard data
  async function loadDashboard() {
    if (!currentUser) return;

    try {
      setLoading(true);
      setLoadingPosts(true);
      setLoadingUsers(true);
      setError('');

      const token = await currentUser.getIdToken();

      const headers = {
        Authorization: `Bearer ${token}`
      };

      const [
        statsResponse,
        postsResponse,
        usersResponse
      ] = await Promise.all([
        fetch(`${API_BASE}/stats`, { headers }),
        fetch(`${API_BASE}/posts`, { headers }),
        fetch(`${API_BASE}/users`, { headers })
      ]);

      const statsData = await statsResponse.json();
      const postsData = await postsResponse.json();
      const usersData = await usersResponse.json();

      if (!statsResponse.ok) {
        throw new Error(
          statsData.message || 'Unable to load statistics.'
        );
      }

      if (!postsResponse.ok) {
        throw new Error(
          postsData.message || 'Unable to load posts.'
        );
      }

      if (!usersResponse.ok) {
        throw new Error(
          usersData.message || 'Unable to load users.'
        );
      }

      setStatistics(statsData.statistics);
      setPosts(postsData.posts || []);
      setUsers(usersData.users || []);
      setPlanChanges({});

    } catch (err) {
      console.error('Admin dashboard error:', err);
      setError(err.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
      setLoadingPosts(false);
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [currentUser]);

  // Delete a post using useOptimistic
  async function handleDeletePost(postId, postTitle) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${postTitle}"?`
    );

    if (!confirmed) return;

    setDeletingPost(postId);
    setError('');
    setSuccess('');

    // Start an optimistic React transition
    startTransition(async () => {

      // Immediately remove the post from the displayed list
      setOptimisticPosts(postId);

      try {
        const token = await currentUser.getIdToken();

        const response = await fetch(
          `${API_BASE}/posts/${encodeURIComponent(postId)}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || 'Unable to delete post.'
          );
        }

        // Confirm the deletion in the actual React state
        setPosts(previous =>
          previous.filter(post => post.id !== postId)
        );

        // Update dashboard statistics
        setStatistics(previous => ({
          ...previous,
          totalPosts: Math.max(0, previous.totalPosts - 1)
        }));

        setSuccess('Post deleted successfully.');

      } catch (err) {
        console.error('Delete post error:', err);

        // The optimistic post automatically returns
        // because the actual posts state was not changed.
        setError(err.message || 'Unable to delete post.');

      } finally {
        setDeletingPost(null);
      }
    });
  }

  // Change the selected plan in the dropdown
  function handlePlanSelection(userId, newPlan) {
    setPlanChanges(previous => ({
      ...previous,
      [userId]: newPlan
    }));
  }

  // Update a user's subscription plan
  async function handleUpdatePlan(user) {
    const newPlan = planChanges[user.id] ?? user.plan;

    if (newPlan === user.plan) {
      return;
    }

    if (user.id === currentUser.uid) {
      setError('You cannot change your own subscription plan.');
      return;
    }

    const confirmed = window.confirm(
      `Change ${user.name || user.email}'s plan from ${user.plan} to ${newPlan}?`
    );

    if (!confirmed) return;

    try {
      setUpdatingUser(user.id);
      setError('');
      setSuccess('');

      const token = await currentUser.getIdToken();

      const response = await fetch(
        `${API_BASE}/users/${encodeURIComponent(user.id)}/plan`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            plan: newPlan
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to update subscription.'
        );
      }

      // Update the displayed user
      setUsers(previous =>
        previous.map(item =>
          item.id === user.id
            ? { ...item, plan: newPlan }
            : item
        )
      );

      // Update subscription statistics
      setStatistics(previous => ({
        ...previous,

        freeUsers:
          previous.freeUsers +
          (newPlan === 'Free' ? 1 : -1),

        paidUsers:
          previous.paidUsers +
          (newPlan === 'Paid' ? 1 : -1)
      }));

      setPlanChanges(previous => {
        const updated = { ...previous };
        delete updated[user.id];
        return updated;
      });

      setSuccess(
        data.message || 'Subscription updated successfully.'
      );

    } catch (err) {
      console.error('Update subscription error:', err);
      setError(err.message || 'Unable to update subscription.');
    } finally {
      setUpdatingUser(null);
    }
  }

  // Dashboard statistics cards
  const cards = [
    {
      title: 'Total Users',
      value: statistics.totalUsers,
      icon: '👥',
      description: 'Registered users'
    },
    {
      title: 'Total Posts',
      value: statistics.totalPosts,
      icon: '📝',
      description: 'Published posts'
    },
    {
      title: 'Free Users',
      value: statistics.freeUsers,
      icon: '🆓',
      description: 'Free subscriptions'
    },
    {
      title: 'Paid Users',
      value: statistics.paidUsers,
      icon: '⭐',
      description: 'Paid subscriptions'
    }
  ];

  if (loading) {
    return (
      <p className="admin-message">
        Loading admin dashboard...
      </p>
    );
  }

  if (error && !statistics.totalUsers && !posts.length && !users.length) {
    return (
      <main className="admin-container">
        <h2>Admin Dashboard</h2>
        <p className="admin-error">{error}</p>
      </main>
    );
  }

  return (
    <main className="admin-container">

      {/* Dashboard heading */}
      <div className="admin-heading">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Manage and monitor your DEV@Deakin platform.</p>
        </div>

        <span className="admin-badge">
          Administrator
        </span>
      </div>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="admin-success" role="status">
          {success}
        </p>
      )}

      {/* Statistics cards */}
      <section className="admin-stats-grid">
        {cards.map(card => (
          <article className="admin-stat-card" key={card.title}>
            <div className="admin-stat-icon">
              {card.icon}
            </div>

            <div>
              <h3>{card.title}</h3>
              <p className="admin-stat-value">{card.value}</p>
              <span>{card.description}</span>
            </div>
          </article>
        ))}
      </section>

      {/* User Management */}
      <section className="admin-post-section">
        <div className="admin-post-heading">
          <div>
            <h2>User Management</h2>
            <p>View users and manage their subscription plans.</p>
          </div>
        </div>

        {loadingUsers ? (
          <p className="admin-message">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="admin-message">No users found.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-post-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subscription</th>
                  <th>Role</th>
                  <th>Manage Plan</th>
                </tr>
              </thead>

              <tbody>
                {users.map(user => {
                  const selectedPlan =
                    planChanges[user.id] ?? user.plan;

                  const isCurrentUser =
                    user.id === currentUser.uid;

                  return (
                    <tr key={user.id}>
                      <td className="admin-post-title">
                        {user.name}
                      </td>

                      <td>{user.email || 'Not available'}</td>

                      <td>
                        <span className={
                          user.plan === 'Paid'
                            ? 'admin-plan-paid'
                            : 'admin-plan-free'
                        }>
                          {user.plan}
                        </span>
                      </td>

                      <td>
                        {user.role === 'admin'
                          ? 'Administrator'
                          : 'Regular User'}
                      </td>

                      <td>
                        {isCurrentUser ? (
                          <span className="admin-self-label">
                            Your account
                          </span>
                        ) : (
                          <div className="admin-plan-controls">
                            <select
                              value={selectedPlan}
                              onChange={event =>
                                handlePlanSelection(
                                  user.id,
                                  event.target.value
                                )
                              }
                              disabled={updatingUser === user.id}
                              aria-label={`Select plan for ${user.name}`}
                            >
                              <option value="Free">Free</option>
                              <option value="Paid">Paid</option>
                            </select>

                            <button
                              type="button"
                              className="admin-update-button"
                              onClick={() => handleUpdatePlan(user)}
                              disabled={
                                updatingUser === user.id ||
                                selectedPlan === user.plan
                              }
                            >
                              {updatingUser === user.id
                                ? 'Updating...'
                                : 'Update'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Post Management */}
      <section className="admin-post-section">
        <div className="admin-post-heading">
          <div>
            <h2>Manage Posts</h2>
            <p>View and manage published posts.</p>
          </div>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={loadDashboard}
            disabled={isPending}
          >
            Refresh
          </button>
        </div>

        {loadingPosts ? (
          <p className="admin-message">Loading posts...</p>
        ) : optimisticPosts.length === 0 ? (
          <p className="admin-message">
            No posts are currently available.
          </p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-post-table">
              <thead>
                <tr>
                  <th>Post Title</th>
                  <th>Author ID</th>
                  <th>Type</th>
                  <th>Plan</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {optimisticPosts.map(post => (
                  <tr key={post.id}>
                    <td className="admin-post-title">
                      {post.title || 'Untitled'}
                    </td>

                    <td>
                      {post.userId
                        ? `${post.userId.slice(0, 8)}...`
                        : 'Unknown'}
                    </td>

                    <td>{post.postType || 'Unknown'}</td>

                    <td>{post.postPlan || 'Unknown'}</td>

                    <td>{getPostDate(post.createdAt)}</td>

                    <td>
                      <button
                        type="button"
                        className="admin-delete-button"
                        onClick={() =>
                          handleDeletePost(post.id, post.title)
                        }
                        disabled={
                          deletingPost === post.id || isPending
                        }
                      >
                        {deletingPost === post.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </main>
  );
}

export default AdminDashboard;
