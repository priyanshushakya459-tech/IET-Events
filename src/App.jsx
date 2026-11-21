
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RoleSelection from "./pages/RoleSelection";

import OrganizerDashboard from "./pages/OrganizerDashboard";
import OrganizerApproval from "./pages/OrganizerApproval";

import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";

import Profile from "./pages/Profile";
import MyRegistrations from "./pages/MyRegistrations";
import MyAttendedEvents from "./pages/MyAttendedEvents";

import EventDetails from "./pages/EventDetails";
import Registration from "./pages/Registration";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Home Page */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* Authentication */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        {/* Role Selection */}
        <Route
          path="/select-role"
          element={<RoleSelection />}
        />

        {/* Organizer Approval Information */}
        <Route
          path="/organizer-approval"
          element={<OrganizerApproval />}
        />

        {/* Organizer Dashboard */}
        <Route
          path="/organizer"
          element={<OrganizerDashboard />}
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        {/* Admin Users */}
        <Route
          path="/admin/users"
          element={<AdminUsers />}
        />

        {/* User Profile */}
        <Route
          path="/profile"
          element={<Profile />}
        />

        {/* Registered Events */}
        <Route
          path="/my-registrations"
          element={<MyRegistrations />}
        />

        {/* Attended Events */}
        <Route
          path="/my-attended-events"
          element={<MyAttendedEvents />}
        />

        {/* Event Details */}
        <Route
          path="/events/:id"
          element={<EventDetails />}
        />

        {/* Event Registration */}
        <Route
          path="/events/:id/register"
          element={<Registration />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
