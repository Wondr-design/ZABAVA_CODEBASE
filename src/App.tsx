import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import PartnerDashboard from "./pages/PartnerDashboardLight";
import Signup from "./pages/Signup";
import AdminRoute from "./components/AdminRoute";
import InviteManager from "./pages/admin/InviteManager";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboardLight";
import RewardsManagement from "./pages/admin/RewardsManagement";
import BonusPage from "./pages/BonusPage";
import { NotificationProvider } from "./contexts/NotificationContext";

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <Routes>
          {/* Redirect root to /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <PartnerDashboard />
              </PrivateRoute>
            }
          />
          {/* Public bonus page - no authentication required */}
          <Route path="/bonus" element={<BonusPage />} />
        </Routes>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
