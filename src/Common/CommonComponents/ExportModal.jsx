import React, { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'react-toastify'
import { runTableExport } from '../exportDownload'

const ExportModal = ({
    exportModal,
    setExportModal,
    onExport,
    rows,
    columns,
    filename = 'export',
    title,
    exportDescription = (
        <>
            Export the currently filtered records for any selected date range.
        </>
    ),
}) => {
    const [format, setFormat] = useState('excel')
    const [exporting, setExporting] = useState(false)

    const handleExport = () => {
        if (exporting) return
        setExporting(true)
        try {
            const exportFormat = format === 'csv' ? 'excel' : format
            if (typeof onExport === 'function') {
                onExport(exportFormat)
                setExportModal(false)
                return
            }
            const result = runTableExport(exportFormat, {
                filename,
                rows: Array.isArray(rows) ? rows : [],
                columns,
                title: title || filename,
            })
            if (!result.ok) {
                toast.error(result.reason === 'empty' ? 'No records to export.' : 'Export failed.')
                return
            }
            toast.success(
                exportFormat === 'pdf'
                    ? 'PDF preview opened. Use Print to save the file.'
                    : `Exported ${Array.isArray(rows) ? rows.length : 0} record(s) as Excel.`,
            )
            setExportModal(false)
        } finally {
            setExporting(false)
        }
    }

    return (
        <div>
            {exportModal && (
                <div className='fixed inset-0 z-500 flex items-center justify-center'>
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setExportModal(false)}
                    />

                    <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-lg p-5 py-4">
                        <div className='flex justify-between items-center'>
                            <h2 className='text-xl font-semibold text-black'>Export List</h2>
                            <button type='button' onClick={() => setExportModal(false)} className='hover:text-red-500 cursor-pointer'>
                                <X />
                            </button>
                        </div>
                        <div className='pt-4'>
                            <p className='text-sm font-normal'>{exportDescription}</p>

                            <div className='flex flex-col gap-x-2'>
                                <label htmlFor="" className='text-base font-medium text-[#1E1E1E] my-4'>Choose Format</label>
                                <div className='flex w-full items-center gap-x-6'>
                                    <div className='flex items-center gap-x-2'>
                                        <input type="radio" name="format" id="excel" checked={format === 'excel'} onChange={() => setFormat('excel')} className='w-4 h-4 cursor-pointer border-[#515DEF] text-[#515DEF]' />
                                        <label htmlFor="excel">Excel (XLSX)</label>
                                    </div>
                                    <div className='flex items-center gap-x-2'>
                                        <input type="radio" name="format" id="pdf" checked={format === 'pdf'} onChange={() => setFormat('pdf')} className='w-4 h-4 cursor-pointer border-[#515DEF] text-[#515DEF]' />
                                        <label htmlFor="pdf">PDF</label>
                                    </div>
                                </div>
                            </div>

                            <div className='flex gap-x-4 mt-10'>
                                <button type='button' onClick={() => setExportModal(false)} className='bg-white text-[#77767A] text-sm text-center px-4 py-2.5 rounded-md border border-[#77767A] hover:bg-[#515DEF] hover:text-white hover:border-[#515DEF] transition-all duration-200 cursor-pointer w-full'>
                                    Cancel
                                </button>
                                <button
                                    type='button'
                                    disabled={exporting}
                                    onClick={handleExport}
                                    className='bg-[#515DEF] text-white text-sm text-center px-4 py-2.5 rounded-md border border-[#515DEF] hover:opacity-90 transition-all duration-200 cursor-pointer w-full disabled:opacity-60'
                                >
                                    {exporting ? 'Exporting…' : 'Export'}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default ExportModal
