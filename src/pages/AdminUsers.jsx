
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./AdminUsers.css";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      {
        body: { action: "list" },
      }
    );

    if (error) {
      setMessage(error.message || "Unable to load users.");
    } else if (data?.error) {
      setMessage(data.error);
    } else {
      setUsers(data.users || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetPassword = async () => {
    if (!selectedUser) return;

    if (newPassword.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to change the password of ${selectedUser.email}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    const { data, error } = await supabase.functions.invoke(
      "admin-user-management",
      {
        body: {
          action: "update_password",
          userId: selectedUser.id,
          newPassword: newPassword,
        },
      }
    );

    if (error) {
      setMessage(error.message || "Password update failed.");
    } else if (data?.error) {
      setMessage(data.error);
    } else if (data?.success) {
      setMessage("Password updated successfully!");
      setNewPassword("");
      setSelectedUser(null);
    }

    setSaving(false);
  };

  const filteredUsers = users.filter((user) =>
    (user.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-users-page">
      <div className="admin-users-header">
        <div>
          <h1>User Management</h1>
          <p>Manage registered IET Events accounts.</p>
        </div>

        <button onClick={loadUsers} disabled={loading}>
          Refresh Users
        </button>
      </div>

      <div className="admin-users-stats">
        <h2>{users.length}</h2>
        <p>Total Registered Users</p>
      </div>

      {message && (
        <div className="admin-users-message">
          {message}
        </div>
      )}

      <input
        className="admin-users-search"
        type="text"
        placeholder="Search by college email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="admin-users-list">
          {filteredUsers.map((user) => (
            <div className="admin-user-card" key={user.id}>
              <div>
                <h3>{user.email || "No email"}</h3>

                <p>
                  Joined:{" "}
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "Unknown"}
                </p>

                <span>
                  {user.email_confirmed_at
                    ? "Verified"
                    : "Not verified"}
                </span>
              </div>

              <button
                onClick={() => {
                  setSelectedUser(user);
                  setNewPassword("");
                  setMessage("");
                }}
              >
                Set Password
              </button>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <p>No users found.</p>
          )}
        </div>
      )}

      {selectedUser && (
        <div className="password-modal-overlay">
          <div className="password-modal">
            <button
              className="modal-close"
              onClick={() => setSelectedUser(null)}
            >
              ×
            </button>

            <h2>Set New Password</h2>

            <p>{selectedUser.email}</p>

            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <small>Minimum 8 characters.</small>

            <button
              className="password-save-btn"
              onClick={resetPassword}
              disabled={saving || newPassword.length < 8}
            >
              {saving ? "Updating..." : "Update Password"}
            </button>

            <button
              className="password-cancel-btn"
              onClick={() => setSelectedUser(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
