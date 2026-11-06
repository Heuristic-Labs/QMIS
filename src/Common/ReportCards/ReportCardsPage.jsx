import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
    canUseExamsApi,
    listExamsApi,
    listMarksBatchesApi,
    mapExamFromApi,
} from '../../services/examsApi'
import { listStudentsApi } from '../../services/studentsApi'

const inputClass = 'text-sm border border-[#D9D9D9] rounded-md px-2 py-2 w-full'

const ReportCardsPage = () => {
    const api = canUseExamsApi()
    const [exams, setExams] = useState([])
    const [batches, setBatches] = useState([])
    const [students, setStudents] = useState([])
    const [examId, setExamId] = useState('')
    const [className, setClassName] = useState('')
    const [section, setSection] = useState('')
    const [studentId, setStudentId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!api) return undefined
        let cancelled = false
        setLoading(true)
        Promise.all([
            listExamsApi().catch(() => []),
            listMarksBatchesApi().catch(() => []),
            listStudentsApi().catch(() => []),
        ])
            .then(([examRows, batchRows, studentRows]) => {
                if (cancelled) return
                setExams((Array.isArray(examRows) ? examRows : []).map(mapExamFromApi))
                setBatches(Array.isArray(batchRows) ? batchRows : [])
                setStudents(Array.isArray(studentRows) ? studentRows : [])
                setError('')
            })
            .catch((err) => {
                if (!cancelled) setError(err?.message || 'Could not load exams or marks.')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [api])

    const publishedExams = useMemo(
        () => exams.filter((exam) => String(exam.status || exam.approvalStatus || '').toLowerCase().includes('approv')
            || String(exam.status || '').toLowerCase() === 'published'
            || Boolean(exam.id)),
        [exams],
    )

    const classOptions = useMemo(
        () => [...new Set(students.map((row) => row.className || row.class_name).filter(Boolean))].sort(),
        [students],
    )
    const sectionOptions = useMemo(() => {
        const rows = className
            ? students.filter((row) => (row.className || row.class_name) === className)
            : students
        return [...new Set(rows.map((row) => row.section).filter(Boolean))].sort()
    }, [students, className])

    const filteredStudents = useMemo(() => students.filter((row) => {
        if (className && (row.className || row.class_name) !== className) return false
        if (section && row.section !== section) return false
        return true
    }), [students, className, section])

    const selectedExam = publishedExams.find((exam) => String(exam.id) === String(examId)) || null
    const selectedStudent = filteredStudents.find((row) => String(row.id) === String(studentId)) || null

    const subjectMarks = useMemo(() => {
        if (!examId || !studentId) return []
        return batches
            .filter((batch) => String(batch.examId || batch.exam_id) === String(examId))
            .map((batch) => {
                const entries = Array.isArray(batch.entries) ? batch.entries : []
                const entry = entries.find((item) => String(item.studentId || item.student_id) === String(studentId))
                return {
                    subject: batch.subject || '—',
                    maxMarks: batch.maxMarks || batch.max_marks || '—',
                    marks: entry?.marks ?? entry?.score ?? '—',
                    status: batch.status || '—',
                }
            })
            .filter((row) => row.marks !== '—' || row.status)
    }, [batches, examId, studentId])

    const printCard = () => {
        if (!selectedStudent || !selectedExam) {
            toast.error('Select an exam and a student first.')
            return
        }
        window.print()
    }

    if (!api) {
        return (
            <section className='bg-white rounded-2xl shadow-md p-6'>
                <h2 className='text-xl font-medium text-black'>Report Cards</h2>
                <p className='text-sm text-[#667085] mt-2'>
                    Sign in against the live API to generate report cards from published exam marks.
                </p>
            </section>
        )
    }

    return (
        <section className='space-y-6'>
            <div className='bg-white rounded-2xl shadow-md p-4 print:hidden'>
                <h2 className='text-xl font-medium text-black'>Report Cards</h2>
                <p className='text-sm text-[#667085] mt-1'>
                    Principal view: pick a campus exam and student, then print or save the report card from entered marks.
                </p>
                {error ? <p className='text-sm text-[#B54708] mt-2'>{error}</p> : null}
                {loading ? <p className='text-sm text-[#667085] mt-2'>Loading exams and marks…</p> : null}
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4'>
                    <label className='text-sm text-[#808080] flex flex-col gap-1'>Exam
                        <select value={examId} onChange={(e) => setExamId(e.target.value)} className={inputClass}>
                            <option value=''>Select exam</option>
                            {publishedExams.map((exam) => (
                                <option key={exam.id} value={exam.id}>
                                    {exam.name || exam.examName} — {exam.className || exam.class_name || ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className='text-sm text-[#808080] flex flex-col gap-1'>Class
                        <select
                            value={className}
                            onChange={(e) => {
                                setClassName(e.target.value)
                                setSection('')
                                setStudentId('')
                            }}
                            className={inputClass}
                        >
                            <option value=''>All</option>
                            {classOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </label>
                    <label className='text-sm text-[#808080] flex flex-col gap-1'>Section
                        <select
                            value={section}
                            onChange={(e) => {
                                setSection(e.target.value)
                                setStudentId('')
                            }}
                            className={inputClass}
                        >
                            <option value=''>All</option>
                            {sectionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </label>
                    <label className='text-sm text-[#808080] flex flex-col gap-1'>Student
                        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}>
                            <option value=''>Select student</option>
                            {filteredStudents.map((row) => (
                                <option key={row.id} value={row.id}>
                                    {row.fullName || row.name || row.admissionNumber} ({row.admissionNumber || row.id})
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className='mt-4'>
                    <button
                        type='button'
                        onClick={printCard}
                        className='bg-[#515DEF] text-white text-sm px-4 py-2 rounded-md cursor-pointer'
                    >
                        Print / Save Report Card
                    </button>
                </div>
            </div>

            <div className='bg-white rounded-2xl shadow-md p-6' id='report-card-print'>
                <div className='border border-[#E2E8F0] rounded-xl p-6'>
                    <h3 className='text-2xl font-semibold text-[#0C1E5B] text-center'>QMIS Report Card</h3>
                    <p className='text-center text-sm text-[#667085] mt-1'>
                        {selectedExam?.name || selectedExam?.examName || 'Exam not selected'}
                    </p>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 text-sm'>
                        <p><span className='text-[#808080]'>Student:</span> {selectedStudent?.fullName || selectedStudent?.name || '—'}</p>
                        <p><span className='text-[#808080]'>Admission No:</span> {selectedStudent?.admissionNumber || '—'}</p>
                        <p><span className='text-[#808080]'>Class:</span> {(selectedStudent?.className || selectedStudent?.class_name || className) || '—'}</p>
                        <p><span className='text-[#808080]'>Section:</span> {selectedStudent?.section || section || '—'}</p>
                        <p><span className='text-[#808080]'>Academic Year:</span> {selectedExam?.academicYear || '—'}</p>
                        <p><span className='text-[#808080]'>Exam Type:</span> {selectedExam?.examType || selectedExam?.type || '—'}</p>
                    </div>
                    <table className='w-full text-sm mt-6'>
                        <thead className='bg-[#EDEEF5]'>
                            <tr>
                                <th className='text-left px-3 py-2'>Subject</th>
                                <th className='text-left px-3 py-2'>Marks</th>
                                <th className='text-left px-3 py-2'>Max</th>
                                <th className='text-left px-3 py-2'>Batch Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjectMarks.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className='px-3 py-6 text-center text-[#667085]'>
                                        {studentId && examId
                                            ? 'No mark entries found for this student on the selected exam.'
                                            : 'Select an exam and student to preview marks.'}
                                    </td>
                                </tr>
                            ) : (
                                subjectMarks.map((row) => (
                                    <tr key={`${row.subject}-${row.status}`} className='border-b border-[#F2F4F7]'>
                                        <td className='px-3 py-2'>{row.subject}</td>
                                        <td className='px-3 py-2'>{row.marks}</td>
                                        <td className='px-3 py-2'>{row.maxMarks}</td>
                                        <td className='px-3 py-2'>{row.status}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className='flex justify-between mt-10 text-sm text-[#667085]'>
                        <span>Class Teacher</span>
                        <span>Principal</span>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ReportCardsPage
