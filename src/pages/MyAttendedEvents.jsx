
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./MyAttendedEvents.css";

function MyAttendedEvents() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchAttendedEvents() {
      try {
        setLoading(true);
        setError("");

        // 1. Get logged-in user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          navigate("/login", {
            state: { from: "/my-attended-events" },
            replace: true,
          });
          return;
        }

        // 2. Get registrations of logged-in user
        const { data: registrations, error: registrationError } =
          await supabase
            .from("registrations")
            .select("id, event_id")
            .eq("user_id", user.id);

        if (registrationError) throw registrationError;

        if (!registrations || registrations.length === 0) {
          if (active) setEvents([]);
          return;
        }

        const registrationIds = registrations.map((item) => item.id);

        // 3. Get attendance records
        const { data: attendanceRecords, error: attendanceError } =
          await supabase
            .from("attendance")
            .select("registration_id, status, marked_via, marked_at")
            .in("registration_id", registrationIds)
            .eq("status", "present");

        if (attendanceError) throw attendanceError;

        if (!attendanceRecords || attendanceRecords.length === 0) {
          if (active) setEvents([]);
          return;
        }

        // 4. Match present attendance with registrations
        const attendedRegistrations = registrations
          .map((registration) => {
            const attendance = attendanceRecords.find(
              (record) =>
                record.registration_id === registration.id
            );

            if (!attendance) return null;

            return {
              ...registration,
              attendance,
            };
          })
          .filter(Boolean);

        const eventIds = [
          ...new Set(
            attendedRegistrations.map((item) => item.event_id)
          ),
        ];

        // 5. Fetch event details
        const { data: eventData, error: eventError } =
          await supabase
            .from("events")
            .select("id, title, category, venue, event_date")
            .in("id", eventIds);

        if (eventError) throw eventError;

        // 6. Combine event and attendance details
        const finalEvents = attendedRegistrations
          .map((registration) => {
            const event = eventData.find(
              (item) => item.id === registration.event_id
            );

            if (!event) return null;

            return {
              ...event,
              attendance: registration.attendance,
            };
          })
          .filter(Boolean)
          .sort(
            (a, b) =>
              new Date(b.attendance.marked_at) -
              new Date(a.attendance.marked_at)
          );

        if (active) {
          setEvents(finalEvents);
        }
      } catch (err) {
        console.error("My attended events error:", err);

        if (active) {
          setError(
            err.message || "Unable to load attended events."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAttendedEvents();

    return () => {
      active = false;
    };
  }, [navigate]);

  function formatDate(date) {
    if (!date) return "Date not announced";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getAttendanceLabel(method) {
    if (method === "qr") return "QR Attendance";
    if (method === "manual") return "Manual Attendance";

    return "Attendance Verified";
  }

  if (loading) {
    return (
      <div className="attended-loading">
        <div className="attended-spinner"></div>
        <p>Loading your attended events...</p>
      </div>
    );
  }

  return (
    <main className="attended-page">
      <div className="attended-container">

        {/* Header */}
        <div className="attended-header">
          <div>
            <span className="attended-eyebrow">
              YOUR EVENT JOURNEY
            </span>

            <h1>My Attended Events</h1>

            <p>
              Events where your attendance has been successfully
              marked.
            </p>
          </div>

          <Link to="/" className="attended-back">
            ← Explore Events
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="attended-error">
            {error}
          </div>
        )}

        {/* Event Count */}
        {!error && (
          <div className="attended-count">
            <span className="attended-count-number">
              {events.length}
            </span>

            <span>
              {events.length === 1 ? "Event Attended" : "Events Attended"}
            </span>
          </div>
        )}

        {/* Empty State */}
        {!error && events.length === 0 && (
          <div className="attended-empty">
            <div className="attended-empty-icon">📅</div>

            <h2>No attended events yet</h2>

            <p>
              Once your attendance is marked as present at an event,
              it will appear here.
            </p>

            <Link to="/" className="attended-explore-btn">
              Explore Events
            </Link>
          </div>
        )}

        {/* Events Grid */}
        <div className="attended-grid">
          {events.map((event) => (
            <article className="attended-card" key={event.id}>

              <div className="attended-card-top">
                <span className="attended-category">
                  {event.category || "Campus Event"}
                </span>

                <span className="attended-present">
                  ✓ Present
                </span>
              </div>

              <h2>{event.title}</h2>

              <div className="attended-details">
                <p>
                  <span>📅</span>
                  {formatDate(event.event_date)}
                </p>

                <p>
                  <span>📍</span>
                  {event.venue || "Venue not announced"}
                </p>
              </div>

              <div className="attended-card-footer">
                <span className="attended-method">
                  {event.attendance.marked_via === "qr"
                    ? "▦"
                    : "✓"}
                  {" "}
                  {getAttendanceLabel(
                    event.attendance.marked_via
                  )}
                </span>

                <span className="attended-date">
                  {event.attendance.marked_at
                    ? new Date(
                        event.attendance.marked_at
                      ).toLocaleDateString("en-IN")
                    : ""}
                </span>
              </div>

            </article>
          ))}
        </div>

      </div>
    </main>
  );
}

export default MyAttendedEvents;
