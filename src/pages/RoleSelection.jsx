import { useNavigate } from "react-router-dom";
import "./Auth.css";

function RoleSelection() {
  const navigate = useNavigate();

  return (
    <main className="auth-page">
      <div className="auth-card role-card">
        <p className="eyebrow">IET EVENTS</p>

        <h1>Welcome to IET Events!</h1>

        <p className="auth-subtitle">
          How would you like to continue?
        </p>

        <div className="role-options">
          <button
            type="button"
            className="role-option"
            onClick={() => navigate("/")}
          >
            <span className="role-icon">🎓</span>
            <span className="role-title">
              Continue as Student
            </span>
            <span className="role-description">
              Explore campus events and register for them.
            </span>
          </button>

          <button
            type="button"
            className="role-option"
            onClick={() => navigate("/Organizer")}
          >
            <span className="role-icon">📋</span>
            <span className="role-title">
              Continue as Organizer
            </span>
            <span className="role-description">
             Make Our Campus Better .
            </span>
          </button>
        </div>

        
      </div>
    </main>
  );
}

export default RoleSelection;