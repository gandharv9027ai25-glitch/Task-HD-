import profileImage from '../assets/Photo.jpg'

function About() {
  return (
    <section id="about">
      <h2>About Me</h2>

      <img
        src={profileImage}
        alt="Gandharv's Profile Photo"
        className="Profile"
      />

      <p>
        Hi, I'm Gandharv Sumotra. I am an AI/ML student in Chitkara University.
      </p>
    </section>
  )
}

export default About
