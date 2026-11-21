
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./Auth.css";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const isCollegeEmail = (value) =>
    /^[a-zA-Z0-9._%+-]+@ietlucknow\.ac\.in$/i.test(value.trim());

  async function handleSignup(event) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const normalizedEmail = email.trim().toLowerCase();

    if (!isCollegeEmail(normalizedEmail)) {
      setIsError(true);
      setMessage(
        "Only official @ietlucknow.ac.in email addresses are allowed."
      );
      return;
    }

    if (password.length < 6) {
      setIsError(true);
      setMessage("Password must contain at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;

      if (data.user?.email_confirmed_at) {
        setMessage("Account created successfully! Your email is verified.");
      } else {
        setMessage(
          "Account created! Please check your IET college email and click the confirmation link before logging in."
        );
      }
    } catch (error) {
      setIsError(true);
      setMessage(error.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSignup}>
        <p className="eyebrow">IET EVENTS</p>
        <h1>Create Account</h1>
        <p className="auth-subtitle">
          Register using your official IET Lucknow college email.
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
            placeholder="At least 6 characters"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>

        {message && (
          <p
            className={`auth-message ${
              isError ? "auth-error" : "auth-success"
            }`}
            role="status"
          >
            {message}
          </p>
        )}

        <button
          className="btn btn-primary auth-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>

        <Link className="auth-home-link" to="/">
          ← Back to Home
        </Link>
      </form>
    </main>
  );
}

export default Signup;
