
function FeaturedTutorials() {
  const tutorials = [
    {
      image: "/mounatian.avif",
      title: "Exploring the Mountains",
      description:
        "Mountains are a great place to enjoy nature, explore beautiful landscapes and experience outdoor adventures.",
      rating: 5,
      username: "Gandharv"
    },
    {
      image: "/car.avif",
      title: "My Interest in Cars",
      description:
        "Cars are one of my interests, and I enjoy learning about different cars, their designs and technology.",
      rating: 5,
      username: "Gandharv"
    },
    {
      image: "/aus.webp",
      title: "Exploring Australia",
      description:
        "Australia is a beautiful country with diverse landscapes, modern cities and many interesting places to explore.",
      rating: 4.9,
      username: "Gandharv"
    }
  ]

  return (
    <section id="tutorials">
      <h2>Featured Tutorials</h2>

      <div className="tutorials">
        {tutorials.map((tutorial, index) => (
          <div className="tutorial" key={index}>
            <img
              src={tutorial.image}
              alt={tutorial.title}
              className="tutorial-image"
            />

            <h3>{tutorial.title}</h3>
            <p>{tutorial.description}</p>

            <div className="tutorial-info">
              <span className="tutorial-rating">
                ⭐ {tutorial.rating}
              </span>
              <span>{tutorial.username}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        className="see-all-button"
        type="button"
        onClick={() => alert("More tutorials will be added soon!")}
      >
        See all tutorials
      </button>
    </section>
  )
}

export default FeaturedTutorials
