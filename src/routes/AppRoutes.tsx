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

import AdminDashboard from '../pages/AdminDashboard/AdminDashboard';
import AdminSpecialists from '../pages/admin/AdminSpecialists';
import AdminClients from '../pages/admin/AdminClients';
const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* HOME */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* AUTH */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* ESPECIALISTAS PÚBLICOS */}
        <Route
          path="/specialists"
          element={<Specialists />}
        />

        <Route
          path="/specialists/:id"
          element={<SpecialistProfile />}
        />

        {/* PANEL ESPECIALISTA */}
        <Route
          path="/specialist"
          element={<SpecialistDashboard />}
        />

        <Route
          path="/specialist/profile"
          element={<MyProfile />}
        />

        <Route
          path="/specialist/setup"
          element={<SpecialistSetup />}
        />

        <Route
          path="/specialist/services/new"
          element={<CreateService />}
        />

        {/* PANEL CLIENTE */}
        <Route
          path="/client"
          element={<ClientDashboard />}
        />

        {/* PANEL ADMINISTRADOR */}
        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/specialists"
          element={<AdminSpecialists />}
        />
<Route
  path="/admin/clients"
  element={<AdminClients />}
/>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;