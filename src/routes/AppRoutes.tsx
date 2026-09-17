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
import ClientDashboard from '../pages/ClientDashboard/ClientDashboard';
import SpecialistSetup from '../pages/SpecialistSetup/SpecialistSetup';
import CreateService from '../pages/CreateService/CreateService';
import MyProfile from '../pages/MyProfile/MyProfile';
 const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Home />}
        />
<Route
  path="/specialist/profile"
  element={<MyProfile />}
/>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/specialists"
          element={<Specialists />}
        />

        {/* PERFIL PÚBLICO DE UN ESPECIALISTA */}
        <Route
          path="/specialists/:id"
          element={<SpecialistProfile />}
        />

        {/* PANEL DEL ESPECIALISTA */}
        <Route
          path="/specialist"
          element={<SpecialistDashboard />}
        />

        {/* MI PERFIL / EDITAR PERFIL */}
        <Route
          path="/specialist/profile"
          element={<MyProfile />}
        />

        {/* CONFIGURACIÓN INICIAL */}
        <Route
          path="/specialist/setup"
          element={<SpecialistSetup />}
        />

        {/* CREAR SERVICIO */}
        <Route
          path="/specialist/services/new"
          element={<CreateService />}
        />

        {/* PANEL CLIENTE */}
        <Route
          path="/client"
          element={<ClientDashboard />}
        />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;