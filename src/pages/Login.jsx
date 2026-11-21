
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isCollegeEmail = (value) =>
    /^[a-zA-Z0-9._%+-]+@ietlucknow\.ac\.in$/i.test(value.trim());

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!isCollegeEmail(normalizedEmail)) {
      setMessage(
        "Please login using your official @ietlucknow.ac.in email."
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;

      const user = data.user;

      if (!user?.email_confirmed_at) {
        await supabase.auth.signOut();

        throw new Error(
          "Please verify your college email before logging in. Check your inbox."
        );
      }

      // Check profile completion
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("profile_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // First-time user or incomplete profile
      if (!profile || !profile.profile_completed) {
        navigate("/profile", { replace: true });
      } else {
        // Existing completed user
        navigate("/select-role", { replace: true });
      }

    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        error.message || "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleLogin}>
        <p className="eyebrow">IET EVENTS</p>

        <h1>Welcome Back</h1>

        <p className="auth-subtitle">
          Login using your official IET Lucknow email.
        </p>

        <label>
          College Email

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="rollnumber@ietlucknow.ac.in"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>

        {message && (
          <p className="auth-message auth-error" role="alert">
            {message}
          </p>
        )}

        <button
          className="btn btn-primary auth-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>

        <Link className="auth-home-link" to="/">
          ← Back to Home
        </Link>
      </form>
    </main>
  );
}

export default Login;
