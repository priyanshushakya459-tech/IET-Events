
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./Registration.css";

const initialForm = {
  full_name: "",
  college_email: "",
  course: "B.Tech",
  branch: "",
  academic_year: "",
  roll_number: "",
  mobile_number: "",
};

const branches = [
  "Computer Science Engineering",
  "CSE (Self Finance)",
  "CSE (AI)",
  "Electronics and Communication Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Other",
];

const academicYears = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

// EVENT STATUS
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

function Registration() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // EVENT STATUS
  const eventStatus = getEventStatus(event?.event_date);

  const registrationClosed =
    eventStatus === "completed" ||
    eventStatus === "unknown";

  // LOAD REGISTRATION DATA
  useEffect(() => {
    let active = true;

    async function loadRegistrationData() {
      try {
        setLoading(true);
        setMessage("");

        // AUTHENTICATION
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          navigate("/login", {
            state: {
              from: `/events/${id}/register`,
            },
            replace: true,
          });
          return;
        }

        // FETCH EVENT
        const { data: eventData, error: eventError } =
          await supabase
            .from("events")
            .select(
              "id, title, description, event_date, venue, eligible_years"
            )
            .eq("id", id)
            .single();

        if (eventError) throw eventError;

        // FETCH STUDENT PROFILE
        const { data: studentProfile, error: profileError } =
          await supabase
            .from("profiles")
            .select(
              "full_name, college_email, course, branch, academic_year, roll_number, mobile_number"
            )
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        if (!studentProfile) {
          throw new Error(
            "Student profile not found. Please complete your profile first."
          );
        }

        // CHECK EXISTING REGISTRATION
        const {
          data: existingRegistration,
          error: registrationError,
        } = await supabase
          .from("registrations")
          .select("id, status")
          .eq("event_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (registrationError) throw registrationError;

        if (!active) return;

        setUser(user);
        setEvent(eventData);

        if (existingRegistration?.status === "registered") {
          setAlreadyRegistered(true);
        }

        // PREFILL FORM FROM PROFILE
        const metadataName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "";

        setForm({
          full_name: studentProfile.full_name || metadataName,
          college_email: studentProfile.college_email || "",
          course: studentProfile.course || "B.Tech",
          branch: studentProfile.branch || "",
          academic_year: studentProfile.academic_year || "",
          roll_number: studentProfile.roll_number || "",
          mobile_number: studentProfile.mobile_number || "",
        });

      } catch (error) {
        console.error("Registration loading error:", error);

        if (active) {
          setMessage(
            error.message || "Unable to load registration details."
          );
          setMessageType("error");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRegistrationData();

    return () => {
      active = false;
    };
  }, [id, navigate]);

  // HANDLE INPUT CHANGE
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
  };

  // EVENT ELIGIBILITY
  const allowedYears = Array.isArray(event?.eligible_years)
    ? event.eligible_years
    : [];

  const isEligible = allowedYears.includes(form.academic_year);

  // HANDLE REGISTRATION
  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    // CHECK EVENT DATE
    if (registrationClosed) {
      setMessage(
        "Registration is closed for this event."
      );
      setMessageType("error");
      return;
    }

    if (!user) {
      setMessage("Please login before registering.");
      setMessageType("error");
      return;
    }

    if (!isEligible) {
      setMessage("You are not eligible for this event.");
      setMessageType("error");
      return;
    }

    if (!form.full_name.trim()) {
      setMessage("Please enter your full name.");
      setMessageType("error");
      return;
    }

    if (!form.college_email.trim()) {
      setMessage("Please enter your college email.");
      setMessageType("error");
      return;
    }

    if (!/^[0-9]{10}$/.test(form.mobile_number.trim())) {
      setMessage("Mobile number must contain exactly 10 digits.");
      setMessageType("error");
      return;
    }

    if (!form.roll_number.trim()) {
      setMessage("Please enter your roll number.");
      setMessageType("error");
      return;
    }

    if (!form.branch || !form.academic_year) {
      setMessage("Please complete your academic details.");
      setMessageType("error");
      return;
    }

    try {
      setSubmitting(true);

      // RECHECK AUTHENTICATED USER
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!currentUser || currentUser.id !== user.id) {
        throw new Error(
          "Your login session has expired. Please login again."
        );
      }

      // RECHECK LATEST EVENT DATA
      const { data: latestEvent, error: eventError } =
        await supabase
          .from("events")
          .select("eligible_years, event_date")
          .eq("id", id)
          .single();

      if (eventError) throw eventError;

      // CHECK LATEST EVENT DATE
      const latestStatus = getEventStatus(
        latestEvent?.event_date
      );

      if (
        latestStatus !== "upcoming" &&
        latestStatus !== "today"
      ) {
        throw new Error(
          "Registration is closed. This event has expired."
        );
      }

      // RECHECK ELIGIBILITY
      const latestAllowedYears = Array.isArray(
        latestEvent?.eligible_years
      )
        ? latestEvent.eligible_years
        : [];

      if (!latestAllowedYears.includes(form.academic_year)) {
        throw new Error(
          "You are not eligible for this event."
        );
      }

      // PREPARE REGISTRATION DATA
      const registrationData = {
        event_id: event.id,
        user_id: currentUser.id,
        full_name: form.full_name.trim(),
        college_email: form.college_email.trim().toLowerCase(),
        course: form.course,
        branch: form.branch,
        academic_year: form.academic_year,
        roll_number: form.roll_number.trim(),
        mobile_number: form.mobile_number.trim(),
      };

      // INSERT REGISTRATION
      const { error } = await supabase
        .from("registrations")
        .insert([registrationData]);

      if (error) {
        if (error.code === "23505") {
          setAlreadyRegistered(true);
          throw new Error(
            "You have already registered for this event."
          );
        }

        throw error;
      }

      setMessage(
        "Registration successful! You are registered for this event."
      );

      setMessageType("success");
      setAlreadyRegistered(true);

    } catch (error) {
      console.error("Registration error:", error);

      setMessage(
        error.message || "Something went wrong. Please try again."
      );

      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  // LOADING SCREEN
  if (loading) {
    return (
      <div className="registration-loading">
        <div className="registration-spinner"></div>
        <p>Loading registration form...</p>
      </div>
    );
  }

  // EVENT NOT FOUND
  if (!event) {
    return (
      <div className="registration-page">
        <div className="registration-card">
          <h2>Event Not Found</h2>
          <p>
            {message || "This event may have been removed."}
          </p>

          <Link to="/" className="registration-back">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // MAIN UI
  return (
    <main className="registration-page">
      <div className="registration-container">

        <Link
          to={`/events/${event.id}`}
          className="registration-back"
        >
          ← Back to Event Details
        </Link>

        {/* HEADER */}
        <div className="registration-header">
          <span className="registration-eyebrow">
            IET EVENTS
          </span>

          <h1>Event Registration</h1>

          <p>
            Complete your details to secure your place at this event.
          </p>
        </div>

        {/* EVENT DETAILS */}
        <div className="registration-event">
          <div>
            <span className="registration-event-label">
              REGISTERING FOR
            </span>

            <h2>{event.title}</h2>

            <p>
              📍 {event.venue || "Venue to be announced"}
            </p>

            <p>
              📅{" "}
              {event.event_date
                ? new Date(
                    `${String(event.event_date).slice(0, 10)}T00:00:00`
                  ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Date to be announced"}
            </p>
          </div>
        </div>

        {/* EXPIRED OR DATE UNAVAILABLE */}
        {registrationClosed ? (
          <div className="registration-card">
            <div className="registration-success-icon">
              !
            </div>

            <h2>Registration Closed</h2>

            <p>
              {eventStatus === "completed"
                ? "This event has expired. You can no longer register."
                : "Event date is not available. Registration cannot proceed."}
            </p>

            <Link to="/" className="registration-back">
              Back to Events
            </Link>
          </div>

        ) : alreadyRegistered ? (

          /* ALREADY REGISTERED */
          <div className="registration-card">
            <div className="registration-success-icon">
              ✓
            </div>

            <h2>Already Registered!</h2>

            <p>
              You already have an active registration for this event.
            </p>

            <button
              type="button"
              className="registration-submit"
              onClick={() => navigate("/my-registrations")}
            >
              View My Registrations
            </button>
          </div>

        ) : (

          /* REGISTRATION FORM */
          <form
            className="registration-form"
            onSubmit={handleSubmit}
          >
            <div className="registration-form-heading">
              <h2>Student Information</h2>

              <p>
                Your saved profile details are automatically filled below.
              </p>
            </div>

            <div className="registration-grid">

              {/* FULL NAME */}
              <label>
                Full Name *

                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  maxLength={100}
                />
              </label>

              {/* COLLEGE EMAIL */}
              <label>
                College Email ID *

                <input
                  type="email"
                  name="college_email"
                  value={form.college_email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  maxLength={255}
                />
              </label>

              {/* COURSE */}
              <label>
                Course *

                <select
                  name="course"
                  value={form.course}
                  onChange={handleChange}
                  required
                >
                  <option value="B.Tech">B.Tech</option>
                  <option value="M.Tech">M.Tech</option>
                  <option value="MBA">MBA</option>
                  <option value="MCA">MCA</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              {/* BRANCH */}
              <label>
                Branch *

                <select
                  name="branch"
                  value={form.branch}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select Your Branch
                  </option>

                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </label>

              {/* ACADEMIC YEAR */}
              <label>
                Academic Year *

                <select
                  name="academic_year"
                  value={form.academic_year}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select your year
                  </option>

                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              {/* ROLL NUMBER */}
              <label>
                Roll Number *

                <input
                  type="text"
                  name="roll_number"
                  value={form.roll_number}
                  onChange={handleChange}
                  placeholder="Enter your roll number"
                  required
                  maxLength={30}
                />
              </label>

              {/* MOBILE NUMBER */}
              <label className="registration-full-width">
                Mobile Number *

                <input
                  type="tel"
                  name="mobile_number"
                  value={form.mobile_number}
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);

                    setForm((prev) => ({
                      ...prev,
                      mobile_number: value,
                    }));
                  }}
                  placeholder="Enter 10-digit mobile number"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                />
              </label>

            </div>

            {/* EVENT ELIGIBILITY */}
            <div className="registration-eligibility">
              <h3>Event Eligibility</h3>

              <p>
                Allowed Years:{" "}
                {allowedYears.length > 0
                  ? allowedYears.join(", ")
                  : "Not specified"}
              </p>

              {form.academic_year && (
                <p
                  className={
                    isEligible
                      ? "eligibility-success"
                      : "eligibility-error"
                  }
                >
                  {isEligible
                    ? "✓ You are eligible for this event."
                    : "✕ Your academic year is not eligible for this event."}
                </p>
              )}
            </div>

            {/* MESSAGES */}
            {message && (
              <div
                className={`registration-message ${messageType}`}
                role="status"
              >
                {message}
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              className="registration-submit"
              disabled={
                submitting ||
                !isEligible ||
                !form.academic_year
              }
            >
              {submitting
                ? "Registering..."
                : "Confirm Registration"}
            </button>

            <p className="registration-note">
              Your details will be used only for event registration
              and related communication.
            </p>

          </form>
        )}

      </div>
    </main>
  );
}

export default Registration;
