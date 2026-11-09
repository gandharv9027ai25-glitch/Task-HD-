import deakinImage from '../assets/Deakin.jpeg'

function Hero() {
  return (
    <div className="Deakin">
      <img src={deakinImage} alt="Deakin" />

      <div className="Deakin-text">
        Hey I'm Gandharv
      </div>
    </div>
  )
}

export default Hero