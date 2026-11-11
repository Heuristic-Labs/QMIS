import React from 'react'
import { Navigate, Route, Routes as ReactRoutes } from 'react-router-dom'
import Dashboard from '../Pages/MaintenanceManager/Dashboard/Dashboard'
import DutyAllotment from '../Pages/MaintenanceManager/DutyAllotment/DutyAllotment'
import Schedules from '../Pages/MaintenanceManager/Schedules/Schedules'
import Checklists from '../Pages/MaintenanceManager/Checklists/Checklists'
import DepartmentTicketsPage from '../Common/Tickets/DepartmentTicketsPage'
import ViewSupportTicket from '../Pages/ITSupportManager/SupportTickets/ViewSupportTicket'

const MaintenanceManagerRoutes = () => (
    <ReactRoutes>
        <Route path="/maintenance-manager/dashboard" element={<Dashboard />} />
        <Route
            path="/maintenance-manager/tickets"
            element={(
                <DepartmentTicketsPage
                    defaultDepartment="Facilities"
                    listBasePath="/maintenance-manager/tickets"
                    title="Facilities Tickets"
                />
            )}
        />
        <Route path="/maintenance-manager/tickets/view-ticket/:id" element={<ViewSupportTicket />} />
        <Route path="/maintenance-manager/duty-allotment" element={<DutyAllotment />} />
        <Route path="/maintenance-manager/schedules" element={<Schedules />} />
        <Route path="/maintenance-manager/checklists" element={<Checklists />} />
        <Route path="/maintenance-manager" element={<Navigate to="/maintenance-manager/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/maintenance-manager/dashboard" replace />} />
    </ReactRoutes>
)

export default MaintenanceManagerRoutes
