import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import AppLayout from './layout/AppLayout'
import LoginPage from './pages/LoginPage'
import ProgressPage from './pages/ProgressPage'
import TrackerPage from './pages/TrackerPage'
import TrainerPage from './pages/TrainerPage'
import DietLayout from './pages/diet/DietLayout'
import LogPage from './pages/diet/LogPage'
import DietProgressPage from './pages/diet/DietProgressPage'
import ReferencePlanPage from './pages/diet/ReferencePlanPage'
import FoodBankPage from './pages/diet/FoodBankPage'
import WorkoutLayout from './pages/workout/WorkoutLayout'
import WorkoutLogPage from './pages/workout/WorkoutLogPage'
import WorkoutProgressPage from './pages/workout/WorkoutProgressPage'
import WorkoutPlanPage from './pages/workout/WorkoutPlanPage'
import ExerciseBankPage from './pages/workout/ExerciseBankPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/diet" replace />} />
        <Route path="/diet" element={<DietLayout />}>
          <Route index element={<Navigate to="/diet/log" replace />} />
          <Route path="log" element={<LogPage />} />
          <Route path="progress" element={<DietProgressPage />} />
          <Route path="plan" element={<ReferencePlanPage />} />
          <Route path="food-bank" element={<FoodBankPage />} />
        </Route>
        <Route path="/workout" element={<WorkoutLayout />}>
          <Route index element={<Navigate to="/workout/log" replace />} />
          <Route path="log" element={<WorkoutLogPage />} />
          <Route path="progress" element={<WorkoutProgressPage />} />
          <Route path="plan" element={<WorkoutPlanPage />} />
          <Route path="exercises" element={<ExerciseBankPage />} />
        </Route>
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/tracker" element={<TrackerPage />} />
        <Route path="/trainer" element={<TrainerPage />} />
      </Route>
    </Routes>
  )
}
