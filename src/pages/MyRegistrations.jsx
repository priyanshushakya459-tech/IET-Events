
import StudentQRScanner from "../components/StudentQRScanner";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./MyRegistrations.css";

// CHECK EVENT DATE
const getEventStatus = (eventDate) => {
  if (!eventDate) return "unknown";

  const today = new Date();

  const todayDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const date = String(eventDate).slice(0, 10);

  if (date < todayDate) return "completed";
  if (date === todayDate) return "today";

  return "upcoming";
};

// REGISTRATION STATUS
const getStatus = (status) => {
  const value = (status || "registered").toLowerCase();

  if (value === "cancelled" || value === "canceled") {
    return "cancelled";
  }

  if (value === "completed") {
    return "completed";
  }

  return "registered";
};

function MyRegistrations() {
  const [scanningEventId, setScanningEventId] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRegistrations();
  }, []);

  // FETCH REGISTRATIONS
  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Please login to view registrations.");
      }

      // FETCH STUDENT REGISTRATIONS
      const { data: registrationData, error: registrationError } =
        await supabase
          .from("registrations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      if (registrationError) throw registrationError;

      if (!registrationData || registrationData.length === 0) {
        setRegistrations([]);
        return;
      }

      // GET EVENT IDS
      const eventIds = [
        ...new Set(registrationData.map((item) => item.event_id)),
      ];

      // FETCH EVENTS
      const { data: eventsData, error: eventsError } =
        await supabase
          .from("events")
          .select(
            "id, title, category, venue, event_date, description"
          )
          .in("id", eventIds);

      if (eventsError) throw eventsError;

      // CREATE EVENT MAP
      const eventMap = new Map(
        (eventsData || []).map((event) => [
          String(event.id),
          event,
        ])
      );

      // COMBINE REGISTRATION AND EVENT DATA
      const combinedData = registrationData.map((registration) => ({
        ...registration,
        event:
          eventMap.get(String(registration.event_id)) || null,
      }));

      setRegistrations(combinedData);

    } catch (err) {
      console.error("My registrations error:", err);

      setError(
        err.message || "Unable to load registrations."
      );

    } finally {
      setLoading(false);
    }
  };

  // LOADING SCREEN
  if (loading) {
    return (
      <div className="my-events-loading">
        <div className="my-events-spinner"></div>
        <p>Loading your registered events...</p>
      </div>
    );
  }

  return (
    <main className="my-events-page">
      <div className="my-events-container">

        {/* HEADER */}
        <div className="my-events-header">
          <div>
            <span className="my-events-eyebrow">
              IET EVENTS
            </span>

            <h1>My Registered Events</h1>

            <p>
              All the events you have registered for.
            </p>
          </div>

          <Link to="/" className="my-events-browse">
            Explore Events →
          </Link>
        </div>

        {/* STATS */}
        <div className="my-events-stats">

          <div className="my-events-stat">
            <span>Total Registrations</span>
            <h2>{registrations.length}</h2>
          </div>

          <div className="my-events-stat">
            <span>Active Registrations</span>

            <h2>
              {registrations.filter(
                (r) => getStatus(r.status) === "registered"
              ).length}
            </h2>
          </div>

        </div>

        {/* ERROR */}
        {error && (
          <div className="my-events-error">
            {error}
          </div>
        )}

        {/* EMPTY STATE */}
        {!error && registrations.length === 0 ? (

          <div className="my-events-empty">
            <div className="my-events-empty-icon">
              📅
            </div>

            <h2>No Registered Events Yet</h2>

            <p>
              You haven't registered for any events.
              Explore upcoming events and join the excitement!
            </p>

            <Link to="/" className="my-events-browse">
              Explore Events
            </Link>
          </div>

        ) : (

          /* REGISTRATION LIST */
          !error && (
            <div className="my-events-list">

              {registrations.map((registration) => {

                const event = registration.event;

                const registrationStatus = getStatus(
                  registration.status
                );

                const eventStatus = getEventStatus(
                  event?.event_date
                );

                // QR SCANNER ONLY FOR TODAY OR UPCOMING EVENTS
                const canScanQR =
                  event &&
                  registrationStatus === "registered" &&
                  (eventStatus === "today" ||
                    eventStatus === "upcoming");

                return (
                  <article
                    className="my-event-card"
                    key={registration.id}
                  >

                    <div className="my-event-content">

                      {/* TOP SECTION */}
                      <div className="my-event-top">

                        <span className="my-event-category">
                          {event?.category || "College Event"}
                        </span>

                        <span
                          className={`my-event-status ${registrationStatus}`}
                        >
                          {registrationStatus === "registered"
                            ? "✓ Registered"
                            : registrationStatus === "completed"
                            ? "Completed"
                            : "Cancelled"}
                        </span>

                      </div>

                      {/* EVENT TITLE */}
                      <h2>
                        {event?.title || "Event Unavailable"}
                      </h2>

                      {/* EVENT DETAILS */}
                      <div className="my-event-details">

                        <p>
                          <span>📅</span>

                          {event?.event_date
                            ? new Date(
                                `${String(event.event_date).slice(0, 10)}T00:00:00`
                              ).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "Date not available"}
                        </p>

                        <p>
                          <span>📍</span>

                          {event?.venue || "Venue not announced"}
                        </p>

                        <p>
                          <span>🆔</span>

                          Registration ID: {registration.id}
                        </p>

                        <p>
                          <span>🕒</span>

                          Registered on:{" "}
                          {registration.created_at
                            ? new Date(
                                registration.created_at
                              ).toLocaleDateString("en-IN")
                            : "Not available"}
                        </p>

                      </div>

                      {/* VIEW EVENT DETAILS */}
                      {event && (
                        <Link
                          to={`/events/${event.id}`}
                          className="my-event-view-btn"
                        >
                          View Event Details →
                        </Link>
                      )}

                      {/* EVENT EXPIRED MESSAGE */}
                      {event &&
                        eventStatus === "completed" &&
                        registrationStatus === "registered" && (
                          <p className="my-event-expired">
                            Event Completed
                          </p>
                        )}

                      {/* QR ATTENDANCE */}
                      {canScanQR && (
                        <div className="my-event-attendance">

                          <button
                            className="my-event-scan-btn"
                            onClick={() =>
                              setScanningEventId(event.id)
                            }
                          >
                            📷 Scan QR for Attendance
                          </button>

                          {scanningEventId === event.id && (
                            <StudentQRScanner
                              onClose={() =>
                                setScanningEventId(null)
                              }
                            />
                          )}

                        </div>
                      )}

                    </div>
                  </article>
                );
              })}

            </div>
          )
        )}

      </div>
    </main>
  );
}

export default MyRegistrations;
