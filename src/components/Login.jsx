
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import Navbar from './Navbar'
import Footer from './Footer'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)

      setSuccess('Login successful! Redirecting...')

      setTimeout(() => {
        navigate('/')
      }, 1000)
    } catch (error) {
      console.error('Login error:', error)

      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        setError('Incorrect email or password. Please try again or sign up.')
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else {
        setError('Unable to login. Please try again.')
      }
    }
  }

  return (
    <>
      <Navbar />

      <div className="login-page">
        <div className="login-box">
          <h2>Login</h2>

          <form onSubmit={handleSubmit}>
            <label>Your email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
            />

            <label>Your password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />

            <button type="submit">Login</button>
          </form>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <p>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default Login
