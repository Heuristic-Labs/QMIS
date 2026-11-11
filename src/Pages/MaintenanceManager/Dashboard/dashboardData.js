import { ensureSeed } from '../../../Common/demoDomain/storage'
import { hydrateCampusKey, usesCampusApiForKey } from '../../../services/campusJsonStore'
import { getSupportTickets, hydrateSupportTicketsFromApi } from '../../ITSupportManager/SupportTickets/supportTicketsData'
import {
    MAINT_CHECKLIST_KEY,
    MAINT_CHECKLIST_SEED,
    MAINT_DUTY_KEY,
    MAINT_DUTY_SEED,
    MAINT_SCHEDULE_KEY,
    MAINT_SCHEDULE_SEED,
} from '../maintenanceOpsData'

const FACILITIES_DEPARTMENT = 'Facilities'

const isOpenStatus = (status) => {
    const value = String(status || '').toLowerCase()
    return value !== 'closed' && value !== 'resolved' && value !== 'completed' && value !== 'verified'
}

const getMaintRows = (key, seed) => ensureSeed(key, seed)

export function buildMaintenanceDashboard() {
    const tickets = getSupportTickets().filter(
        (row) => String(row.department || '') === FACILITIES_DEPARTMENT,
    )
    const duties = getMaintRows(MAINT_DUTY_KEY, MAINT_DUTY_SEED)
    const schedules = getMaintRows(MAINT_SCHEDULE_KEY, MAINT_SCHEDULE_SEED)
    const checklists = getMaintRows(MAINT_CHECKLIST_KEY, MAINT_CHECKLIST_SEED)

    const openTickets = tickets.filter((row) => isOpenStatus(row.status))
    const openDuties = duties.filter((row) => isOpenStatus(row.status))
    const activeSchedules = schedules.filter((row) => String(row.status || '') === 'Active')
    const pendingChecklists = checklists.filter((row) => isOpenStatus(row.status))

    const recentDuties = [...duties]
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        .slice(0, 6)
    const recentChecklists = [...checklists]
        .sort((a, b) => String(b.dueDate || b.completedDate || '').localeCompare(String(a.dueDate || a.completedDate || '')))
        .slice(0, 6)
    const recentTickets = [...tickets]
        .sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')))
        .slice(0, 6)

    return {
        summaryCards: [
            { label: 'Facilities Tickets', value: String(tickets.length), sub: 'Department inbox', to: '/maintenance-manager/tickets' },
            { label: 'Open Tickets', value: String(openTickets.length), sub: 'Awaiting action', to: '/maintenance-manager/tickets' },
            { label: 'Open Duties', value: String(openDuties.length), sub: 'Duty allotment', to: '/maintenance-manager/duty-allotment' },
            { label: 'Active Schedules', value: String(activeSchedules.length), sub: 'Preventive cadence', to: '/maintenance-manager/schedules' },
            { label: 'Pending Checklists', value: String(pendingChecklists.length), sub: 'Not yet verified', to: '/maintenance-manager/checklists' },
        ],
        recentTickets: recentTickets.map((row) => ({
            ticketId: row.ticketId || row.id,
            subject: row.subject || row.title || 'Ticket',
            priority: row.priority || '—',
            status: row.status || '—',
        })),
        recentDuties: recentDuties.map((row) => ({
            id: row.id,
            staff: row.staff || '—',
            dutyType: row.dutyType || '—',
            status: row.status || '—',
        })),
        recentChecklists: recentChecklists.map((row) => ({
            id: row.id,
            title: row.title || 'Checklist',
            staff: row.staff || '—',
            status: row.status || '—',
        })),
    }
}

export async function hydrateMaintenanceDashboardFromApi() {
    const tasks = [hydrateSupportTicketsFromApi()]
    if (usesCampusApiForKey(MAINT_DUTY_KEY)) tasks.push(hydrateCampusKey(MAINT_DUTY_KEY, MAINT_DUTY_SEED))
    if (usesCampusApiForKey(MAINT_SCHEDULE_KEY)) tasks.push(hydrateCampusKey(MAINT_SCHEDULE_KEY, MAINT_SCHEDULE_SEED))
    if (usesCampusApiForKey(MAINT_CHECKLIST_KEY)) tasks.push(hydrateCampusKey(MAINT_CHECKLIST_KEY, MAINT_CHECKLIST_SEED))
    await Promise.all(tasks)
    return buildMaintenanceDashboard()
}
