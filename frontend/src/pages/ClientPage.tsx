import { Route, Routes } from 'react-router-dom';
import ClientHomePage from './client/ClientHomePage';
import ClientMenuPage from './client/ClientMenuPage';
import ClientCheckoutPage from './client/ClientCheckoutPage';
import ClientOrdersPage from './client/ClientOrdersPage';
import ClientOrderTrackingPage from './client/ClientOrderTrackingPage';
import ClientProfilePage from './client/ClientProfilePage';

export default function ClientPage() {
  return (
    <Routes>
      <Route index                         element={<ClientHomePage />} />
      <Route path="menu"                   element={<ClientMenuPage />} />
      <Route path="checkout"               element={<ClientCheckoutPage />} />
      <Route path="orders"                 element={<ClientOrdersPage />} />
      <Route path="orders/:orderId"        element={<ClientOrderTrackingPage />} />
      <Route path="profile"               element={<ClientProfilePage />} />
      <Route path="*"                      element={<ClientHomePage />} />
    </Routes>
  );
}
