
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;

    async function checkOrganizer() {
      const { data: { session } } =
        await supabase.auth.getSession();

      if (!session) {
        if (mounted) setStatus("login");
        return;
      }

      const { data, error } = await supabase
        .from("organizer_permissions")
        .select("is_approved")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Organizer check error:", error.message);
        setStatus("error");
      } else if (data?.is_approved === true) {
        setStatus("approved");
      } else {
        setStatus("not-approved");
      }
    }

    checkOrganizer();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkOrganizer();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return <p className="details-loading">Checking permissions...</p>;
  }

  if (status === "login") {
    return <Navigate to="/login" replace />;
  }

  if (status === "not-approved") {
    return (
      <main className="details-page">
        <h2>Access Not Approved</h2>
        <p>
          Your account does not have organizer permission yet.
          Please contact the administrator.
        </p>
        <Link to="/">Back to Home</Link>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="details-page">
        <h2>Unable to verify access</h2>
        <p>Please try again later.</p>
        <Link to="/">Back to Home</Link>
      </main>
    );
  }

  return children;
}

export default ProtectedRoute;
