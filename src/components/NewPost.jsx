
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '../firebase';
import { useAuth } from './AuthContext';
import './NewPost.css';

function NewPost() {
  const { currentUser } = useAuth();

  const [postType, setPostType] = useState('Question');
  const [postPlan, setPostPlan] = useState('Free');

  const [userPlan, setUserPlan] = useState('Free');
  const [planLoading, setPlanLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [abstract, setAbstract] = useState('');
  const [articleText, setArticleText] = useState('');
  const [tags, setTags] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Load the user's subscription plan from Firestore
  useEffect(() => {
    let isActive = true;

    async function loadUserPlan() {
      if (!currentUser) {
        setUserPlan('Free');
        setPlanLoading(false);
        return;
      }

      try {
        setPlanLoading(true);

        const userRef = doc(db, 'users', currentUser.uid);
        const userSnapshot = await getDoc(userRef);

        if (isActive && userSnapshot.exists()) {
          const plan = userSnapshot.data().plan;

          setUserPlan(plan === 'Paid' ? 'Paid' : 'Free');
        } else if (isActive) {
          setUserPlan('Free');
        }
      } catch (error) {
        console.error('Unable to load subscription plan:', error);

        if (isActive) {
          setUserPlan('Free');
        }
      } finally {
        if (isActive) {
          setPlanLoading(false);
        }
      }
    }

    loadUserPlan();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  // Free users can only create Free posts
  useEffect(() => {
    if (userPlan === 'Free') {
      setPostPlan('Free');
    }
  }, [userPlan]);

  async function handlePost(e) {
    e.preventDefault();

    if (!currentUser) {
      alert('Please log in before submitting a post.');
      return;
    }

    if (planLoading) {
      alert('Please wait while your subscription is checked.');
      return;
    }

    if (postPlan === 'Paid' && userPlan !== 'Paid') {
      alert('A Paid subscription is required to create Paid posts.');
      return;
    }

    const tagList = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    if (!title.trim()) {
      alert('Please enter a title.');
      return;
    }

    if (postType === 'Question' && !description.trim()) {
      alert('Please describe your question.');
      return;
    }

    if (
      postType === 'Article' &&
      (!abstract.trim() || !articleText.trim())
    ) {
      alert('Please enter both abstract and article text.');
      return;
    }

    if (tagList.length > 3) {
      alert('You can add a maximum of 3 tags.');
      return;
    }

    if (tagList.some(tag => !/^[a-zA-Z0-9+#.-]+$/.test(tag))) {
      alert('Tags can contain letters, numbers, +, #, . and - only.');
      return;
    }

    try {
      setSubmitting(true);

      const token = await currentUser.getIdToken();

      const response = await fetch('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          postType,
          postPlan,
          title,
          description,
          abstract,
          articleText,
          tags: tagList
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to submit post.');
      }

      alert(data.message);

      setTitle('');
      setDescription('');
      setAbstract('');
      setArticleText('');
      setTags('');
      setPostType('Question');
      setPostPlan('Free');

    } catch (error) {
      console.error('Post submission error:', error);
      alert(error.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="new-post-container">
      <h2>Create a New Post</h2>

      <form onSubmit={handlePost}>
        <label>Select Post Type</label>

        <div className="post-options">
          <label>
            <input
              type="radio"
              checked={postType === 'Question'}
              onChange={() => setPostType('Question')}
            />
            Question
          </label>

          <label>
            <input
              type="radio"
              checked={postType === 'Article'}
              onChange={() => setPostType('Article')}
            />
            Article
          </label>
        </div>

        <label htmlFor="postPlan">Post Visibility</label>

        {planLoading ? (
          <p>Checking your subscription...</p>
        ) : userPlan === 'Paid' ? (
          <select
            id="postPlan"
            value={postPlan}
            onChange={e => setPostPlan(e.target.value)}
          >
            <option value="Free">Free</option>
            <option value="Paid">Paid</option>
          </select>
        ) : (
          <>
            <select id="postPlan" value="Free" disabled>
              <option value="Free">Free</option>
            </select>

            <p>
              You are currently on the Free plan.
              {' '}
              <Link to="/pricing">Upgrade to Paid</Link>
              {' '}
              to create Paid posts.
            </p>
          </>
        )}

        <label htmlFor="title">Title</label>

        <input
          id="title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Enter your post title"
          maxLength={150}
          required
        />

        {postType === 'Question' ? (
          <>
            <label htmlFor="description">Describe your question</label>

            <textarea
              id="description"
              rows="6"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explain your question..."
              required
            />
          </>
        ) : (
          <>
            <label htmlFor="abstract">Abstract</label>

            <textarea
              id="abstract"
              rows="3"
              value={abstract}
              onChange={e => setAbstract(e.target.value)}
              placeholder="Write a short abstract..."
              required
            />

            <label htmlFor="articleText">Article Text</label>

            <textarea
              id="articleText"
              rows="7"
              value={articleText}
              onChange={e => setArticleText(e.target.value)}
              placeholder="Write your article..."
              required
            />
          </>
        )}

        <label htmlFor="tags">Tags (maximum 3)</label>

        <input
          id="tags"
          type="text"
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="React, JavaScript, Python"
        />

        <button
          type="submit"
          className="post-button"
          disabled={submitting || planLoading}
        >
          {submitting ? 'Submitting...' : 'Submit Post'}
        </button>
      </form>
    </main>
  );
}

export default NewPost;
