import ProjectCard from './ProjectCard'

function Projects() {
  return (
    <section id="work">
      <h2>Here's what I've done so far</h2>

      <div className="projects">
        <ProjectCard
          image="/sit313.png"
          title="SIT313 Course Website"
          description="A basic web project created for SIT313 using HTML and CSS. The website displays course information and demonstrates basic frontend development."
        />

        <ProjectCard
          image="/bmi.png"
          title="BMI Calculator"
          description="A simple BMI calculator website that allows users to enter their weight and height and calculate their BMI."
        />

        <ProjectCard
          image="/registration.png"
          title="Student Registration Form"
          description="A student registration form created using HTML and CSS. It contains fields for name, email and password."
        />
      </div>
    </section>
  )
}

export default Projects