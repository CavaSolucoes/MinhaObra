import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './styles.css'
import ClientLayout from './layouts/ClientLayout'
import Overview from './pages/client/Overview'
import Schedule from './pages/client/Schedule'
import Financial from './pages/client/Financial'
import FinancialDetailPage from './pages/client/FinancialDetailPage'
import Photos from './pages/client/Photos'
import Documents from './pages/client/Documents'
import AdminRoot, { RequireAdmin } from './layouts/AdminRoot'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProjectNew from './pages/admin/AdminProjectNew'
import AdminProjectLayout from './pages/admin/project/AdminProjectLayout'
import ProjectOverview from './pages/admin/project/ProjectOverview'
import ProjectSchedule from './pages/admin/project/ProjectSchedule'
import ProjectFinancial from './pages/admin/project/ProjectFinancial'
import ProjectMedia from './pages/admin/project/ProjectMedia'
import ProjectDocuments from './pages/admin/project/ProjectDocuments'
import ProjectLink from './pages/admin/project/ProjectLink'
import { EnvMissing } from './components/EnvMissing'
import { missingEnv, useMock } from './lib/supabase'
const NotFound = () => <div id="app"><div className="card" style={{ marginTop: 40 }}>Página não encontrada.</div></div>

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {missingEnv.length && !useMock ? <EnvMissing vars={missingEnv} /> : <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/obra/:token" element={<ClientLayout />}>
          <Route index element={<Overview />} />
          <Route path="cronograma" element={<Schedule />} />
          <Route path="financeiro" element={<Financial />} />
          <Route path="financeiro/:stageId" element={<FinancialDetailPage />} />
          <Route path="fotos" element={<Photos />} />
          <Route path="documentos" element={<Documents />} />
        </Route>
        <Route path="/admin" element={<AdminRoot />}>
          <Route path="login" element={<AdminLogin />} />
          <Route element={<RequireAdmin />}><Route index element={<AdminDashboard />} /><Route path="obra/nova" element={<AdminProjectNew />} />
            <Route path="obra/:projectId" element={<AdminProjectLayout />}>
              <Route index element={<ProjectOverview />} /><Route path="cronograma" element={<ProjectSchedule />} /><Route path="financeiro" element={<ProjectFinancial />} />
              <Route path="fotos" element={<ProjectMedia />} /><Route path="documentos" element={<ProjectDocuments />} /><Route path="link" element={<ProjectLink />} />
            </Route></Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>}
  </React.StrictMode>,
)
