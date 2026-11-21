
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./Profile.css";

const initialProfile = {
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

const courses = ["B.Tech", "M.Tech", "MBA", "MCA", "Other"];

const academicYears = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [emailVerified, setEmailVerified] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  // FETCH PROFILE AND AUTH EMAIL
  const fetchProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please login first.");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      // If profile row does not exist, initialize an empty profile.
      const completed = Boolean(data?.profile_completed);

      setProfile({
        full_name:
          data?.full_name ||
          user.user_metadata?.full_name ||
          "",
        college_email: user.email || "",
        course: data?.course || "B.Tech",
        branch: data?.branch || "",
        academic_year: data?.academic_year || "",
        roll_number: data?.roll_number || "",
        mobile_number: data?.mobile_number || "",
      });

      const verified = Boolean(user.email_confirmed_at);

      setEmailVerified(verified);

      // First-time or incomplete profile
      setIsOnboarding(!completed);
      setEditing(!completed);

    } catch (error) {
      console.error("Profile error:", error);
      setMessage(error.message || "Unable to load profile.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // HANDLE INPUT CHANGE
  const handleChange = (e) => {
    const { name, value } = e.target;

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMessage("");
  };

  // SAVE PROFILE
  const handleSave = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    // Validate full name
    if (!profile.full_name.trim()) {
      setMessage("Full name is required.");
      setMessageType("error");
      return;
    }

    // Validate mobile number
    if (!/^[0-9]{10}$/.test(profile.mobile_number.trim())) {
      setMessage("Enter a valid 10-digit mobile number.");
      setMessageType("error");
      return;
    }

    // Validate roll number
    if (!profile.roll_number.trim()) {
      setMessage("Roll number is required.");
      setMessageType("error");
      return;
    }

    // Validate academic details
    if (!profile.branch || !profile.academic_year) {
      setMessage("Please complete your academic details.");
      setMessageType("error");
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please login again.");

      const verified = Boolean(user.email_confirmed_at);

      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,

            full_name: profile.full_name.trim(),

            // Keep email synchronized with Supabase Auth
            college_email: user.email,

            course: profile.course,
            branch: profile.branch,
            academic_year: profile.academic_year,
            roll_number: profile.roll_number.trim(),
            mobile_number: profile.mobile_number.trim(),

            // Email verification status
            college_email_verified: verified,
            college_email_verified_at:
              user.email_confirmed_at || null,

            // Mark profile as completed
            profile_completed: true,
          },
          { onConflict: "id" }
        );

      if (error) throw error;

      setEmailVerified(verified);
      setEditing(false);

      setMessageType("success");

      // First-time profile completion
      if (isOnboarding) {
        setIsOnboarding(false);
        setMessage("Profile completed successfully!");

        navigate("/select-role", { replace: true });
        return;
      }

      // Existing user editing profile
      setMessage("Profile updated successfully!");

      await fetchProfile();

    } catch (error) {
      console.error("Profile save error:", error);
      setMessage(error.message || "Unable to save profile.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  // CANCEL EDITING
  const handleCancel = async () => {
    if (isOnboarding) return;

    setEditing(false);
    setMessage("");

    await fetchProfile();
  };

  if (loading) {
    return (
      <div className="profile-loading">
        Loading your profile...
      </div>
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-container">

        {/* PROFILE HEADER */}
        <div className="profile-top">
          <div>
            <span className="profile-eyebrow">
              IET EVENTS
            </span>

            <h1>
              {isOnboarding
                ? "Complete Your Profile"
                : "My Profile"}
            </h1>

            <p>
              {isOnboarding
                ? "Please complete your personal and academic details to continue."
                : "Manage your personal and academic information."}
            </p>
          </div>

          {!editing ? (
            <button
              type="button"
              className="profile-edit-btn"
              onClick={() => {
                setEditing(true);
                setMessage("");
              }}
            >
              ✎ Edit Profile
            </button>
          ) : (
            !isOnboarding && (
              <button
                type="button"
                className="profile-edit-btn cancel"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel Editing
              </button>
            )
          )}
        </div>

        {/* ONBOARDING NOTICE */}
        {isOnboarding && (
          <div className="profile-message">
            Complete all required fields (*) to access IET Events.
          </div>
        )}

        {/* PROFILE CARD */}
        <div className="profile-card">
          <div className="profile-avatar">
            {profile.full_name
              ? profile.full_name.trim().charAt(0).toUpperCase()
              : "S"}
          </div>

          <div>
            <h2>{profile.full_name || "Student Name"}</h2>
            <p>{profile.college_email}</p>
            <span className="profile-tag">
              Student Account
            </span>
          </div>
        </div>

        {/* PERSONAL & ACADEMIC DETAILS */}
        <form className="profile-form" onSubmit={handleSave}>

          <div className="profile-section-heading">
            <h2>Personal & Academic Details</h2>
            <p>
              These details will automatically appear during event
              registration.
            </p>
          </div>

          <div className="profile-grid">

            {/* FULL NAME */}
            <label>
              Full Name *

              <input
                type="text"
                name="full_name"
                value={profile.full_name}
                onChange={handleChange}
                disabled={!editing}
                maxLength={100}
                required
              />
            </label>

            {/* COLLEGE EMAIL */}
            <label>
              College Email

              <input
                type="email"
                value={profile.college_email}
                readOnly
                disabled
              />

              <small>
                Linked to your Supabase login account.
              </small>
            </label>

            {/* ROLL NUMBER */}
            <label>
              Roll Number *

              <input
                type="text"
                name="roll_number"
                value={profile.roll_number}
                onChange={handleChange}
                disabled={!editing}
                maxLength={30}
                required
              />
            </label>

            {/* MOBILE NUMBER */}
            <label>
              Mobile Number *

              <input
                type="tel"
                name="mobile_number"
                value={profile.mobile_number}
                onChange={(e) => {
                  const value = e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10);

                  setProfile((prev) => ({
                    ...prev,
                    mobile_number: value,
                  }));

                  setMessage("");
                }}
                disabled={!editing}
                maxLength={10}
                required
              />
            </label>

            {/* COURSE */}
            <label>
              Course *

              <select
                name="course"
                value={profile.course}
                onChange={handleChange}
                disabled={!editing}
                required
              >
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </label>

            {/* BRANCH */}
            <label>
              Branch *

              <select
                name="branch"
                value={profile.branch}
                onChange={handleChange}
                disabled={!editing}
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
                value={profile.academic_year}
                onChange={handleChange}
                disabled={!editing}
                required
              >
                <option value="">
                  Select Year
                </option>

                {academicYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

          </div>

          {/* SUCCESS / ERROR MESSAGE */}
          {message && (
            <div
              className={`profile-message ${messageType}`}
              role="status"
            >
              {message}
            </div>
          )}

          {/* SAVE BUTTON */}
          {editing && (
            <button
              type="submit"
              className="profile-save-btn"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : isOnboarding
                  ? "Complete Profile"
                  : "Save Changes"}
            </button>
          )}

        </form>

        {/* COLLEGE EMAIL VERIFICATION */}
        <section className="email-verification-card">

          <div className="email-verification-heading">
            <div>
              <span className="profile-eyebrow">
                ACCOUNT SECURITY
              </span>

              <h2>College Email Verification</h2>

              <p>
                Your email verification is managed by Supabase Authentication.
              </p>
            </div>

            <span
              className={`email-verification-badge ${
                emailVerified ? "verified" : "unverified"
              }`}
            >
              {emailVerified
                ? "✓ Verified"
                : "Not Verified"}
            </span>
          </div>

          <div className="verification-email">
            <span>College Email Address</span>
            <strong>
              {profile.college_email || "No email found"}
            </strong>
          </div>

          {emailVerified ? (
            <div className="verification-success">
              <span>✓</span>
              Your college email has been verified successfully.
            </div>
          ) : (
            <div className="verification-pending">
              Please check your college inbox and click the
              Supabase confirmation link to verify your email.
            </div>
          )}

        </section>

        {/* REGISTERED EVENTS LINK */}
        {!isOnboarding && (
          <div className="profile-bottom-link">
            <Link to="/my-registrations">
              View My Registered Events →
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}

export default Profile;
