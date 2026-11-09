
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import Navbar from './Navbar'
import Footer from './Footer'

function Signup() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (loading) return

    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('Please fill in all fields.')
      return
    }

    const emailPattern = /^[^\s@]+\.[^\s@]+$/

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    let createdUser = null

    try {
      // Step 1: Create the Firebase Authentication account.
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )

      createdUser = userCredential.user

      // Step 2: Set the user's display name.
      await updateProfile(createdUser, {
        displayName: name.trim()
      })

      // Step 3: Save the user's profile in Firestore.
      await setDoc(doc(db, 'users', createdUser.uid), {
        name: name.trim(),
        email: email.trim(),
        plan: 'Free'
      })

      setSuccess('Account created successfully! Redirecting to login...')

      setTimeout(() => {
        navigate('/login')
      }, 1500)

    } catch (error) {
      console.error('Registration error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)

      // If Authentication succeeded but a later step failed,
      // tell the user that the account may already exist.
      if (createdUser) {
        if (error.code === 'permission-denied') {
          setError(
            'Your account was created, but Firestore denied saving your profile. Check your Firestore rules.'
          )
        } else {
          setError(
            `Your account was created, but saving your profile failed: ${error.message}`
          )
        }
      } else if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please log in.')
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else if (error.code === 'auth/weak-password') {
        setError('Please choose a stronger password.')
      } else if (error.code === 'auth/operation-not-allowed') {
        setError(
          'Email and password sign-in is not enabled in Firebase Authentication.'
        )
      } else if (
        error.code === 'permission-denied' ||
        error.code === 'firestore/permission-denied'
      ) {
        setError(
          'Firestore denied the write. Please check your database rules.'
        )
      } else if (error.code === 'unavailable') {
        setError(
          'Firebase is temporarily unavailable. Please try again.'
        )
      } else {
        setError(`Unable to create account: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />

      <div className="signup-page">
        <div className="signup-box">
          <h2>Create a DEV@Deakin Account</h2>

          <form onSubmit={handleSubmit}>
            <label>Name*</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your full name"
              required
            />

            <label>Email*</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
            />

            <label>Password*</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              minLength={6}
              required
            />

            <label>Confirm password*</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Confirm your password"
              minLength={6}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create'}
            </button>
          </form>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="success-message" role="status">
              {success}
            </p>
          )}

          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default Signup
