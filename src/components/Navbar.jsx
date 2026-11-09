
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../firebase';
import { useAuth } from './AuthContext';

function Navbar() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  const [userRole, setUserRole] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);

  // Check the user's role from Firestore
  useEffect(() => {
    let isActive = true;

    async function checkUserRole() {
      if (!currentUser) {
        setUserRole('');
        return;
      }

      try {
        setRoleLoading(true);

        const userRef = doc(db, 'users', currentUser.uid);
        const userSnapshot = await getDoc(userRef);

        if (isActive && userSnapshot.exists()) {
          setUserRole(userSnapshot.data().role || '');
        }
      } catch (error) {
        console.error('Unable to check user role:', error);

        if (isActive) {
          setUserRole('');
        }
      } finally {
        if (isActive) {
          setRoleLoading(false);
        }
      }
    }

    checkUserRole();

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserRole('');
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Unable to log out. Please try again.');
    }
  };

  return (
    <nav>
      <Link to="/" className="logo">
        DEV@Deakin
      </Link>

      <input
        type="text"
        placeholder="Search..."
        className="search-input"
      />

      <Link to="/">Home</Link>

      <Link to="/pricing">Pricing</Link>

      <Link to="/browse-posts">Browse Posts</Link>

      {/* Show Profile only to logged-in users */}
      {!loading && currentUser && (
        <Link to="/profile">
          Profile
        </Link>
      )}

      {/* Show Admin Dashboard only to administrators */}
      {!loading &&
        !roleLoading &&
        currentUser &&
        userRole === 'admin' && (
          <Link to="/admin">
            Admin Dashboard
          </Link>
        )}

      {/* Login and Signup for logged-out users */}
      {!loading && !currentUser && (
        <>
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign Up</Link>
        </>
      )}

      {/* Logged-in user information */}
      {!loading && currentUser && (
        <>
          <span>
            {currentUser.displayName || currentUser.email}
          </span>

          <button
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </>
      )}

      <Link
        to={currentUser ? '/post' : '/login'}
        className="nav-button"
      >
        Post
      </Link>
    </nav>
  );
}

export default Navbar;
