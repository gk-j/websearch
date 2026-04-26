import { Route, Routes } from "react-router-dom";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import SearchResult from "./pages/SearchResult";
import ConversationPage from "./pages/ConversationPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/search" element={<SearchResult />} />
      <Route path="/conversation/:id" element={<ConversationPage />} />
    </Routes>
  );
}

export default App;
