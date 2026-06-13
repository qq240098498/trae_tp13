import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import NewOrder from "@/pages/NewOrder";
import OrderList from "@/pages/OrderList";
import OrderDetail from "@/pages/OrderDetail";
import Pricing from "@/pages/Pricing";
import Notifications from "@/pages/Notifications";
import CompensationStandard from "@/pages/CompensationStandard";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/order/new" element={<NewOrder />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/compensation-standard" element={<CompensationStandard />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
      </Routes>
    </Router>
  );
}
