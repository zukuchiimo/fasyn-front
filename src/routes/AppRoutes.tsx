import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom';

import Home from '../pages/Home/Home';
import Login from '../pages/Login/Login';
import Register from '../pages/Register/Register';

import Specialists from '../pages/Specialists/Specialists';
import SpecialistProfile from '../pages/SpecialistProfile/SpecialistProfile';
import ClientHistory from '../pages/client/History/ClientHistory';
import SpecialistDashboard from '../pages/SpecialistDashboard/SpecialistDashboard';
import SpecialistSetup from '../pages/SpecialistSetup/SpecialistSetup';
import CreateService from '../pages/CreateService/CreateService';
import MyProfile from '../pages/MyProfile/MyProfile';
import SpecialistEarnings
  from '../pages/SpecialistEarnings/SpecialistEarnings';
import AdminPayouts from '../pages/admin/AdminPayouts';
import PaymentSuccess from '../pages/payment/PaymentSuccess';
import ClientFavorites from '../pages/client/Favorites/ClientFavorites';
import VerifyEmail from '../pages/VerifyEmail/VerifyEmail';
import AdminSpecialistCertificates
  from '../pages/AdminSpecialistCertificates/AdminSpecialistCertificates';
/*
  NUEVA PANTALLA:
  DETALLE DE SOLICITUD DEL ESPECIALISTA
*/
import SpecialistRequestDetail
  from '../pages/SpecialistRequestDetail/SpecialistRequestDetail';

import ClientDashboard from '../pages/ClientDashboard/ClientDashboard';
import ClientProfile from '../pages/client/ClientProfile';
import MyRequests from '../pages/client/MyRequests/MyRequests';

import AdminDashboard from '../pages/AdminDashboard/AdminDashboard';
import AdminSpecialists from '../pages/admin/AdminSpecialists';
import AdminClients from '../pages/admin/AdminClients';
import AdminCategories from '../pages/admin/AdminCategories';
import SpecialistCertificates from '../pages/SpecialistCertificates/SpecialistCertificates';

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
          path="/verify-email"
          element={<VerifyEmail />}
        />
        <Route
          path="/register"
          element={
            <Register />
          }
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
          path="/admin/specialists"
          element={<AdminSpecialists />}
        />
        <Route
          path="/payment/success"
          element={<PaymentSuccess />}
        />
        <Route
          path="/specialists/:id"
          element={
            <SpecialistProfile />
          }
        />
        <Route
  path="/admin/specialists/:specialistId/certificates"
  element={
    <AdminSpecialistCertificates />
  }
/>

        {/* =====================================
            PANEL ESPECIALISTA
        ====================================== */}

        <Route
          path="/specialist"
          element={
            <SpecialistDashboard />
          }
        />

        <Route
          path="/specialist/profile"
          element={
            <MyProfile />
          }
        />
        <Route
          path="/specialist/earnings"
          element={<SpecialistEarnings />}
        />
        <Route
          path="/client/favorites"
          element={
            <ClientFavorites />
          }
        />
        <Route
          path="/specialist/setup"
          element={
            <SpecialistSetup />
          }
        />

        <Route
          path="/specialist/services/new"
          element={
            <CreateService />
          }
        />

        {/* DETALLE DE SOLICITUD */}

        <Route
          path="/specialist/requests/:id"
          element={
            <SpecialistRequestDetail />
          }
        />

        {/* =====================================
            PANEL CLIENTE
        ====================================== */}

        <Route
          path="/client"
          element={
            <ClientDashboard />
          }
        />
        <Route
          path="/client/history"
          element={
            <ClientHistory />
          }
        />
        <Route
          path="/client/profile"
          element={
            <ClientProfile />
          }
        />

        <Route
          path="/client/requests"
          element={
            <MyRequests />
          }
        />

        {/* =====================================
            PANEL ADMINISTRADOR
        ====================================== */}

        <Route
          path="/admin"
          element={
            <AdminDashboard />
          }
        />

        <Route
          path="/admin/specialists"
          element={
            <AdminSpecialists />
          }
        />
        <Route
          path="/admin/payouts"
          element={<AdminPayouts />}
        />

        <Route
          path="/admin/clients"
          element={
            <AdminClients />
          }
        />

        <Route
          path="/admin/categories"
          element={
            <AdminCategories />
          }
        />

      </Routes>

    </BrowserRouter>
  );
};

export default AppRoutes;