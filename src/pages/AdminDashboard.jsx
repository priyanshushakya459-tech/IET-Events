
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Navbar from "../components/Navbar";
import "./AdminDashboard.css";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const callAdmin = async (action, extra = {}) => {
    const { data, error } = await supabase.functions.invoke(
      "admin-manage",
      {
        body: { action, ...extra },
      }
    );

    if (error) throw error;
    if (!data?.success) {
      throw new Error(data?.error || "Something went wrong");
    }

    return data;
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setMessage("");

      // Verify logged-in user
      const { data: { user }, error } =
        await supabase.auth.getUser();

      if (error || !user) {
        setAuthorized(false);
        setMessage("Please login first.");
        return;
      }

      // Check admin role
      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (profileError || profile?.role !== "admin") {
        setAuthorized(false);
        setMessage("You are not authorized to access this page.");
        return;
      }

      setAuthorized(true);

      // Load users and pending events
      const [userData, eventData] = await Promise.all([
        callAdmin("list_users"),
        callAdmin("list_pending_events"),
      ]);

      setUsers(userData.users);
      setEvents(eventData.events);

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Assign or remove organizer role
  const changeRole = async (userId, role) => {
    try {
      setBusy(userId);

      await callAdmin("set_user_role", {
        userId,
        role,
      });

      setMessage("User role updated successfully!");
      await loadDashboard();

    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  };

  // Approve event
  const approveEvent = async (eventId) => {
    try {
      setBusy(eventId);

      await callAdmin("approve_event", { eventId });

      setMessage("Event approved successfully!");
      await loadDashboard();

    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  };

  // Decline event
  const declineEvent = async (eventId) => {
    const reason = window.prompt(
      "Enter the reason for declining this event:"
    );

    if (!reason?.trim()) return;

    try {
      setBusy(eventId);

      await callAdmin("reject_event", {
        eventId,
        reason,
      });

      setMessage("Event declined successfully!");
      await loadDashboard();

    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="admin-loading">
          Loading Admin Dashboard...
        </div>
      </>
    );
  }

  if (!authorized) {
    return (
      <>
        <Navbar />
        <div className="admin-denied">
          <h2>Access Denied</h2>
          <p>{message}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="admin-layout">

        {/* Sidebar */}
        <aside className="admin-sidebar">
          <h2>IET <span>Admin</span></h2>

          <p className="sidebar-label">MANAGEMENT</p>

          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            ◫ Dashboard
          </button>

          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            ♙ Manage Users
          </button>

          <button
            className={activeTab === "events" ? "active" : ""}
            onClick={() => setActiveTab("events")}
          >
            ▣ Pending Events
          </button>

          <button onClick={loadDashboard}>
            ↻ Refresh Data
          </button>

          <div className="admin-sidebar-bottom">
            <span>Administrator</span>
            <small>IET Lucknow</small>
          </div>
        </aside>

        {/* Main Content */}
        <main className="admin-main">

          <header className="admin-header">
            <div>
              <h1>
                {activeTab === "overview" && "Dashboard"}
                {activeTab === "users" && "Manage Users"}
                {activeTab === "events" && "Pending Events"}
              </h1>
              <p>Welcome to IET Events Administration.</p>
            </div>

            <span className="admin-badge">ADMIN</span>
          </header>

          {message && (
            <div className="admin-message">
              {message}
              <button onClick={() => setMessage("")}>×</button>
            </div>
          )}

          {/* Overview */}
          {activeTab === "overview" && (
            <>
              <div className="admin-stats">

                <div className="admin-stat-card">
                  <span>Total Users</span>
                  <h2>{users.length}</h2>
                </div>

                <div className="admin-stat-card">
                  <span>Organizers</span>
                  <h2>
                    {users.filter(
                      (u) => u.role === "organizer"
                    ).length}
                  </h2>
                </div>

                <div className="admin-stat-card">
                  <span>Students</span>
                  <h2>
                    {users.filter(
                      (u) => u.role === "student"
                    ).length}
                  </h2>
                </div>

                <div className="admin-stat-card">
                  <span>Pending Events</span>
                  <h2>{events.length}</h2>
                </div>

              </div>

              <section className="admin-section">
                <h2>Recent Pending Events</h2>

                {events.slice(0, 5).map((event) => (
                  <div className="admin-event-row" key={event.id}>
                    <div>
                      <h3>{event.title}</h3>
                      <p>{event.category} · {event.venue}</p>
                    </div>

                    <button
                      onClick={() => setActiveTab("events")}
                    >
                      Review
                    </button>
                  </div>
                ))}

                {events.length === 0 && (
                  <p>No pending events right now.</p>
                )}
              </section>
            </>
          )}

          {/* Users */}
          {activeTab === "users" && (
            <section className="admin-section">
              <h2>Registered Users ({users.length})</h2>

              {users.map((user) => (
                <div className="admin-user-row" key={user.id}>
                  <div>
                    <h3>{user.email || "No email"}</h3>
                    <p>
                      Current Role: <strong>{user.role}</strong>
                    </p>
                  </div>

                  {user.role !== "admin" && (
                    <select
                      value={user.role}
                      disabled={busy === user.id}
                      onChange={(e) =>
                        changeRole(user.id, e.target.value)
                      }
                    >
                      <option value="student">Student</option>
                      <option value="organizer">Organizer</option>
                    </select>
                  )}

                  {user.role === "admin" && (
                    <span className="admin-badge">ADMIN</span>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Events */}
          {activeTab === "events" && (
            <section className="admin-section">
              <h2>Review Submitted Events ({events.length})</h2>

              {events.map((event) => (
                <div className="admin-event-card" key={event.id}>
                  <div>
                    <span className="pending-badge">PENDING</span>

                    <h3>{event.title}</h3>

                    <p>{event.description}</p>

                    <p>
                      <strong>Category:</strong> {event.category}
                    </p>

                    <p>
                      <strong>Venue:</strong> {event.venue}
                    </p>

                    <p>
                      <strong>Date:</strong> {event.event_date}
                    </p>
                  </div>

                  <div className="admin-event-actions">
                    <button
                      className="approve-btn"
                      disabled={busy === event.id}
                      onClick={() => approveEvent(event.id)}
                    >
                      Approve
                    </button>

                    <button
                      className="decline-btn"
                      disabled={busy === event.id}
                      onClick={() => declineEvent(event.id)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}

              {events.length === 0 && (
                <p>No pending events to review.</p>
              )}
            </section>
          )}

        </main>
      </div>
    </>
  );
}

export default AdminDashboard;
