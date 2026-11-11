/**
 * Maintenance-only ops seeds and storage keys.
 * Never reuse Housekeeping (schoolerp-housekeeping-* / hk-*) keys.
 */

export const MAINT_DUTY_KEY = 'schoolerp-maintenance-duty-v1'
export const MAINT_SCHEDULE_KEY = 'schoolerp-maintenance-schedules-v1'
export const MAINT_CHECKLIST_KEY = 'schoolerp-maintenance-checklists-v1'

export const MAINT_DUTY_SEED = [
    {
        id: 'MDUTY-2026-0001',
        staff: 'Pradeep',
        area: 'Block B Electrical Panel',
        dutyType: 'Corrective Repair',
        assignedBy: 'Maintenance Manager',
        date: '2026-09-23',
        startTime: '09:00',
        endTime: '12:00',
        priority: 'High',
        instructions: 'Replace faulty MCB and test corridor lighting circuit.',
        remarks: '',
        status: 'Assigned',
    },
]

export const MAINT_SCHEDULE_SEED = [
    {
        id: 'MSCH-2026-0001',
        name: 'Electrical panel inspection',
        frequency: 'MONTHLY',
        area: 'All blocks',
        staff: 'Pradeep',
        checklistFocus: 'Fire-safety / electrical panels',
        status: 'Active',
        dayOfMonth: 1,
    },
    {
        id: 'MSCH-2026-0002',
        name: 'Plumbing preventive check',
        frequency: 'WEEKLY',
        area: 'Academic Block A',
        staff: 'Kausik',
        checklistFocus: 'Leaks, taps, tanks',
        status: 'Active',
        weekday: 1,
    },
]

/**
 * Checklist completion register (PDF §4.7).
 * Ambiguity: PDF does not define a nested item schema — store items as text lines
 * and completion status on the register row (same pattern as other SimpleRegister screens).
 */
export const MAINT_CHECKLIST_SEED = [
    {
        id: 'MCL-2026-0001',
        title: 'Monthly electrical panel checklist',
        frequency: 'MONTHLY',
        area: 'Block B Panel Room',
        staff: 'Pradeep',
        dueDate: '2026-09-30',
        completedDate: '',
        checklistItems: 'Panel doors locked\nNo burnt smell\nBreakers labelled\nEmergency light tested',
        pendingItems: 'Emergency light tested',
        verifiedBy: '',
        status: 'Pending',
        remarks: '',
    },
]
