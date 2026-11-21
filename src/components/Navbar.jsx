
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../pages/Navbar.css";

function Navbar() {
  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [checking, setChecking] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeMode, setActiveMode] = useState("student");
  const [switching, setSwitching] = useState(false);

  const navigate = useNavigate();
  const profileRef = useRef(null);

  // Fetch user profile and active mode
  async function loadUser(session) {
    const currentUser = session?.user ?? null;

    setUser(currentUser);

    if (!currentUser) {
      setProfileName("");
      setActiveMode("student");
      setChecking(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("active_mode, full_name")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Profile fetch error:", error.message);
    }

    setProfileName(data?.full_name || "");

    setActiveMode(
      data?.active_mode === "organizer" ? "organizer" : "student"
    );

    setChecking(false);
  }

  // Initialize authentication
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        await loadUser(session);
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        loadUser(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Switch Student / Organizer mode
  async function handleModeSwitch(mode) {
    if (mode === activeMode || switching || !user) return;

    setSwitching(true);

    const { error } = await supabase
      .from("profiles")
      .update({ active_mode: mode })
      .eq("id", user.id);

    if (error) {
      console.error("Mode update error:", error);
      alert("Unable to switch mode: " + error.message);
    } else {
      setActiveMode(mode);
      setDropdownOpen(false);

      if (mode === "organizer") {
        navigate("/organizer");
      } else {
        navigate("/");
      }
    }

    setSwitching(false);
  }

  // Logout
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    setDropdownOpen(false);
    navigate("/");
  }

  // Get actual user name
  const userName =
    profileName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "Student";

  // First character of user's actual name
  const initial = userName.trim().charAt(0).toUpperCase() || "S";

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <span className="brand-icon">I</span>
        <span>
          IET <span className="brand-highlight">Events</span>
        </span>
      </Link>

      <div className="nav-links">
        <a href="/#events">Explore Events</a>
        <a href="/#categories">Categories</a>
      </div>

      <div className="nav-actions">
        {!checking && (
          <>
            {user ? (
              <div className="profile-wrapper" ref={profileRef}>
                <button
                  className="profile-trigger"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                >
                  <span className="profile-avatar">
                    {initial}
                  </span>

                  <span className="profile-trigger-info">
                    <span className="profile-trigger-name">
                      {userName}
                    </span>

                    <span className="profile-trigger-role">
                      {activeMode === "organizer"
                        ? "Organizer Mode"
                        : "Student Mode"}
                    </span>
                  </span>

                  <span className="profile-chevron">
                    {dropdownOpen ? "⌃" : "⌄"}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="profile-dropdown">

                    {/* Profile Header */}
                    <div className="profile-dropdown-header">
                      <div className="profile-avatar profile-avatar-large">
                        {initial}
                      </div>

                      <div className="profile-details">
                        <h4>{userName}</h4>
                        <p>{user.email}</p>

                        <span className="student-badge">
                          {activeMode === "organizer"
                            ? "Organizer"
                            : "Student"}
                        </span>
                      </div>
                    </div>

                    <div className="dropdown-divider" />

                    {/* Switch Account Mode */}
                    <div className="mode-switch-section">
                      <p className="mode-switch-title">
                        Switch Account Mode
                      </p>

                      <div className="mode-switch-buttons">
                        {activeMode === "student" ? (
                          <button
                            className="mode-button"
                            onClick={() =>
                              handleModeSwitch("organizer")
                            }
                            disabled={switching}
                          >
                            📋 Switch to Organizer
                          </button>
                        ) : (
                          <button
                            className="mode-button"
                            onClick={() =>
                              handleModeSwitch("student")
                            }
                            disabled={switching}
                          >
                            🎓 Switch to Student
                          </button>
                        )}
                      </div>

                      {switching && (
                        <p className="mode-loading">
                          Switching mode...
                        </p>
                      )}
                    </div>

                    <div className="dropdown-divider" />

                    {/* My Profile */}
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span>👤</span>
                      <span>My Profile</span>
                    </Link>

                    {/* My Registered Events */}
                    <Link
                      to="/my-registrations"
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span>📅</span>
                      <span>My Registered Events</span>
                    </Link>

                    {/* My Attended Events */}
                    <Link
                      to="/my-attended-events"
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span>✅</span>
                      <span>My Attended Events</span>
                    </Link>

                    <div className="dropdown-divider" />

                    {/* Logout */}
                    <button
                      className="dropdown-item logout-item"
                      onClick={handleLogout}
                    >
                      <span>↪</span>
                      <span>Logout</span>
                    </button>

                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline">
                  Login
                </Link>

                <Link to="/signup" className="btn btn-primary">
                  Get Started
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
