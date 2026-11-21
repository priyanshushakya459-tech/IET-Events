import { useNavigate } from "react-router-dom";

const categories = [
  { icon: "💻", name: "Technical" },
  { icon: "🎭", name: "Cultural" },
  { icon: "🏆", name: "Competition" },
  { icon: "⚽", name: "Sports" },
];

function CategoryList() {
  const navigate = useNavigate();

  return (
    <div className="category-list">
      {categories.map((category) => (
        <button
          className="category-card"
          key={category.name}
          type="button"
          onClick={() =>
            navigate(
              `/?category=${encodeURIComponent(category.name)}#events`
            )
          }
        >
          <span className="category-icon">{category.icon}</span>
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
}

export default CategoryList;