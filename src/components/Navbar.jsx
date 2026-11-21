
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../pages/Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [user, setUser] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [checking, setChecking] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeMode, setActiveMode] = useState("student");
  const [switching, setSwitching] = useState(false);

  // Load logged-in user and profile
  async function loadUser(session) {
    const currentUser = session?.user;

    if (!currentUser) {
      setUser(null);
      setProfileName("");
      setActiveMode("student");
      setChecking(false);
      return;
    }

    setUser(currentUser);

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, active_mode")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Profile loading error:", error);
    }

    setProfileName(data?.full_name || "");
    setActiveMode(data?.active_mode || "student");
    setChecking(false);
  }

  // Authentication listener
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        await loadUser(session);
      }
    }

    initializeAuth();

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
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

    // Organizer ke liye approval information page open hoga
    if (mode === "organizer") {
      setDropdownOpen(false);
      navigate("/organizer-approval");
      return;
    }

    // Student mode switching - existing behavior
    setSwitching(true);

    const { error } = await supabase
      .from("profiles")
      .update({ active_mode: "student" })
      .eq("id", user.id);

    if (error) {
      console.error("Mode update error:", error);
      alert("Unable to switch mode: " + error.message);
    } else {
      setActiveMode("student");
      setDropdownOpen(false);
      navigate("/");
    }

    setSwitching(false);
  }

  // Logout
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Logout failed: " + error.message);
      return;
    }

    setDropdownOpen(false);
    setUser(null);
    navigate("/");
  }

  const avatarLetter = (
    profileName?.trim()?.charAt(0) ||
    user?.email?.charAt(0) ||
    "U"
  ).toUpperCase();

  if (checking) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">

        {/* Website Logo */}
        <Link to="/" className="brand">
          <span className="brand-name">IET Events</span>
        </Link>

        {/* Navigation Links */}
        <div className="nav-links">
          <Link to="/#events">Explore Events</Link>
          <Link to="/#categories">Categories</Link>
        </div>

        {/* Right Side Actions */}
        <div className="nav-actions">

          {!user ? (
            <>
              <Link to="/login" className="login-btn">
                Login
              </Link>

              <Link to="/signup" className="signup-btn">
                Get Started
              </Link>
            </>
          ) : (
            <div className="profile-menu" ref={dropdownRef}>

              {/* Profile Avatar */}
              <button
                className="profile-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
              >
                <span className="profile-avatar">
                  {avatarLetter}
                </span>

                <span className="profile-trigger-name">
                  {profileName || "My Account"}
                </span>

                <span className="dropdown-arrow">
                  {dropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="profile-dropdown">

                  <div className="dropdown-user-info">
                    <strong>
                      {profileName || "User"}
                    </strong>

                    <small>{user.email}</small>

                    <span className="mode-label">
                      Current Mode: {activeMode === "organizer"
                        ? "Organizer"
                        : "Student"}
                    </span>
                  </div>

                  <div className="dropdown-divider" />

                  <Link
                    to="/profile"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span>👤</span>
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/my-registrations"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span>🎟️</span>
                    <span>My Registered Events</span>
                  </Link>

                  <Link
                    to="/my-attended-events"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span>✅</span>
                    <span>My Attended Events</span>
                  </Link>

                  <div className="dropdown-divider" />

                  {/* Mode Switching */}
                  {activeMode === "student" ? (
                    <button
                      className="dropdown-item mode-button"
                      onClick={() => handleModeSwitch("organizer")}
                      disabled={switching}
                    >
                      <span>🛡️</span>
                      <span>
                        {switching
                          ? "Please wait..."
                          : "Switch to Organizer"}
                      </span>
                    </button>
                  ) : (
                    <button
                      className="dropdown-item mode-button"
                      onClick={() => handleModeSwitch("student")}
                      disabled={switching}
                    >
                      <span>🎓</span>
                      <span>
                        {switching
                          ? "Please wait..."
                          : "Switch to Student"}
                      </span>
                    </button>
                  )}

                  <div className="dropdown-divider" />

                  <button
                    className="dropdown-item logout-button"
                    onClick={handleLogout}
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>

                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </nav>
  );
}

export default Navbar;
