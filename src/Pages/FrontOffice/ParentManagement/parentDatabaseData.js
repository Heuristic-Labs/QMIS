import mo_user from '../../../assets/images/no-profile.png'
import {
    getAllParentAccounts,
    getParentById as getParentAccountById,
} from '../../../Common/ParentAccounts/parentAccountsData'
import { getEnrolledStudentById } from '../../../Common/StudentDatabase/enrolledStudentsData'

const displayValue = (value, fallback = '—') => {
    const text = String(value ?? '').trim()
    return text || fallback
}

const resolveLinkedStudents = (studentIds = []) =>
    (Array.isArray(studentIds) ? studentIds : [])
        .map((studentId) => getEnrolledStudentById(studentId))
        .filter(Boolean)

export const mapParentAccountToListRow = (account) => {
    const linkedStudents = resolveLinkedStudents(account?.studentIds)
    const firstStudent = linkedStudents[0]
    const studentCount = Array.isArray(account?.studentIds) ? account.studentIds.length : 0
    const admissionSnapshot = firstStudent?.admissionSnapshot || {}

    return {
        id: account.id,
        parentId: account.id,
        profileImage: account.profileImage || mo_user,
        parentName: displayValue(account.name, 'Parent'),
        gender: displayValue(admissionSnapshot.gender || account.gender),
        email: displayValue(account.email),
        mobileNumber: displayValue(account.phone),
        studentName: firstStudent
            ? displayValue(firstStudent.name)
            : (studentCount > 0 ? `${studentCount} linked student${studentCount === 1 ? '' : 's'}` : '—'),
        admissionNumber: displayValue(firstStudent?.admissionNumber),
        relation: displayValue(admissionSnapshot.parentRelation || account.relation),
        studentIds: Array.isArray(account.studentIds) ? [...account.studentIds] : [],
        studentCount,
        status: displayValue(account.status, 'Active'),
    }
}

export const getParentsList = () => getAllParentAccounts().map(mapParentAccountToListRow)

/** @deprecated Prefer getParentsList() — kept for callers expecting a static export shape. */
export const PARENTS_LIST = []

export const getParentById = (id) => {
    const account = getParentAccountById(id)
    if (!account) return null
    return mapParentAccountToListRow(account)
}

export const getParentDetailById = (id) => {
    const account = getParentAccountById(id)
    if (!account) return null

    const linkedStudents = resolveLinkedStudents(account.studentIds)
    const firstStudent = linkedStudents[0]
    const admissionSnapshot = firstStudent?.admissionSnapshot || {}

    return {
        id: account.id,
        parentId: account.id,
        profileImage: account.profileImage || null,
        parentName: displayValue(account.name, 'Parent'),
        gender: displayValue(admissionSnapshot.gender || account.gender),
        relation: displayValue(admissionSnapshot.parentRelation || account.relation),
        occupation: displayValue(admissionSnapshot.fatherOccupation || admissionSnapshot.motherOccupation || account.occupation),
        yearlyIncome: displayValue(admissionSnapshot.yearlyIncome || account.yearlyIncome),
        address: {
            address: displayValue(admissionSnapshot.address || account.address),
            country: displayValue(admissionSnapshot.country || account.country),
            state: displayValue(admissionSnapshot.state || account.state),
            city: displayValue(admissionSnapshot.city || account.city),
            zipCode: displayValue(admissionSnapshot.zipCode || account.zipCode),
        },
        contact: {
            mobileNumber: displayValue(account.phone),
            alternativeNumber: displayValue(admissionSnapshot.alternativeNumber || account.alternativeNumber),
            email: displayValue(account.email),
        },
        student: firstStudent
            ? {
                name: displayValue(firstStudent.name),
                admissionNumber: displayValue(firstStudent.admissionNumber),
                class: displayValue(firstStudent.className),
                section: displayValue(firstStudent.section || admissionSnapshot.section),
            }
            : {
                name: Array.isArray(account.studentIds) && account.studentIds.length > 0
                    ? `${account.studentIds.length} linked student${account.studentIds.length === 1 ? '' : 's'}`
                    : '—',
                admissionNumber: '—',
                class: '—',
                section: '—',
            },
        studentIds: Array.isArray(account.studentIds) ? [...account.studentIds] : [],
        linkedStudents,
        status: displayValue(account.status, 'Active'),
        email: displayValue(account.email),
        phone: displayValue(account.phone),
        name: displayValue(account.name, 'Parent'),
    }
}
