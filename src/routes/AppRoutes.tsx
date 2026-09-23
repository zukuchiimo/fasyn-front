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

import SpecialistDashboard from '../pages/SpecialistDashboard/SpecialistDashboard';
import SpecialistSetup from '../pages/SpecialistSetup/SpecialistSetup';
import CreateService from '../pages/CreateService/CreateService';
import MyProfile from '../pages/MyProfile/MyProfile';

import ClientDashboard from '../pages/ClientDashboard/ClientDashboard';
import ClientProfile from '../pages/client/ClientProfile';
import MyRequests from '../pages/client/MyRequests/MyRequests';

import AdminDashboard from '../pages/AdminDashboard/AdminDashboard';
import AdminSpecialists from '../pages/admin/AdminSpecialists';
import AdminClients from '../pages/admin/AdminClients';
import AdminCategories from '../pages/admin/AdminCategories';

const AppRoutes = () => {
  return (
    <BrowserRouter>

      <Routes>

        {/* =====================================
            PÚBLICO
        ====================================== */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* =====================================
            ESPECIALISTAS PÚBLICOS

            Cualquier persona puede:
            - buscar
            - filtrar
            - ver especialistas
            - ver perfiles
        ====================================== */}

        <Route
          path="/specialists"
          element={<Specialists />}
        />

        <Route
          path="/specialists/:id"
          element={<SpecialistProfile />}
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