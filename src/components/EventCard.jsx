
import { useNavigate } from "react-router-dom";

function getEventStatus(eventDate) {
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
}

function EventCard({ event }) {
  const navigate = useNavigate();

  const status = getEventStatus(event.event_date);

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Date not announced";

  return (
    <article className="event-card">
      <div className="event-banner">
        <span className="event-tag">{event.category}</span>

        <span className="event-status-badge">
          {status === "upcoming"
            ? "Upcoming"
            : status === "today"
            ? "Today"
            : status === "completed"
            ? "Completed"
            : "Date TBA"}
        </span>

        <span className="event-symbol">✦</span>
      </div>

      <div className="event-content">
        <p className="event-date">
          📅 {formattedDate}
        </p>

        <h3>{event.title}</h3>

        <p className="event-description">
          {event.description || "More details coming soon."}
        </p>

        <p className="event-venue">
          📍 {event.venue}
        </p>

        <div className="event-actions">
          <button
            type="button"
            className="btn btn-primary event-button"
            onClick={() => navigate(`/events/${event.id}`)}
          >
            View Details <span>→</span>
          </button>

          <button
            type="button"
            className="btn btn-register"
            disabled={
              status === "completed" || status === "unknown"
            }
            onClick={() =>
              navigate(`/events/${event.id}/register`)
            }
          >
            {status === "completed"
              ? "Registration Closed"
              : status === "unknown"
              ? "Date Not Available"
              : "Register Now"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default EventCard;
