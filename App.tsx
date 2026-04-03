import { Routes, Route, Navigate } from "react-router-dom";
import CheckupLayout from "./src/pages/checkup/CheckupLayout";
import EntryScreen from "./src/pages/checkup/EntryScreen";
import ScanningTheater from "./src/pages/checkup/ScanningTheater";
import ResultsScreen from "./src/pages/checkup/ResultsScreen";
import BuildingScreen from "./src/pages/checkup/BuildingScreen";
import ColleagueShare from "./src/pages/checkup/ColleagueShare";
import SharedResults from "./src/pages/checkup/SharedResults";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/checkup" replace />} />
      <Route path="/checkup" element={<CheckupLayout />}>
        <Route index element={<EntryScreen />} />
        <Route path="scanning" element={<ScanningTheater />} />
        <Route path="results" element={<ResultsScreen />} />
        <Route path="building" element={<BuildingScreen />} />
        <Route path="share" element={<ColleagueShare />} />
      </Route>
      <Route path="/checkup/shared/:shareId" element={<SharedResults />} />
    </Routes>
  );
}
