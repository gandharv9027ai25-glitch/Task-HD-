
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './components/AuthContext';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Projects from './components/Projects';
import Gallery from './components/Gallery';
import FeaturedArticles from './components/FeaturedArticles';
import FeaturedTutorials from './components/FeaturedTutorials';
import Contact from './components/Contact';
import Footer from './components/Footer';

import Login from './components/Login';
import Signup from './components/Signup';
import Pricing from './components/Pricing';
import NewPost from './components/NewPost';
import BrowsePosts from './components/BrowsePosts';
import AdminDashboard from './components/AdminDashboard';
import Profile from './components/Profile';

// Home page
function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Projects />
      <Gallery />
      <FeaturedArticles />
      <FeaturedTutorials />
      <Contact />
      <Footer />
    </>
  );
}

// Protected Post route
function ProtectedPost() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar />
      <NewPost />
      <Footer />
    </>
  );
}

// Protected Admin route
function ProtectedAdmin() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar />
      <AdminDashboard />
      <Footer />
    </>
  );
}

// Protected Profile route
function ProtectedProfile() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Profile />;
}

// Main App
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />

          <Route path="/signup" element={<Signup />} />

          <Route path="/pricing" element={<Pricing />} />

          <Route path="/post" element={<ProtectedPost />} />

          <Route
            path="/browse-posts"
            element={
              <>
                <Navbar />
                <BrowsePosts />
                <Footer />
              </>
            }
          />

          <Route path="/admin" element={<ProtectedAdmin />} />

          <Route path="/profile" element={<ProtectedProfile />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
