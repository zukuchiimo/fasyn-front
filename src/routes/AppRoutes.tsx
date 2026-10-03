import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Home from '../pages/Home/Home';
import Login from '../pages/Login/Login';
import Register from '../pages/Register/Register';

import Specialists from '../pages/Specialists/Specialists';
import SpecialistProfile from '../pages/SpecialistProfile/SpecialistProfile';

import ClientHistory from '../pages/client/History/ClientHistory';
import ClientFavorites from '../pages/client/Favorites/ClientFavorites';
import ClientProfile from '../pages/client/ClientProfile';
import MyRequests from '../pages/client/MyRequests/MyRequests';
import ClientDashboard from '../pages/ClientDashboard/ClientDashboard';

import SpecialistDashboard from '../pages/SpecialistDashboard/SpecialistDashboard';
import SpecialistSetup from '../pages/SpecialistSetup/SpecialistSetup';
import CreateService from '../pages/CreateService/CreateService';
import MyProfile from '../pages/MyProfile/MyProfile';
import SpecialistEarnings
  from '../pages/SpecialistEarnings/SpecialistEarnings';
import SpecialistRequestDetail
  from '../pages/SpecialistRequestDetail/SpecialistRequestDetail';
import SpecialistCertificates
  from '../pages/SpecialistCertificates/SpecialistCertificates';

import AdminDashboard from '../pages/AdminDashboard/AdminDashboard';
import AdminSpecialists from '../pages/admin/AdminSpecialists';
import AdminClients from '../pages/admin/AdminClients';
import AdminCategories from '../pages/admin/AdminCategories';
import AdminPayouts from '../pages/admin/AdminPayouts';
import AdminSpecialistCertificates
  from '../pages/AdminSpecialistCertificates/AdminSpecialistCertificates';

import PaymentSuccess from '../pages/payment/PaymentSuccess';
import VerifyEmail from '../pages/VerifyEmail/VerifyEmail';
import ForgotPassword
  from '../pages/ForgotPassword/ForgotPassword';

import ResetPassword
  from '../pages/ResetPassword/ResetPassword';
type UserRole =
  | 'CLIENT'
  | 'SPECIALIST'
  | 'ADMIN';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
};

const ProtectedRoute = ({
  children,
  allowedRoles,
}: ProtectedRouteProps) => {
  const token =
    localStorage.getItem('token');

  const storedUser =
    localStorage.getItem('user');

  if (!token || !storedUser) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  try {
    const user =
      JSON.parse(storedUser);

    if (
      allowedRoles &&
      !allowedRoles.includes(
        user.role
      )
    ) {
      return (
        <Navigate
          to="/"
          replace
        />
      );
    }

    return children;
  } catch (error) {
    console.error(
      'ERROR LEYENDO SESIÓN:',
      error
    );

    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'user'
    );

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }
};

const AppRoutes = () => {
  return (
    <BrowserRouter>

      <Routes>

        {/* =====================================
            PÚBLICO
        ====================================== */}

        <Route
          path="/"
          element={
            <Home />
          }
        />

        <Route
          path="/login"
          element={
            <Login />
          }
        />

        <Route
          path="/register"
          element={
            <Register />
          }
        />

        <Route
          path="/verify-email"
          element={
            <VerifyEmail />
          }
        />

        <Route
          path="/payment/success"
          element={
            <PaymentSuccess />
          }
        />
<Route
  path="/forgot-password"
  element={<ForgotPassword />}
/>

<Route
  path="/reset-password"
  element={<ResetPassword />}
/>

        {/* =====================================
            ESPECIALISTAS PÚBLICOS
        ====================================== */}

        <Route
          path="/specialists"
          element={
            <Specialists />
          }
        />

        <Route
          path="/specialists/:id"
          element={
            <SpecialistProfile />
          }
        />

        {/* =====================================
            PANEL ESPECIALISTA
        ====================================== */}

        <Route
          path="/specialist"
          element={
            <ProtectedRoute
              allowedRoles={[
                'SPECIALIST',
              ]}
            >
              <SpecialistDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/specialist/profile"
          element={
            <ProtectedRoute
              allowedRoles={[
                'SPECIALIST',
              ]}
            >
              <MyProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/specialist/earnings"
          element={
            <ProtectedRoute
              allowedRoles={[
                'SPECIALIST',
              ]}
            >
              <SpecialistEarnings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/specialist/setup"
          element={
            <ProtectedRoute
              allowedRoles={[
                'SPECIALIST',
              ]}
            >
              <SpecialistSetup />
            </ProtectedRoute>
          }
        />

        <Route
          path="/specialist/services/new"
          element={
            <ProtectedRoute
              allowedRoles={[
                'SPECIALIST',
              ]}
            >
              <CreateService />
            </ProtectedRoute>
          }
        />

        <Route
          path="/specialist/requests/:id"
          element={
            <ProtectedRoute
              allowedRoles={[
                'SPECIALIST',
              ]}
            >
              <SpecialistRequestDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/specialist/certificates"
          element={
            <ProtectedRoute
              allowedRoles={[
                'SPECIALIST',
              ]}
            >
              <SpecialistCertificates />
            </ProtectedRoute>
          }
        />

        {/* =====================================
            PANEL CLIENTE
        ====================================== */}

        <Route
          path="/client"
          element={
            <ProtectedRoute
              allowedRoles={[
                'CLIENT',
              ]}
            >
              <ClientDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/history"
          element={
            <ProtectedRoute
              allowedRoles={[
                'CLIENT',
              ]}
            >
              <ClientHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/profile"
          element={
            <ProtectedRoute
              allowedRoles={[
                'CLIENT',
              ]}
            >
              <ClientProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/requests"
          element={
            <ProtectedRoute
              allowedRoles={[
                'CLIENT',
              ]}
            >
              <MyRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/favorites"
          element={
            <ProtectedRoute
              allowedRoles={[
                'CLIENT',
              ]}
            >
              <ClientFavorites />
            </ProtectedRoute>
          }
        />

        {/* =====================================
            PANEL ADMINISTRADOR
        ====================================== */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
              ]}
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/specialists"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
              ]}
            >
              <AdminSpecialists />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/specialists/:specialistId/certificates"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
              ]}
            >
              <AdminSpecialistCertificates />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/payouts"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
              ]}
            >
              <AdminPayouts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/clients"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
              ]}
            >
              <AdminClients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute
              allowedRoles={[
                'ADMIN',
              ]}
            >
              <AdminCategories />
            </ProtectedRoute>
          }
        />

        {/* =====================================
            RUTA NO ENCONTRADA
        ====================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
};

export default AppRoutes;