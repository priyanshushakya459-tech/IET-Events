
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function LogoutButton() {
  const navigate = useNavigate();

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    navigate("/login", { replace: true });
  }

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={handleLogout}
    >
      Logout
    </button>
  );
}

export default LogoutButton;
