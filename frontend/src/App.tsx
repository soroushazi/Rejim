import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import { useAuth } from './auth/AuthContext'
import AppLayout from './layout/AppLayout'
import LoginPage from './pages/LoginPage'
import ProgressPage from './pages/ProgressPage'
import TrackerPage from './pages/TrackerPage'
import ProfilePage from './pages/ProfilePage'
import GoalsPage from './pages/GoalsPage'
import PlanManagementPage from './pages/PlanManagementPage'
import PreferencesPage from './pages/PreferencesPage'
import RemindersPage from './pages/RemindersPage'
import ExportPage from './pages/ExportPage'
import OnboardingWizard from './pages/onboarding/OnboardingWizard'
import TraineeListPage from './pages/TraineeListPage'
import TraineeDetailPage from './pages/TraineeDetailPage'
import TrainerLayout from './pages/trainer/TrainerLayout'
import NotesPage from './pages/trainer/NotesPage'
import QAPage from './pages/trainer/QAPage'
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

/** Sends a first-time trainee (onboarding_completed=false) into the
 * /onboarding wizard instead of straight to /diet - the actual "right after
 * signup/login" trigger, since this app has no self-service signup flow to
 * hook into (see LOGIN_ONBOARDING_SPEC.md). A trainer's home screen is the
 * trainee roster (see TRAINER_DASHBOARD_SPEC.md); everyone else lands on
 * /diet as before. */
function IndexRedirect() {
  const { user, viewMode } = useAuth()
  if (viewMode === 'trainer') {
    return <Navigate to="/trainees" replace />
  }
  if (!user?.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }
  return <Navigate to="/diet" replace />
}

/** Guards the self-logging routes that trainer mode's nav no longer links to
 * (Diet/Workout/Daily/Goals/Plan Management/Preferences/Reminders/Export/
 * Trainer) - hiding the buttons doesn't stop direct URL navigation, and some
 * of these show confusing, fabricated-looking UI for a trainer with nothing
 * of their own logged. Redirects to the trainer's actual home instead. */
function TraineeModeOnly({ children }: { children: React.ReactNode }) {
  const { viewMode } = useAuth()
  if (viewMode === 'trainer') {
    return <Navigate to="/trainees" replace />
  }
  return <>{children}</>
}

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
        <Route index element={<IndexRedirect />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/trainees" element={<TraineeListPage />} />
        <Route path="/trainees/:id" element={<TraineeDetailPage />} />
        <Route
          path="/diet"
          element={
            <TraineeModeOnly>
              <DietLayout />
            </TraineeModeOnly>
          }
        >
          <Route index element={<Navigate to="/diet/log" replace />} />
          <Route path="log" element={<LogPage />} />
          <Route path="progress" element={<DietProgressPage />} />
          <Route path="plan" element={<ReferencePlanPage />} />
          <Route path="food-bank" element={<FoodBankPage />} />
        </Route>
        <Route
          path="/workout"
          element={
            <TraineeModeOnly>
              <WorkoutLayout />
            </TraineeModeOnly>
          }
        >
          <Route index element={<Navigate to="/workout/log" replace />} />
          <Route path="log" element={<WorkoutLogPage />} />
          <Route path="progress" element={<WorkoutProgressPage />} />
          <Route path="plan" element={<WorkoutPlanPage />} />
          <Route path="exercises" element={<ExerciseBankPage />} />
        </Route>
        <Route path="/progress" element={<ProgressPage />} />
        <Route
          path="/tracker"
          element={
            <TraineeModeOnly>
              <TrackerPage />
            </TraineeModeOnly>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/goals"
          element={
            <TraineeModeOnly>
              <GoalsPage />
            </TraineeModeOnly>
          }
        />
        <Route
          path="/plan-management"
          element={
            <TraineeModeOnly>
              <PlanManagementPage />
            </TraineeModeOnly>
          }
        />
        <Route
          path="/preferences"
          element={
            <TraineeModeOnly>
              <PreferencesPage />
            </TraineeModeOnly>
          }
        />
        <Route
          path="/reminders"
          element={
            <TraineeModeOnly>
              <RemindersPage />
            </TraineeModeOnly>
          }
        />
        <Route
          path="/export"
          element={
            <TraineeModeOnly>
              <ExportPage />
            </TraineeModeOnly>
          }
        />
        <Route
          path="/trainer"
          element={
            <TraineeModeOnly>
              <TrainerLayout />
            </TraineeModeOnly>
          }
        >
          <Route index element={<Navigate to="/trainer/notes" replace />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="qa" element={<QAPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
