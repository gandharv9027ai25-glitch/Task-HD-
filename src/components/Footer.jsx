
import { useState } from 'react'

function Footer() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (event) => {
    event.preventDefault()

    if (!email.trim()) {
      alert('Please enter your email address.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Subscription failed.')
      }

      alert(data.message || 'Thank you for subscribing!')
      setEmail('')

    } catch (error) {
      console.error('Newsletter error:', error)
      alert(error.message || 'Unable to subscribe. Please try again.')

    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-newsletter">
        <h3>SIGN UP FOR OUR DAILY INSIDER</h3>

        <form onSubmit={handleSubscribe}>
          <input
            type="email"
            placeholder="Enter your email"
            aria-label="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
      </div>

      <div className="footer-columns">
        <div className="footer-column">
          <h3>Explore</h3>
          <a href="#about">Home</a>
          <a href="#work">Projects</a>
          <a href="#articles">Articles</a>
          <a href="#tutorials">Tutorials</a>
        </div>

        <div className="footer-column">
          <h3>Support</h3>
          <a href="#contact">FAQs</a>
          <a href="#contact">Help</a>
          <a href="#contact">Contact Us</a>
        </div>

        <div className="footer-column">
          <h3>Stay Connected</h3>
          <div className="social-links">
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook">f</a>
            <a href="https://www.twitter.com/" target="_blank" rel="noreferrer" aria-label="Twitter">𝕏</a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">◎</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <h3>DEV@Deakin</h3>
        <p>© 2026 Gandharv Sumotra. All rights reserved.</p>

        <div className="footer-legal">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms</a>
          <a href="#conduct">Code of Conduct</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
