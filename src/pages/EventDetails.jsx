import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function EventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching event:", error.message);
        setEvent(null);
      } else {
        setEvent(data);
      }

      setLoading(false);
    }

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="details-loading">
        Loading event details...
      </div>
    );
  }

  if (!event) {
    return (
      <main className="details-page">
        <Link to="/" className="back-link">
          ← Back to Events
        </Link>
        <h2>Event not found</h2>
      </main>
    );
  }

  return (
    <main className="details-page">
      <Link to="/" className="back-link">
        ← Back to Events
      </Link>

      <article className="details-card">
        <div className="details-banner">
          <span className="event-tag">{event.category}</span>
          <span className="details-symbol">✦</span>
        </div>

        <div className="details-body">
          <p className="eyebrow">IET CAMPUS EVENT</p>

          <h1>{event.title}</h1>

          <div className="details-info">
            <div className="details-info-item">
              <span>📅 Event Date & Time</span>
              <strong>
                {new Date(event.event_date).toLocaleString("en-IN", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </strong>
            </div>

            <div className="details-info-item">
              <span>📍 Venue</span>
              <strong>{event.venue}</strong>
            </div>
          </div>

          <h3>About This Event</h3>

          <p className="details-description">
            {event.description || "More details coming soon."}
          </p>
        </div>
      </article>
    </main>
  );
}

export default EventDetails;