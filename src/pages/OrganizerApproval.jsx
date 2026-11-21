
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./OrganizerApproval.css";

function OrganizerApproval() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (loading) return;

    setLoading(true);

    try {
      // Check logged-in user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        navigate("/login");
        return;
      }

      // Update account mode
      const { error } = await supabase
        .from("profiles")
        .update({ active_mode: "organizer" })
        .eq("id", user.id);

      if (error) throw error;

      // Open Organizer Dashboard
      navigate("/organizer");
    } catch (error) {
      console.error("Organizer mode error:", error);
      alert(
        error.message ||
        "Unable to continue. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="approval-page">
      <div className="approval-card">

        <div className="approval-icon">
          <span>🛡️</span>
        </div>

        <span className="approval-label">
          ORGANIZER ACCESS
        </span>

        <h1>Become an Organizer</h1>

        <p className="approval-subtitle">
          Manage campus events, registrations and
          attendance through the IET Events platform.
        </p>

        <div className="approval-notice">

          <div className="notice-heading">
            <span>⚠️</span>
            <h3>Physical Approval Required</h3>
          </div>

          <p>
            Before becoming an official organizer,
            students are required to obtain physical
            approval from the college administration.
          </p>

          <p>
            As of now, the approval process is conducted
            offline. Please contact the concerned college
            authorities for permission.
          </p>

        </div>

        <div className="approval-steps">

          <div className="approval-step">
            <span>01</span>
            <div>
              <h4>Visit College Administration</h4>
              <p>
                Contact the concerned college authorities.
              </p>
            </div>
          </div>

          <div className="approval-step">
            <span>02</span>
            <div>
              <h4>Obtain Physical Approval</h4>
              <p>
                Get permission to manage campus events.
              </p>
            </div>
          </div>

          <div className="approval-step">
            <span>03</span>
            <div>
              <h4>Access Organizer Dashboard</h4>
              <p>
                Continue after acknowledging the approval
                requirement.
              </p>
            </div>
          </div>

        </div>

        <button
          className="approval-continue-btn"
          onClick={handleContinue}
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : "I Understand, Continue →"}
        </button>

        <button
          className="approval-back-btn"
          onClick={() => navigate("/")}
          disabled={loading}
        >
          ← Back to Website
        </button>

        <p className="approval-footer">
          IET Events · Your Campus. Your Community.
        </p>

      </div>
    </div>
  );
}

export default OrganizerApproval;
