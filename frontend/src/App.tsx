import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import NewsDetail from "@/pages/NewsDetail";
import Admin from "@/pages/Admin";
import ApplicationStatus from "@/pages/ApplicationStatus";
import Complaint from "@/pages/Complaint";
import Archive from "@/pages/Archive";
import NotFound from "@/pages/NotFound";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/berita/:slug" element={<NewsDetail />} />
      <Route path="/status/:id" element={<ApplicationStatus />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/pengaduan" element={<Complaint />} />
      <Route path="/arsip" element={<Archive />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
