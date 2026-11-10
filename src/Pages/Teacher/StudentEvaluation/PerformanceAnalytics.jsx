import React, { useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { hydrateEnrolledStudentsFromApi } from '../../../Common/StudentDatabase/enrolledStudentsData'
import { getStudentsList } from '../../../Common/StudentDatabase/studentDatabaseData'
import { useTeacherAssignments } from '../../../Common/Teacher/useTeacherAssignments'
import { isApiStudentsEnabled } from '../../../services/apiClient'
import {
    canUseExamsApi,
    getMarksBatchApi,
    listExamsApi,
    listMarksBatchesApi,
    mapExamFromApi,
    mapMarksBatchFromApi,
} from '../../../services/examsApi'
import { canUseResultsApi, getStudentResultsApi } from '../../../services/resultsApi'

const selectClass = 'border border-[#D9D9D9] rounded-md px-2 py-2 text-sm bg-white min-w-[12rem]'

const PerformanceAnalytics = () => {
    const assignments = useTeacherAssignments()
    const [students, setStudents] = useState([])
    const [batches, setBatches] = useState([])
    const [examsById, setExamsById] = useState({})
    const [publishedExams, setPublishedExams] = useState([])
    const [studentId, setStudentId] = useState('')
    const [viewMode, setViewMode] = useState('individual')
    const [classFilter, setClassFilter] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            setError('')
            try {
                if (isApiStudentsEnabled()) await hydrateEnrolledStudentsFromApi()
                const all = getStudentsList()
                const scoped = assignments.ready && assignments.assignments.length
                    ? all.filter((row) => assignments.studentInScope(row))
                    : []
                if (cancelled) return
                setStudents(scoped)

                if (!canUseExamsApi()) {
                    setBatches([])
                    setExamsById({})
                    return
                }
                const [examRows, batchSummaries] = await Promise.all([
                    listExamsApi(),
                    listMarksBatchesApi({ mine: true }),
                ])
                if (cancelled) return
                const examMap = {}
                examRows.map(mapExamFromApi).forEach((exam) => {
                    examMap[exam.id] = exam
                })
                setExamsById(examMap)

                // List endpoint omits mark entries — load each batch detail.
                const detailed = await Promise.all(
                    (Array.isArray(batchSummaries) ? batchSummaries : []).map((row) =>
                        getMarksBatchApi(row.id).catch(() => null),
                    ),
                )
                if (cancelled) return
                setBatches(
                    detailed
                        .filter(Boolean)
                        .map(mapMarksBatchFromApi),
                )
            } catch (err) {
                if (!cancelled) setError(err?.message || 'Could not load marks.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when assignment hydrate settles
    }, [assignments.ready, assignments.assignments.length])

    useEffect(() => {
        if (!studentId && students[0]) setStudentId(String(students[0].id))
    }, [students, studentId])

    useEffect(() => {
        let cancelled = false
        if (!studentId || !canUseResultsApi()) {
            setPublishedExams([])
            return undefined
        }
        getStudentResultsApi(studentId)
            .then((payload) => {
                if (!cancelled) setPublishedExams(Array.isArray(payload?.exams) ? payload.exams : [])
            })
            .catch(() => {
                if (!cancelled) setPublishedExams([])
            })
        return () => {
            cancelled = true
        }
    }, [studentId])

    const selected = students.find((row) => String(row.id) === String(studentId))

    const series = useMemo(() => {
        if (!studentId) return { labels: [], scores: [], averages: [], rows: [] }
        const points = []
        const seen = new Set()

        batches.forEach((batch) => {
            const entry = (batch.entries || []).find((item) => String(item.studentId) === String(studentId))
            if (!entry || entry.absent || entry.marks == null || !batch.maxMarks) return
            const scored = (Number(entry.marks) / Number(batch.maxMarks)) * 100
            const classMarks = (batch.entries || [])
                .filter((item) => !item.absent && item.marks != null)
                .map((item) => (Number(item.marks) / Number(batch.maxMarks)) * 100)
            const classAvg = classMarks.length
                ? classMarks.reduce((sum, value) => sum + value, 0) / classMarks.length
                : null
            const exam = examsById[batch.examId]
            const label = exam?.name || batch.examName || batch.subject || 'Exam'
            const key = `${batch.id}:${batch.subject}`
            if (seen.has(key)) return
            seen.add(key)
            points.push({
                label,
                subject: batch.subject || '',
                score: Math.round(scored * 10) / 10,
                average: classAvg == null ? null : Math.round(classAvg * 10) / 10,
                status: batch.status,
                source: 'batch',
            })
        })

        // Published campus results fill gaps when the teacher has no batch entries yet.
        publishedExams.forEach((exam) => {
            const subjects = Array.isArray(exam.subjects) ? exam.subjects : []
            if (subjects.length) {
                subjects.forEach((subject) => {
                    if (subject.absent || subject.marks == null || !subject.maxMarks) return
                    const key = `pub:${exam.examId}:${subject.subject}`
                    if (seen.has(key)) return
                    // Skip if we already charted this exam+subject from a teacher batch
                    const already = points.some(
                        (point) =>
                            point.label === (exam.examName || 'Exam')
                            && point.subject === (subject.subject || ''),
                    )
                    if (already) return
                    seen.add(key)
                    const scored = (Number(subject.marks) / Number(subject.maxMarks)) * 100
                    points.push({
                        label: exam.examName || 'Exam',
                        subject: subject.subject || '',
                        score: Math.round(scored * 10) / 10,
                        average: null,
                        status: 'published',
                        source: 'results',
                    })
                })
            } else if (exam.percentage != null) {
                const key = `pub:${exam.examId}:overall`
                if (seen.has(key)) return
                seen.add(key)
                points.push({
                    label: exam.examName || 'Exam',
                    subject: 'Overall',
                    score: Math.round(Number(exam.percentage) * 10) / 10,
                    average: null,
                    status: 'published',
                    source: 'results',
                })
            }
        })

        return {
            labels: points.map((item) => item.label),
            scores: points.map((item) => item.score),
            averages: points.map((item) => item.average),
            rows: points,
        }
    }, [batches, examsById, publishedExams, studentId])

    const option = useMemo(() => ({
        color: ['#515DEF', '#B4C4FF'],
        tooltip: { trigger: 'axis' },
        legend: { data: ['Student score', 'Class average'] },
        xAxis: { type: 'category', data: series.labels.length ? series.labels : ['No exams'] },
        yAxis: { type: 'value', min: 0, max: 100 },
        series: [
            { name: 'Student score', type: 'line', data: series.scores },
            { name: 'Class average', type: 'line', data: series.averages },
        ],
    }), [series])

    const avgScore = series.scores.length
        ? Math.round((series.scores.reduce((sum, value) => sum + value, 0) / series.scores.length) * 10) / 10
        : null

    const classOptions = useMemo(() => {
        const labels = students.map((student) => {
            const grade = student.className || student.class || ''
            const section = student.section ? `-${student.section}` : ''
            return grade ? `${grade}${section}` : ''
        }).filter(Boolean)
        return [...new Set(labels)].sort()
    }, [students])

    const classWiseRows = useMemo(() => {
        const groups = new Map()
        students.forEach((student) => {
            const grade = student.className || student.class || 'Unassigned'
            const section = student.section || ''
            const key = section ? `${grade}-${section}` : grade
            if (classFilter && key !== classFilter) return
            if (!groups.has(key)) groups.set(key, { classLabel: key, students: 0, scores: [] })
            const group = groups.get(key)
            group.students += 1
            const studentBatches = batches.flatMap((batch) => {
                const entry = (batch.entries || []).find((item) => String(item.studentId) === String(student.id))
                if (!entry || entry.absent || entry.marks == null || !batch.maxMarks) return []
                return [(Number(entry.marks) / Number(batch.maxMarks)) * 100]
            })
            group.scores.push(...studentBatches)
        })
        return [...groups.values()].map((group) => ({
            classLabel: group.classLabel,
            students: group.students,
            average: group.scores.length
                ? Math.round((group.scores.reduce((sum, value) => sum + value, 0) / group.scores.length) * 10) / 10
                : null,
            assessments: group.scores.length,
        }))
    }, [students, batches, classFilter])

    const classOption = useMemo(() => ({
        color: ['#515DEF'],
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: classWiseRows.map((row) => row.classLabel) },
        yAxis: { type: 'value', min: 0, max: 100 },
        series: [{
            name: 'Class average %',
            type: 'bar',
            data: classWiseRows.map((row) => row.average ?? 0),
        }],
    }), [classWiseRows])

    return (
        <section className='bg-white rounded-2xl shadow-md p-4 space-y-4'>
            <div className='flex justify-between gap-3 flex-wrap items-start'>
                <div>
                    <h2 className='text-xl font-semibold'>Performance analytics</h2>
                    <p className='text-sm text-[#667085]'>
                        Class-wise and individual student analytics for assigned classes.
                    </p>
                    {assignments.emptyReason ? (
                        <p className='text-sm text-[#E65100] mt-1'>{assignments.emptyReason}</p>
                    ) : null}
                    {error ? <p className='text-sm text-[#FF0000] mt-1'>{error}</p> : null}
                </div>
                <div className='flex flex-wrap gap-2 items-center'>
                    <div className='flex rounded-lg border border-[#D9D9D9] overflow-hidden text-sm'>
                        <button
                            type='button'
                            onClick={() => setViewMode('class')}
                            className={`px-3 py-2 cursor-pointer ${viewMode === 'class' ? 'bg-[#515DEF] text-white' : 'text-[#667085]'}`}
                        >
                            Class-wise
                        </button>
                        <button
                            type='button'
                            onClick={() => setViewMode('individual')}
                            className={`px-3 py-2 cursor-pointer ${viewMode === 'individual' ? 'bg-[#515DEF] text-white' : 'text-[#667085]'}`}
                        >
                            Individual
                        </button>
                    </div>
                    {viewMode === 'class' ? (
                        <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className={selectClass}>
                            <option value=''>All classes</option>
                            {classOptions.map((label) => <option key={label} value={label}>{label}</option>)}
                        </select>
                    ) : (
                        <select
                            value={studentId}
                            onChange={(event) => setStudentId(event.target.value)}
                            className={selectClass}
                            disabled={!students.length}
                        >
                            {!students.length ? <option value=''>No assigned students</option> : null}
                            {students.map((student) => (
                                <option key={student.id} value={String(student.id)}>
                                    {student.name} ({student.className || student.class}{student.section ? `-${student.section}` : ''})
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {viewMode === 'individual' && selected ? (
                <p className='text-sm text-[#667085]'>
                    {selected.name}
                    {selected.className || selected.class
                        ? ` · ${selected.className || selected.class}${selected.section ? `-${selected.section}` : ''}`
                        : ''}
                    {avgScore != null ? ` · Average ${avgScore}% across ${series.scores.length} marked exam(s)` : ''}
                </p>
            ) : null}

            {loading ? (
                <p className='text-sm text-[#667085]'>Loading analytics…</p>
            ) : viewMode === 'class' ? (
                !classWiseRows.length ? (
                    <p className='text-sm text-[#667085]'>No class-wise data for assigned students yet.</p>
                ) : (
                    <>
                        <ReactECharts option={classOption} style={{ height: 320 }} />
                        <div className='overflow-x-auto'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='text-left text-[#667085] border-b'>
                                        <th className='py-2 pr-3'>Class</th>
                                        <th className='py-2 pr-3'>Students</th>
                                        <th className='py-2 pr-3'>Assessments</th>
                                        <th className='py-2'>Average %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classWiseRows.map((row) => (
                                        <tr key={row.classLabel} className='border-b border-[#F0F0F0]'>
                                            <td className='py-2 pr-3'>{row.classLabel}</td>
                                            <td className='py-2 pr-3'>{row.students}</td>
                                            <td className='py-2 pr-3'>{row.assessments}</td>
                                            <td className='py-2'>{row.average ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )
            ) : !canUseExamsApi() ? (
                <p className='text-sm text-[#667085]'>Sign in with API auth to load exam marks.</p>
            ) : !series.rows.length ? (
                <p className='text-sm text-[#667085]'>
                    No marks found for this student yet. Enter marks under Student Evaluation / Mark Entry
                    (or wait for published results), then return here.
                </p>
            ) : (
                <ReactECharts option={option} style={{ height: 320 }} />
            )}

            {viewMode === 'individual' && series.rows.length > 0 ? (
                <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='text-left text-[#667085] border-b'>
                                <th className='py-2 pr-3'>Exam</th>
                                <th className='py-2 pr-3'>Subject</th>
                                <th className='py-2 pr-3'>Student %</th>
                                <th className='py-2 pr-3'>Class avg %</th>
                                <th className='py-2'>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {series.rows.map((row, index) => (
                                <tr key={`${row.label}-${row.subject}-${index}`} className='border-b border-[#F0F0F0]'>
                                    <td className='py-2 pr-3'>{row.label}</td>
                                    <td className='py-2 pr-3'>{row.subject || '—'}</td>
                                    <td className='py-2 pr-3'>{row.score}</td>
                                    <td className='py-2 pr-3'>{row.average ?? '—'}</td>
                                    <td className='py-2'>{row.status || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </section>
    )
}

export default PerformanceAnalytics
