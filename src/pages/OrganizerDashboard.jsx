
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabaseClient";
import "./OrganizerDashboard.css";

function OrganizerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingId, setEditingId] = useState(null);

  const [registrationCounts, setRegistrationCounts] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // Attendance states
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceUpdating, setAttendanceUpdating] = useState(null);

  // QR states
  const [qrPayload, setQrPayload] = useState(null);
  const [qrExpiresAt, setQrExpiresAt] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const initialForm = {
    title: "",
    category: "Technical",
    venue: "",
    eventDate: "",
    description: "",
    eligibleYears: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
  };

  const [form, setForm] = useState(initialForm);

  // Initialize dashboard
  useEffect(() => {
    initializeDashboard();
  }, []);

  // QR countdown
  useEffect(() => {
    if (!qrExpiresAt) return;

    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [qrExpiresAt]);

  const remainingSeconds = qrExpiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(qrExpiresAt).getTime() - currentTime) / 1000
        )
      )
    : 0;

  async function initializeDashboard() {
    setLoading(true);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      setLoading(false);
      return;
    }

    setUser(user);
    await fetchEvents(user.id);
    setLoading(false);
  }

  // Fetch organizer events
  async function fetchEvents(userId) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("created_by", userId)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Fetch events error:", error);
      alert(error.message);
      return;
    }

    setEvents(data || []);
    await fetchRegistrationCounts(data || []);
  }

  // Fetch registration counts
  async function fetchRegistrationCounts(eventList) {
    if (!eventList.length) {
      setRegistrationCounts({});
      return;
    }

    const eventIds = eventList.map((event) => event.id);

    const { data, error } = await supabase
      .from("registrations")
      .select("event_id, status")
      .in("event_id", eventIds);

    if (error) {
      console.error("Registration count error:", error);
      return;
    }

    const counts = {};

    eventIds.forEach((id) => {
      counts[id] = 0;
    });

    (data || []).forEach((registration) => {
      if (registration.status === "registered") {
        counts[registration.event_id] =
          (counts[registration.event_id] || 0) + 1;
      }
    });

    setRegistrationCounts(counts);
  }

  // Fetch participants
  async function fetchParticipants(event) {
    setSelectedEvent(event);
    setParticipants([]);
    setParticipantsLoading(true);
    setActiveTab("participants");

    const { data, error } = await supabase
      .from("registrations")
      .select(`
        id,
        full_name,
        college_email,
        roll_number,
        branch,
        academic_year,
        mobile_number,
        status,
        created_at
      `)
      .eq("event_id", event.id)
      .eq("status", "registered")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Participants fetch error:", error);
      alert(error.message);
    } else {
      setParticipants(data || []);
    }

    setParticipantsLoading(false);
  }

  // Fetch attendance
  async function fetchAttendance(event) {
    setSelectedEvent(event);
    setAttendanceRows([]);
    setAttendanceLoading(true);
    setQrPayload(null);
    setQrExpiresAt(null);
    setActiveTab("attendance");

    try {
      const { data: registrations, error } = await supabase
        .from("registrations")
        .select(`
          id,
          full_name,
          college_email,
          roll_number,
          branch,
          academic_year
        `)
        .eq("event_id", event.id)
        .eq("status", "registered");

      if (error) throw error;

      if (!registrations?.length) {
        setAttendanceRows([]);
        return;
      }

      const registrationIds = registrations.map(
        (student) => student.id
      );

      const { data: attendance, error: attendanceError } =
        await supabase
          .from("attendance")
          .select("*")
          .in("registration_id", registrationIds);

      if (attendanceError) throw attendanceError;

      const attendanceMap = {};

      (attendance || []).forEach((record) => {
        attendanceMap[record.registration_id] = record;
      });

      setAttendanceRows(
        registrations.map((student) => ({
          ...student,
          attendance: attendanceMap[student.id] || null,
        }))
      );
    } catch (error) {
      console.error("Attendance fetch error:", error);
      alert(error.message);
    } finally {
      setAttendanceLoading(false);
    }
  }

  // Generate attendance QR
 
async function generateAttendanceQR() {
  if (!selectedEvent) return;

  setQrLoading(true);

  try {
    // Get current logged-in session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session?.access_token) {
      throw new Error("Login session expired. Please login again.");
    }

    // Invoke actual deployed function slug
    const { data, error } = await supabase.functions.invoke(
      "smooth-processor",
      {
        body: {
          event_id: selectedEvent.id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (error) {
      console.error("Edge Function error:", error);
      throw error;
    }

    if (!data?.success || !data?.qr_payload) {
      throw new Error(data?.error || data?.message || "QR generation failed");
    }

    setQrPayload(data.qr_payload);
    setQrExpiresAt(data.expires_at);
    setCurrentTime(Date.now());

    alert("Attendance QR generated successfully!");

  } catch (error) {
    console.error("QR generation error:", error);
    alert(error.message || "Unable to generate QR");
  } finally {
    setQrLoading(false);
  }
}


  // Manual attendance
 

  // Manual attendance
  async function markManualAttendance(student, status) {
    if (!selectedEvent || !student?.id) {
      alert("Event or student information missing.");
      return;
    }

    if (!["present", "absent"].includes(status)) {
      alert("Invalid attendance status.");
      return;
    }

    setAttendanceUpdating(student.id);

    try {
      // Get current authenticated session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token) {
        throw new Error("Login session expired. Please login again.");
      }

      // Call deployed manual attendance Edge Function
      const { data, error } = await supabase.functions.invoke(
        "quick-api",
        {
          body: {
            event_id: selectedEvent.id,
            registration_id: student.id,
            status: status,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        console.error("Manual attendance function error:", error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
          data?.message ||
          "Unable to update attendance."
        );
      }

      // Refresh attendance records from database
      await fetchAttendanceRecords(selectedEvent.id);

      alert(
        `${student.full_name} marked ${status.toUpperCase()} successfully!`
      );

    } catch (error) {
      console.error("Manual attendance error:", error);

      alert(
        error.message ||
        "Something went wrong while marking attendance."
      );

    } finally {
      setAttendanceUpdating(null);
    }
  }


  // Refresh attendance records
  async function fetchAttendanceRecords(eventId) {
    const { data: registrations, error } = await supabase
      .from("registrations")
      .select(`
        id,
        full_name,
        college_email,
        roll_number,
        branch,
        academic_year
      `)
      .eq("event_id", eventId)
      .eq("status", "registered");

    if (error) throw error;

    const ids = (registrations || []).map((item) => item.id);

    if (!ids.length) {
      setAttendanceRows([]);
      return;
    }

    const { data: attendance, error: attendanceError } =
      await supabase
        .from("attendance")
        .select("*")
        .in("registration_id", ids);

    if (attendanceError) throw attendanceError;

    const attendanceMap = {};

    (attendance || []).forEach((record) => {
      attendanceMap[record.registration_id] = record;
    });

    setAttendanceRows(
      registrations.map((student) => ({
        ...student,
        attendance: attendanceMap[student.id] || null,
      }))
    );
  }

  // Form handlers
  function updateField(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleYearChange(year) {
    setForm((previous) => ({
      ...previous,
      eligibleYears: previous.eligibleYears.includes(year)
        ? previous.eligibleYears.filter((item) => item !== year)
        : [...previous.eligibleYears, year],
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  // Switch to Student mode
  async function handleBackToWebsite() {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ active_mode: "student" })
      .eq("id", user.id);

    if (error) {
      alert("Unable to switch to Student mode: " + error.message);
      return;
    }

    navigate("/");
  }

  // Create / Update event
  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.eligibleYears.length) {
      alert("Please select at least one eligible year.");
      return;
    }

    if (!user) {
      alert("Please login first.");
      return;
    }

    setSaving(true);

    try {
      const eventData = {
        title: form.title,
        category: form.category,
        venue: form.venue,
        event_date: new Date(form.eventDate).toISOString(),
        description: form.description,
        eligible_years: form.eligibleYears,
      };

      let error;

      if (editingId) {
        ({ error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingId)
          .eq("created_by", user.id));
      } else {
        ({ error } = await supabase
          .from("events")
          .insert([
            {
              ...eventData,
              created_by: user.id,
            },
          ]));
      }

      if (error) throw error;

      alert(
        editingId
          ? "Event updated successfully!"
          : "Event created successfully!"
      );

      resetForm();
      await fetchEvents(user.id);
      setActiveTab("manage");
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  // Edit event
  function handleEdit(event) {
    setEditingId(event.id);

    setForm({
      title: event.title || "",
      category: event.category || "Technical",
      venue: event.venue || "",
      eventDate: event.event_date
        ? new Date(event.event_date).toISOString().slice(0, 16)
        : "",
      description: event.description || "",
      eligibleYears: event.eligible_years || [],
    });

    setActiveTab("create");
  }

  // Delete event
  async function handleDelete(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this event?"
    );

    if (!confirmDelete) return;

    const { data, error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id)
      .select();

    if (error) {
      alert(error.message);
      console.error("Delete error:", error);
      return;
    }

    if (!data || data.length === 0) {
      alert("Event was not deleted. Check your RLS DELETE policy.");
      return;
    }

    setEvents((previous) =>
      previous.filter((event) => event.id !== id)
    );

    setRegistrationCounts((previous) => {
      const updated = { ...previous };
      delete updated[id];
      return updated;
    });

    alert("Event deleted successfully!");
  }

  const upcomingEvents = events.filter(
    (event) => new Date(event.event_date) >= new Date()
  );

  const totalRegistrations = Object.values(registrationCounts).reduce(
    (total, count) => total + count,
    0
  );

  const presentCount = attendanceRows.filter(
    (student) => student.attendance?.status === "present"
  ).length;

  const absentCount = attendanceRows.filter(
    (student) => student.attendance?.status === "absent"
  ).length;

  if (loading) {
    return (
      <div className="dashboard-loading">
        Loading Dashboard...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-loading">
        <h2>Please login first</h2>
        <a href="/login">Go to Login</a>
      </div>
    );
  }

  return (
    <div className="organizer-dashboard">

      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">

        <div className="dashboard-logo">
          <span>I</span>
          IET Events
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <button
          className={
            activeTab === "overview"
              ? "sidebar-link active"
              : "sidebar-link"
          }
          onClick={() => setActiveTab("overview")}
        >
          <span>▦</span> Overview
        </button>

        <button
          className={
            activeTab === "create"
              ? "sidebar-link active"
              : "sidebar-link"
          }
          onClick={() => {
            resetForm();
            setActiveTab("create");
          }}
        >
          <span>＋</span> Create Event
        </button>

        <button
          className={
            activeTab === "manage"
              ? "sidebar-link active"
              : "sidebar-link"
          }
          onClick={() => setActiveTab("manage")}
        >
          <span>▤</span> Manage Events
        </button>

        <button
          className={
            activeTab === "attendance"
              ? "sidebar-link active"
              : "sidebar-link"
          }
          onClick={() => {
            setSelectedEvent(null);
            setQrPayload(null);
            setQrExpiresAt(null);
            setActiveTab("attendance");
          }}
        >
          <span>▣</span> Attendance
        </button>

        <div className="sidebar-bottom">

          <div className="organizer-mini-profile">
            <div className="mini-avatar">
              {user.email?.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>Organizer</strong>
              <small>{user.email}</small>
            </div>
          </div>

          <button
            className="back-home"
            onClick={handleBackToWebsite}
          >
            ← Back to Website
          </button>

        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">

        <header className="dashboard-topbar">

          <div>
            <p className="dashboard-eyebrow">
              IET EVENTS / ORGANIZER
            </p>

            <h1>
              {activeTab === "overview" && "Dashboard Overview"}
              {activeTab === "create" &&
                (editingId ? "Edit Event" : "Create New Event")}
              {activeTab === "manage" && "Manage Events"}
              {activeTab === "participants" && "Event Participants"}
              {activeTab === "attendance" && "Attendance Management"}
            </h1>
          </div>

          <button
            className="dashboard-create-btn"
            onClick={() => {
              resetForm();
              setActiveTab("create");
            }}
          >
            + Create Event
          </button>

        </header>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <section>

            <div className="welcome-banner">
              <div>
                <h2>Welcome, Organizer 👋</h2>
                <p>Manage your campus events from one place.</p>
              </div>

              <span className="welcome-icon">✦</span>
            </div>

            <div className="stats-grid">

              <div className="stat-card">
                <span>Total Events</span>
                <h2>{events.length}</h2>
                <small>Events you have created</small>
              </div>

              <div className="stat-card">
                <span>Upcoming Events</span>
                <h2>{upcomingEvents.length}</h2>
                <small>Scheduled for the future</small>
              </div>

              <div className="stat-card">
                <span>Past Events</span>
                <h2>{events.length - upcomingEvents.length}</h2>
                <small>Completed events</small>
              </div>

              <div className="stat-card">
                <span>Total Registrations</span>
                <h2>{totalRegistrations}</h2>
                <small>Registered students</small>
              </div>

            </div>

            <div className="dashboard-section">

              <div className="section-heading">
                <div>
                  <h2>Recent Events</h2>
                  <p>Your latest event activities</p>
                </div>

                <button onClick={() => setActiveTab("manage")}>
                  View All →
                </button>
              </div>

              <EventList
                events={events.slice(0, 5)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                registrationCounts={registrationCounts}
                onViewParticipants={fetchParticipants}
                onManageAttendance={fetchAttendance}
              />

            </div>
          </section>
        )}

        {/* CREATE / EDIT EVENT */}
        {activeTab === "create" && (
          <section className="dashboard-section">

            <div className="form-heading">
              <h2>
                {editingId ? "Update Event Details" : "Event Information"}
              </h2>
              <p>Fill in the details to publish your campus event.</p>
            </div>

            <form className="event-form" onSubmit={handleSubmit}>

              <label>
                Event Title *
                <input
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  placeholder="e.g. IET Coding Contest"
                  required
                />
              </label>

              <div className="form-row">

                <label>
                  Category *
                  <select
                    name="category"
                    value={form.category}
                    onChange={updateField}
                  >
                    <option>Technical</option>
                    <option>Cultural</option>
                    <option>Competition</option>
                    <option>Sports</option>
                  </select>
                </label>

                <label>
                  Venue *
                  <input
                    name="venue"
                    value={form.venue}
                    onChange={updateField}
                    placeholder="Event venue"
                    required
                  />
                </label>

              </div>

              <label>
                Event Date & Time *
                <input
                  type="datetime-local"
                  name="eventDate"
                  value={form.eventDate}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  placeholder="Describe your event..."
                  rows={5}
                />
              </label>

              <fieldset className="eligible-years">
                <legend>Eligible Years *</legend>

                <div className="year-checkboxes">
                  {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(
                    (year) => (
                      <label key={year}>
                        <input
                          type="checkbox"
                          checked={form.eligibleYears.includes(year)}
                          onChange={() => handleYearChange(year)}
                        />
                        {year}
                      </label>
                    )
                  )}
                </div>
              </fieldset>

              <div className="form-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={resetForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="dashboard-create-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Event"
                    : "Publish Event"}
                </button>

              </div>
            </form>
          </section>
        )}

        {/* MANAGE EVENTS */}
        {activeTab === "manage" && (
          <section className="dashboard-section">

            <div className="section-heading">
              <div>
                <h2>All Your Events</h2>
                <p>{events.length} events found</p>
              </div>
            </div>

            <EventList
              events={events}
              onEdit={handleEdit}
              onDelete={handleDelete}
              registrationCounts={registrationCounts}
              onViewParticipants={fetchParticipants}
              onManageAttendance={fetchAttendance}
            />

          </section>
        )}

        {/* PARTICIPANTS */}
        {activeTab === "participants" && (
          <section className="dashboard-section">

            <div className="section-heading">
              <div>
                <h2>{selectedEvent?.title || "Participants"}</h2>
                <p>{participants.length} registered students</p>
              </div>

              <button onClick={() => setActiveTab("manage")}>
                ← Back to Events
              </button>
            </div>

            {participantsLoading ? (
              <div className="empty-events">
                Loading participants...
              </div>
            ) : participants.length === 0 ? (
              <div className="empty-events">
                <span>👥</span>
                <h3>No registrations yet</h3>
                <p>Students who register will appear here.</p>
              </div>
            ) : (
              <div className="participants-table-wrapper">

                <table className="participants-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                      <th>Branch</th>
                      <th>Year</th>
                      <th>College Email</th>
                      <th>Mobile</th>
                      <th>Registered On</th>
                    </tr>
                  </thead>

                  <tbody>
                    {participants.map((student, index) => (
                      <tr key={student.id}>
                        <td>{index + 1}</td>
                        <td>{student.full_name}</td>
                        <td>{student.roll_number}</td>
                        <td>{student.branch}</td>
                        <td>{student.academic_year}</td>
                        <td>{student.college_email}</td>
                        <td>{student.mobile_number}</td>
                        <td>
                          {student.created_at
                            ? new Date(
                                student.created_at
                              ).toLocaleDateString("en-IN")
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              </div>
            )}
          </section>
        )}

        {/* ATTENDANCE MANAGEMENT */}
        {activeTab === "attendance" && (
          <section className="dashboard-section attendance-section">

            {!selectedEvent ? (
              <>
                <div className="section-heading">
                  <div>
                    <h2>Select Event</h2>
                    <p>Choose an event to manage attendance.</p>
                  </div>
                </div>

                {events.length === 0 ? (
                  <div className="empty-events">
                    <h3>No events available</h3>
                    <p>Create an event first.</p>
                  </div>
                ) : (
                  <div className="attendance-event-list">

                    {events.map((event) => (
                      <div
                        className="attendance-event-card"
                        key={event.id}
                      >
                        <div>
                          <strong>{event.title}</strong>
                          <p>{event.category} · {event.venue}</p>
                        </div>

                        <button
                          className="dashboard-create-btn"
                          onClick={() => fetchAttendance(event)}
                        >
                          Manage Attendance →
                        </button>
                      </div>
                    ))}

                  </div>
                )}
              </>
            ) : (
              <>

                <div className="section-heading">
                  <div>
                    <h2>{selectedEvent.title}</h2>
                    <p>
                      {selectedEvent.venue} ·{" "}
                      {new Date(
                        selectedEvent.event_date
                      ).toLocaleDateString("en-IN")}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedEvent(null);
                      setQrPayload(null);
                      setQrExpiresAt(null);
                    }}
                  >
                    ← All Events
                  </button>
                </div>

                {/* STATS */}
                <div className="attendance-stats">

                  <div className="attendance-stat-card">
                    <span>Total Students</span>
                    <h2>{attendanceRows.length}</h2>
                  </div>

                  <div className="attendance-stat-card">
                    <span>Present</span>
                    <h2 className="present-count">{presentCount}</h2>
                  </div>

                  <div className="attendance-stat-card">
                    <span>Absent</span>
                    <h2 className="absent-count">{absentCount}</h2>
                  </div>

                </div>

                {/* QR CODE */}
                <div className="qr-attendance-card">

                  <div>
                    <h3>QR Code Attendance</h3>
                    <p>
                      Generate a secure QR code for students.
                      Session validity is controlled by the backend.
                    </p>
                  </div>

                  {!qrPayload || remainingSeconds === 0 ? (
                    <button
                      className="dashboard-create-btn"
                      onClick={generateAttendanceQR}
                      disabled={qrLoading}
                    >
                      {qrLoading
                        ? "Generating..."
                        : "＋ Generate QR Code"}
                    </button>
                  ) : (
                    <div className="generated-qr">

                      <QRCodeSVG
                        value={
                          typeof qrPayload === "string"
                            ? qrPayload
                            : JSON.stringify(qrPayload)
                        }
                        size={220}
                        level="H"
                        includeMargin
                      />

                      <h3>Scan to Mark Attendance</h3>

                      <p>
                        QR expires in{" "}
                        <strong>
                          {Math.floor(remainingSeconds / 60)}:
                          {String(remainingSeconds % 60).padStart(2, "0")}
                        </strong>
                      </p>

                      <span className="qr-active-label">
                        ● QR Active
                      </span>

                      <button
                        className="dashboard-create-btn"
                        onClick={generateAttendanceQR}
                        disabled={qrLoading}
                      >
                        {qrLoading ? "Generating..." : "Regenerate QR"}
                      </button>

                    </div>
                  )}

                  {qrPayload && remainingSeconds === 0 && (
                    <p className="qr-expired-message">
                      QR Code expired. Generate a new QR code.
                    </p>
                  )}

                </div>

                {/* STUDENT ATTENDANCE RECORDS */}
                <div className="attendance-records">

                  <div className="section-heading">
                    <div>
                      <h3>Student Attendance</h3>
                      <p>Check and manually mark attendance.</p>
                    </div>

                    <button
                      onClick={() => fetchAttendance(selectedEvent)}
                    >
                      ↻ Refresh
                    </button>
                  </div>

                  {attendanceLoading ? (
                    <div className="empty-events">
                      Loading attendance...
                    </div>
                  ) : attendanceRows.length === 0 ? (
                    <div className="empty-events">
                      <h3>No registrations found</h3>
                      <p>Registered students will appear here.</p>
                    </div>
                  ) : (
                    <div className="participants-table-wrapper">

                      <table className="participants-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Student</th>
                            <th>Roll Number</th>
                            <th>Branch</th>
                            <th>Year</th>
                            <th>Attendance</th>
                            <th>Marked Via</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {attendanceRows.map((student, index) => (
                            <tr key={student.id}>

                              <td>{index + 1}</td>

                              <td>
                                <strong>{student.full_name}</strong>
                                <br />
                                <small>{student.college_email}</small>
                              </td>

                              <td>{student.roll_number || "-"}</td>
                              <td>{student.branch || "-"}</td>
                              <td>{student.academic_year || "-"}</td>

                              <td>
                                <span
                                  className={`attendance-status ${
                                    student.attendance?.status || "unmarked"
                                  }`}
                                >
                                  {student.attendance?.status || "Not Marked"}
                                </span>
                              </td>

                              <td>
                                {student.attendance?.marked_via || "-"}
                              </td>

                              <td>
                                <div className="attendance-action-buttons">

                                  <button
                                    className="mark-present-btn"
                                    disabled={
                                      attendanceUpdating === student.id ||
                                      student.attendance?.status === "present"
                                    }
                                    onClick={() =>
                                      markManualAttendance(
                                        student,
                                        "present"
                                      )
                                    }
                                  >
                                    {attendanceUpdating === student.id
                                      ? "Saving..."
                                      : "Present"}
                                  </button>

                                  <button
                                    className="mark-absent-btn"
                                    disabled={
                                      attendanceUpdating === student.id ||
                                      student.attendance?.status === "absent"
                                    }
                                    onClick={() =>
                                      markManualAttendance(
                                        student,
                                        "absent"
                                      )
                                    }
                                  >
                                    Absent
                                  </button>

                                </div>
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>

                    </div>
                  )}

                </div>

              </>
            )}

          </section>
        )}

      </main>
    </div>
  );
}

// EVENT LIST COMPONENT
function EventList({
  events,
  onEdit,
  onDelete,
  registrationCounts,
  onViewParticipants,
  onManageAttendance,
}) {
  if (!events.length) {
    return (
      <div className="empty-events">
        <span>📅</span>
        <h3>No events yet</h3>
        <p>Your created events will appear here.</p>
      </div>
    );
  }

  return (
    <div className="events-list">

      {events.map((event) => (
        <div className="event-row" key={event.id}>

          <div className="event-date-icon">
            {new Date(event.event_date).getDate()}

            <small>
              {new Date(event.event_date).toLocaleString("en", {
                month: "short",
              })}
            </small>
          </div>

          <div className="event-info">
            <h3>{event.title}</h3>
            <p>{event.category} · {event.venue}</p>
          </div>

          <div className="event-registration-count">
            <strong>{registrationCounts[event.id] || 0}</strong>
            <small>Registrations</small>
          </div>

          <span className="event-status">
            {new Date(event.event_date) >= new Date()
              ? "Upcoming"
              : "Past"}
          </span>

          <div className="event-actions">

            <button
              className="view-participants-btn"
              onClick={() => onViewParticipants(event)}
              title="View Participants"
            >
              View Students →
            </button>

            <button
              className="attendance-action-btn"
              onClick={() => onManageAttendance(event)}
              title="Manage Attendance"
            >
              Attendance →
            </button>

            <button
              onClick={() => onEdit(event)}
              title="Edit"
            >
              ✎
            </button>

            <button
              className="delete-action"
              onClick={() => onDelete(event.id)}
              title="Delete"
            >
              🗑
            </button>

          </div>
        </div>
      ))}

    </div>
  );
}

export default OrganizerDashboard;
