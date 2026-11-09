
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './AuthContext'
import Navbar from './Navbar'
import Footer from './Footer'
import './Pricing.css'

function Pricing() {
  const { currentUser, loading } = useAuth()
  const navigate = useNavigate()

  const [plan, setPlan] = useState('Free')
  const [planLoading, setPlanLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [paymentName, setPaymentName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false)

  // Load the user's current plan from Firestore.
  useEffect(() => {
    let active = true

    async function loadPlan() {
      if (loading) return

      if (!currentUser) {
        setPlan('Free')
        setPlanLoading(false)
        return
      }

      setPlanLoading(true)

      try {
        const userDoc = await getDoc(
          doc(db, 'users', currentUser.uid)
        )

        if (active) {
          setPlan(
            userDoc.exists() && userDoc.data().plan === 'Paid'
              ? 'Paid'
              : 'Free'
          )
        }
      } catch (error) {
        console.error('Unable to load subscription plan:', error)
      } finally {
        if (active) {
          setPlanLoading(false)
        }
      }
    }

    loadPlan()

    return () => {
      active = false
    }
  }, [currentUser, loading])

  // Open the upgrade form.
  const handleUpgrade = () => {
    if (!currentUser) {
      navigate('/login')
      return
    }

    if (plan === 'Paid') {
      alert('You are already on the Paid plan.')
      return
    }

    setFormError('')
    setFormMessage('')
    setShowModal(true)
  }

  // Validate the form and send the request to the backend.
  const handlePaymentSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setFormMessage('')

    if (submittingUpgrade) return

    if (!currentUser) {
      setShowModal(false)
      navigate('/login')
      return
    }

    if (plan === 'Paid') {
      setFormError('You are already on the Paid plan.')
      return
    }

    if (!paymentName.trim()) {
      setFormError('Please enter the cardholder name.')
      return
    }

    const digits = cardNumber.replace(/\s/g, '')

    if (!/^\d{12,19}$/.test(digits)) {
      setFormError('Enter a valid demonstration card number.')
      return
    }

    // Check that expiry uses MM/YY format.
    const expiryMatch = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/)

    if (!expiryMatch) {
      setFormError('Enter expiry in MM/YY format.')
      return
    }

    const month = Number(expiryMatch[1])
    const year = 2000 + Number(expiryMatch[2])
    const now = new Date()

    if (
      year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1)
    ) {
      setFormError('The expiry date must be in the future.')
      return
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      setFormError('Enter a 3 or 4 digit demonstration CVV.')
      return
    }

    setSubmittingUpgrade(true)

    try {
      // Get a Firebase ID token for the signed-in user.
      const token = await currentUser.getIdToken()

      // Send the request to the backend.
      const response = await fetch(
        'http://localhost:3000/api/upgrade-plan',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: paymentName.trim(),
            cardNumber: digits,
            expiry,
            cvv,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.message || 'Unable to upgrade your plan.'
        )
      }

      // Update the page only after the backend confirms success.
      setPlan('Paid')
      setFormMessage(
        result.message ||
          'Your subscription has been upgraded successfully!'
      )

      setPaymentName('')
      setCardNumber('')
      setExpiry('')
      setCvv('')
    } catch (error) {
      console.error('Upgrade request failed:', error)
      setFormError(
        error.message ||
          'Could not connect to the upgrade service. Please try again.'
      )
    } finally {
      setSubmittingUpgrade(false)
    }
  }

  // Close the form and clear its contents.
  const closeModal = () => {
    if (submittingUpgrade) return

    setShowModal(false)
    setFormError('')
    setFormMessage('')
    setPaymentName('')
    setCardNumber('')
    setExpiry('')
    setCvv('')
  }

  return (
    <>
      <Navbar />

      <main className="pricing-page">
        <section className="pricing-heading">
          <p className="pricing-label">DEV@DEAKIN MEMBERSHIP</p>
          <h1>Choose Your Plan</h1>
          <p>
            Find the right plan for your learning and creative journey.
          </p>

          {currentUser && (
            <p className="current-plan">
              Your current plan:{' '}
              <strong>
                {planLoading ? 'Checking...' : plan}
              </strong>
            </p>
          )}
        </section>

        <section className="pricing-cards">
          <article className="pricing-card">
            <h2>Free</h2>

            <p className="pricing-description">
              A great starting point for every learner.
            </p>

            <p className="pricing-price">
              ₹0 <span>/ forever</span>
            </p>

            <ul>
              <li>Basic account access</li>
              <li>Create standard posts</li>
              <li>Standard image uploads</li>
              <li>Access learning content</li>
            </ul>

            <button
              type="button"
              className="pricing-button free-button"
              disabled={loading || planLoading}
              onClick={() => {
                if (!currentUser) {
                  navigate('/signup')
                } else if (plan === 'Free') {
                  alert('You are currently using the Free plan.')
                }
              }}
            >
              {currentUser && plan === 'Free'
                ? 'Current Plan'
                : 'Get Started'}
            </button>
          </article>

          <article className="pricing-card paid-card">
            <span className="popular-label">PREMIUM</span>

            <h2>Paid</h2>

            <p className="pricing-description">
              More opportunities for active creators.
            </p>

            <p className="pricing-price">
              ₹199 <span>/ month</span>
            </p>

            <ul>
              <li>Everything in Free</li>
              <li>More posts per month</li>
              <li>Larger image uploads</li>
              <li>Premium creator features</li>
            </ul>

            <button
              type="button"
              className="pricing-button paid-button"
              disabled={
                loading || planLoading || plan === 'Paid'
              }
              onClick={handleUpgrade}
            >
              {loading || planLoading
                ? 'Please wait...'
                : plan === 'Paid'
                  ? 'Current Paid Plan'
                  : 'Upgrade Plan'}
            </button>
          </article>
        </section>

        <p className="pricing-note">
          Subscription features are presented for demonstration purposes.
          No real payment is processed.
        </p>
      </main>

      {showModal && (
        <div
          className="upgrade-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal()
            }
          }}
        >
          <section
            className="upgrade-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-title"
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeModal}
              aria-label="Close upgrade form"
              disabled={submittingUpgrade}
            >
              ×
            </button>

            <p className="pricing-label">DEV@DEAKIN PREMIUM</p>

            <h2 id="upgrade-title">Upgrade Your Plan</h2>

            <p className="modal-description">
              Subscription: ₹199/month.
            </p>

            <form onSubmit={handlePaymentSubmit}>
              <label htmlFor="payment-name">
                Cardholder name
              </label>

              <input
                id="payment-name"
                type="text"
                autoComplete="off"
                value={paymentName}
                onChange={(event) =>
                  setPaymentName(event.target.value)
                }
                placeholder="Test User"
                required
                disabled={submittingUpgrade}
              />

              <label htmlFor="card-number">
                Test card number
              </label>

              <input
                id="card-number"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={cardNumber}
                onChange={(event) =>
                  setCardNumber(
                    event.target.value
                      .replace(/[^\d ]/g, '')
                      .slice(0, 23)
                  )
                }
                placeholder="1234 5678 9012 3456"
                required
                disabled={submittingUpgrade}
              />

              <div className="payment-fields">
                <div>
                  <label htmlFor="expiry">
                    Expiry (MM/YY)
                  </label>

                  <input
                    id="expiry"
                    type="text"
                    autoComplete="off"
                    inputMode="numeric"
                    value={expiry}
                    onChange={(event) => {
                      // Keep only numbers and insert / after the month.
                      let value = event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 4)

                      if (value.length > 2) {
                        value =
                          value.slice(0, 2) +
                          '/' +
                          value.slice(2)
                      }

                      setExpiry(value)
                    }}
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                    disabled={submittingUpgrade}
                  />
                </div>

                <div>
                  <label htmlFor="cvv">Test CVV</label>

                  <input
                    id="cvv"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={cvv}
                    onChange={(event) =>
                      setCvv(
                        event.target.value
                          .replace(/\D/g, '')
                          .slice(0, 4)
                      )
                    }
                    placeholder="123"
                    required
                    disabled={submittingUpgrade}
                  />
                </div>
              </div>

              {formError && (
                <p className="error-message" role="alert">
                  {formError}
                </p>
              )}

              {formMessage && (
                <p className="success-message" role="status">
                  {formMessage}
                </p>
              )}

              <button
                type="submit"
                className="pricing-button paid-button"
                disabled={submittingUpgrade || plan === 'Paid'}
              >
                {submittingUpgrade
                  ? 'Processing...'
                  : plan === 'Paid'
                    ? 'Plan Upgraded'
                    : 'Upgrade'}
              </button>

              <button
                type="button"
                className="cancel-button"
                onClick={closeModal}
                disabled={submittingUpgrade}
              >
                Cancel
              </button>
            </form>
          </section>
        </div>
      )}

      <Footer />
    </>
  )
}

export default Pricing
