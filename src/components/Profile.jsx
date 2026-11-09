
import { useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { auth, db } from '../firebase';
import { useAuth } from './AuthContext';
import Navbar from './Navbar';
import Footer from './Footer';
import './Profile.css';

function Profile() {
  const { currentUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('Free');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load profile information from Firestore
  useEffect(() => {
    async function loadProfile() {
      try {
        if (!currentUser) return;

        const userRef = doc(db, 'users', currentUser.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();

          setName(userData.name || currentUser.displayName || '');
          setEmail(userData.email || currentUser.email || '');
          setPlan(userData.plan || 'Free');
        } else {
          setError('Your profile could not be found.');
        }

      } catch (err) {
        console.error('Profile loading error:', err);
        setError('Unable to load your profile.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [currentUser]);

  // Update profile information
  async function handleUpdateProfile(event) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (name.trim().length > 60) {
      setError('Name must be 60 characters or fewer.');
      return;
    }

    try {
      setSaving(true);

      const userRef = doc(db, 'users', currentUser.uid);

      // Update Firebase Authentication display name
      await updateProfile(auth.currentUser, {
        displayName: name.trim()
      });

      // Update Firestore profile
      await updateDoc(userRef, {
        name: name.trim()
      });

      setSuccess('Your profile has been updated successfully.');

    } catch (err) {
      console.error('Profile update error:', err);
      setError('Unable to update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <p className="profile-message">Loading profile...</p>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="profile-container">
        <section className="profile-card">

          <div className="profile-heading">
            <h2>My Profile</h2>
            <p>View and manage your DEV@Deakin account.</p>
          </div>

          <div className="profile-avatar">
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </div>

          <form onSubmit={handleUpdateProfile}>

            <div className="profile-field">
              <label htmlFor="profileName">Full Name</label>

              <input
                id="profileName"
                type="text"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Enter your name"
                maxLength={60}
                required
              />
            </div>

            <div className="profile-field">
              <label htmlFor="profileEmail">Email Address</label>

              <input
                id="profileEmail"
                type="email"
                value={email}
                readOnly
              />

              <small>Email address cannot be changed here.</small>
            </div>

            <div className="profile-field">
              <label>Subscription Plan</label>

              <div className="profile-plan">
                {plan}
              </div>
            </div>

            {error && (
              <p className="profile-error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="profile-success" role="status">
                {success}
              </p>
            )}

            <button
              type="submit"
              className="profile-update-button"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Update Profile'}
            </button>

          </form>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Profile;
