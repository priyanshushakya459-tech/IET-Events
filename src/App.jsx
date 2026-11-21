
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminUsers from "./pages/AdminUsers";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import RoleSelection from "./pages/RoleSelection";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import MyRegistrations from "./pages/MyRegistrations";
import MyAttendedEvents from "./pages/MyAttendedEvents";
import EventDetails from "./pages/EventDetails";
import Registration from "./pages/Registration";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/select-role" element={<RoleSelection />} />

        <Route path="/organizer" element={<OrganizerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/my-registrations" element={<MyRegistrations />} />
        <Route path="/my-attended-events" element={<MyAttendedEvents />} />

        {/* Event Details */}
        <Route path="/events/:id" element={<EventDetails />} />

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
