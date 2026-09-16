import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from '../pages/Home/Home';
import Login from '../pages/Login/Login';
import Register from '../pages/Register/Register';
import Specialists from '../pages/Specialists/Specialists';
import SpecialistProfile from '../pages/SpecialistProfile/SpecialistProfile';
import SpecialistDashboard from '../pages/SpecialistDashboard/SpecialistDashboard';
import ClientDashboard from '../pages/ClientDashboard/ClientDashboard';
import SpecialistSetup from '../pages/SpecialistSetup/SpecialistSetup';
const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
            path="/specialists"
            element={<Specialists />}
            /><Route
  path="/specialist"
  element={<SpecialistDashboard />}
/><Route
  path="/client"
  element={<ClientDashboard />}
/>
            <Route
  path="/specialists/:id"
  element={<SpecialistProfile />}
/>
<Route
  path="/specialist/setup"
  element={<SpecialistSetup />}
/>

      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;