import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Outlet, ScrollRestoration } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import Landing from '@/pages/Landing'
import { DraftRequestSender } from '@/components/talent/DraftRequestSender'

const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const Jobs = lazy(() => import('@/pages/jobs/Jobs'))
const JobDetail = lazy(() => import('@/pages/jobs/JobDetail'))
const Apply = lazy(() => import('@/pages/apply/Apply'))
const Talent = lazy(() => import('@/pages/talent/Talent'))
const TalentProfile = lazy(() => import('@/pages/talent/TalentProfile'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const Terms = lazy(() => import('@/pages/Terms'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const CompanyLayout = lazy(() => import('@/pages/company/CompanyLayout'))
const CompanyDashboard = lazy(() => import('@/pages/company/Dashboard'))
const CompanyJobs = lazy(() => import('@/pages/company/Jobs'))
const CompanyJobEditor = lazy(() => import('@/pages/company/JobEditor'))
const CompanyProfile = lazy(() => import('@/pages/company/Profile'))
const TalentSearch = lazy(() => import('@/pages/company/TalentSearch'))
const CandidateView = lazy(() => import('@/pages/company/CandidateView'))
const Shortlists = lazy(() => import('@/pages/company/Shortlists'))
const CompanyRequests = lazy(() => import('@/pages/company/Requests'))

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminCandidates = lazy(() => import('@/pages/admin/Candidates'))
const AdminCandidateDetail = lazy(() => import('@/pages/admin/CandidateDetail'))
const AdminPipeline = lazy(() => import('@/pages/admin/Pipeline'))
const AdminAuditLog = lazy(() => import('@/pages/admin/AuditLog'))
const AdminSettings = lazy(() => import('@/pages/admin/Settings'))
const AdminCompanies = lazy(() => import('@/pages/admin/Companies'))
const AdminJobs = lazy(() => import('@/pages/admin/Jobs'))
const AdminJobEditor = lazy(() => import('@/pages/admin/JobEditor'))
const AdminRequests = lazy(() => import('@/pages/admin/Requests'))
const AdminRequestDetail = lazy(() => import('@/pages/admin/RequestDetail'))

const CandidateLayout = lazy(() => import('@/pages/candidate/CandidateLayout'))
const CandidateDashboard = lazy(() => import('@/pages/candidate/Dashboard'))
const EditProfile = lazy(() => import('@/pages/candidate/EditProfile'))
const MyApplications = lazy(() => import('@/pages/candidate/Applications'))
const MyRequests = lazy(() => import('@/pages/candidate/Requests'))
const CandidateSettings = lazy(() => import('@/pages/candidate/Settings'))

function PageFallback() {
  // Full height, so the footer does not jump (layout shift) when the lazy page arrives.
  return <div className="min-h-screen" aria-busy="true" />
}

function page(element: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>
}

function Root() {
  return (
    <>
      <ScrollRestoration />
      <DraftRequestSender />
      <Outlet />
    </>
  )
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <Landing /> },
          { path: 'jobs', element: page(<Jobs />) },
          { path: 'jobs/:id', element: page(<JobDetail />) },
          { path: 'apply', element: page(<Apply />) },
          { path: 'talent', element: page(<Talent />) },
          { path: 'talent/:id', element: page(<TalentProfile />) },
          { path: 'login', element: page(<Login />) },
          { path: 'register', element: page(<Register />) },
          { path: 'verify-email', element: page(<VerifyEmail />) },
          { path: 'forgot-password', element: page(<ForgotPassword />) },
          { path: 'reset-password', element: page(<ResetPassword />) },
          { path: 'privacy', element: page(<Privacy />) },
          { path: 'terms', element: page(<Terms />) },
          { path: '*', element: page(<NotFound />) },
        ],
      },
      {
        // Signed-in candidate area with its own dashboard layout.
        path: 'candidate',
        element: page(<CandidateLayout />),
        children: [
          { index: true, element: page(<CandidateDashboard />) },
          { path: 'profile', element: page(<EditProfile />) },
          { path: 'applications', element: page(<MyApplications />) },
          { path: 'requests', element: page(<MyRequests />) },
          { path: 'settings', element: page(<CandidateSettings />) },
          { path: '*', element: page(<NotFound />) },
        ],
      },
      {
        path: 'company',
        element: page(<CompanyLayout />),
        children: [
          { index: true, element: page(<CompanyDashboard />) },
          { path: 'jobs', element: page(<CompanyJobs />) },
          { path: 'jobs/new', element: page(<CompanyJobEditor />) },
          { path: 'jobs/:id/edit', element: page(<CompanyJobEditor />) },
          { path: 'profile', element: page(<CompanyProfile />) },
          { path: 'search', element: page(<TalentSearch />) },
          { path: 'candidates/:id', element: page(<CandidateView />) },
          { path: 'shortlists', element: page(<Shortlists />) },
          { path: 'shortlists/:id', element: page(<Shortlists />) },
          { path: 'requests', element: page(<CompanyRequests />) },
          { path: '*', element: page(<NotFound />) },
        ],
      },
      {
        path: 'admin',
        element: page(<AdminLayout />),
        children: [
          { index: true, element: page(<AdminDashboard />) },
          { path: 'candidates', element: page(<AdminCandidates />) },
          { path: 'candidates/:id', element: page(<AdminCandidateDetail />) },
          { path: 'pipeline', element: page(<AdminPipeline />) },
          { path: 'audit', element: page(<AdminAuditLog />) },
          { path: 'settings', element: page(<AdminSettings />) },
          { path: 'requests', element: page(<AdminRequests />) },
          { path: 'requests/:id', element: page(<AdminRequestDetail />) },
          { path: 'companies', element: page(<AdminCompanies />) },
          { path: 'jobs', element: page(<AdminJobs />) },
          { path: 'jobs/new', element: page(<AdminJobEditor />) },
          { path: 'jobs/:id/edit', element: page(<AdminJobEditor />) },
          { path: '*', element: page(<NotFound />) },
        ],
      },
    ],
  },
])
