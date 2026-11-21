
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Navbar from "../components/Navbar";
import CategoryList from "../components/CategoryList";
import EventCard from "../components/EventCard";

// Sort events: Upcoming/Today first, Completed last
function sortEventsByDate(events) {
  const today = new Date();

  const todayDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return [...events].sort((a, b) => {
    const dateA = String(a.event_date || "").slice(0, 10);
    const dateB = String(b.event_date || "").slice(0, 10);

    const completedA = dateA !== "" && dateA < todayDate;
    const completedB = dateB !== "" && dateB < todayDate;

    // Completed events always come last
    if (completedA !== completedB) {
      return completedA ? 1 : -1;
    }

    // Events without dates come at the very end
    if (!dateA) return 1;
    if (!dateB) return -1;

    // Completed events: latest completed date first
    if (completedA && completedB) {
      return dateB.localeCompare(dateA);
    }

    // Upcoming and today's events: nearest date first
    return dateA.localeCompare(dateB);
  });
}

function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get("category");

  useEffect(() => {
    let isMounted = true;

    async function fetchEvents() {
      let query = supabase
        .from("events")
        .select("*");

      if (selectedCategory) {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;

      if (!isMounted) return;

      if (error) {
        console.error("Error fetching events:", error.message);
        setEvents([]);
      } else {
        setEvents(sortEventsByDate(data ?? []));
      }

      setLoading(false);
    }

    // Initial fetch
    fetchEvents();

    // Realtime subscription
    const channel = supabase
      .channel("home-events")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        (payload) => {
          console.log("Realtime change detected:", payload);
          fetchEvents();
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [selectedCategory]);

  function showAllEvents() {
    setSearchParams({});
  }

  return (
    <>
      <Navbar />

      <main>
        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">
              YOUR CAMPUS. YOUR COMMUNITY.
            </p>

            <h1>
              Discover what's
              <br />
              <span>happening at IET.</span>
            </h1>

            <p className="hero-description">
              Find exciting college events, connect with students
              and never miss a moment on campus.
            </p>

            <a href="#events" className="btn btn-primary hero-button">
              Explore Events →
            </a>

            <div className="hero-stats">
              <div>
                <strong>One Campus</strong>
                <span>Endless Opportunities</span>
              </div>

              <div>
                <strong>One Platform</strong>
                <span>Every Experience</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-orbit orbit-one"></div>
            <div className="visual-orbit orbit-two"></div>

            <div className="visual-center">
              <span>✦</span>
              <h2>IET</h2>
              <p>EVENTS</p>
            </div>

            <div className="floating-card floating-top">
              <span>💻</span>
              <div>
                <strong>Tech & Innovation</strong>
                <p>Ideas come alive</p>
              </div>
            </div>

            <div className="floating-card floating-bottom">
              <span>🎉</span>
              <div>
                <strong>Campus Life</strong>
                <p>Make memories</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="categories">
          <div className="section-heading">
            <div>
              <p className="eyebrow">FIND YOUR INTEREST</p>
              <h2>Explore Categories</h2>
            </div>
          </div>

          <CategoryList />
        </section>

        <section className="section events-section" id="events">
          <div className="section-heading">
            <div>
              <p className="eyebrow">WHAT'S GOING ON</p>

              <h2>
                {selectedCategory
                  ? `${selectedCategory} Events`
                  : "Events"}
              </h2>

              <p>Find your campus experience.</p>
            </div>

            <span className="event-count">
              {events.length} Events
            </span>
          </div>

          {selectedCategory && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={showAllEvents}
              style={{ marginBottom: "20px" }}
            >
              ← All Events
            </button>
          )}

          <div className="event-grid">
            {loading ? (
              <p>Loading events...</p>
            ) : events.length > 0 ? (
              events.map((event) => (
                <EventCard event={event} key={event.id} />
              ))
            ) : (
              <p>No events found in this category.</p>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>© 2026 IET Events · Built for campus life.</p>
      </footer>
    </>
  );
}

export default Home;
