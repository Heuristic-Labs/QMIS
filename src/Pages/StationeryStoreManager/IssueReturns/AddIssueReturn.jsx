import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import IssueReturnInfo from './Components/IssueReturnInfo'
import { getIssueReturns, hydrateIssueReturnsFromApi, saveIssueReturns } from './issueReturnsData'
import { getInventoryItems, hydrateInventoryItemsFromApi, saveInventoryItems } from '../Inventory/inventoryData'

const deriveStatus = (qty, reorder) => {
    if (qty <= 0) return 'Out of Stock'
    if (Number.isFinite(reorder) && qty <= reorder) return 'Low Stock'
    return 'Available'
}

const formatDisplayDate = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
    }
    return date.toLocaleDateString('en-GB').replace(/\//g, '-')
}

const AddIssueReturn = () => {
    const navigate = useNavigate()
    const [form, setForm] = useState({
        activityType: 'Issue',
        employeeName: '',
        employeeId: '',
        department: '',
        remarks: '',
        purpose: '',
        originalIssueRef: '',
        condition: 'Good',
        issueDate: new Date(),
        returnDate: new Date(),
        lines: [{ itemName: '', quantity: '', availableStock: '—' }],
    })
    const [saving, setSaving] = useState(false)

    const save = async () => {
        const activityType = form.activityType || 'Issue'
        const lines = (form.lines || []).filter((row) => row.itemName && Number(row.quantity) > 0)
        if (!form.employeeName || !form.department || !lines.length) {
            toast.error('Employee, department, and at least one product with quantity are required.')
            return
        }
        if (activityType === 'Return' && !form.originalIssueRef) {
            toast.error('Original Issue Reference is required for returns.')
            return
        }

        setSaving(true)
        try {
            await Promise.all([hydrateIssueReturnsFromApi(), hydrateInventoryItemsFromApi()])
            let inventory = getInventoryItems()

            for (const line of lines) {
                const qty = Number(line.quantity)
                const item = inventory.find((row) => row.itemName === line.itemName)
                if (!item) {
                    toast.error(`Item not found in inventory: ${line.itemName}`)
                    return
                }
                const available = Number(item.availableQuantity) || 0
                let nextQty = available
                if (activityType === 'Issue') {
                    if (qty > available) {
                        toast.error(`Cannot issue ${qty} of ${line.itemName}. Only ${available} available.`)
                        return
                    }
                    nextQty = available - qty
                } else if (form.condition !== 'Lost' && form.condition !== 'Damaged') {
                    nextQty = available + qty
                }
                const unit = Number(String(item.unitCost || '').replace(/[^\d.]/g, '')) || 0
                inventory = inventory.map((row) => (
                    row.itemId === item.itemId
                        ? {
                            ...row,
                            availableQuantity: nextQty,
                            status: deriveStatus(nextQty, Number(row.reorderLevel)),
                            stockValue: `₹${(nextQty * unit).toLocaleString('en-IN')}`,
                        }
                        : row
                ))
            }

            const inventorySaved = await saveInventoryItems(inventory)
            if (inventorySaved === false || inventorySaved?.success === false) {
                toast.error(inventorySaved?.message || 'Could not update inventory quantity.')
                return
            }

            const batchId = `IR-${Date.now()}`
            const records = lines.map((line, index) => {
                const item = inventory.find((row) => row.itemName === line.itemName)
                return {
                    id: lines.length === 1 ? batchId : `${batchId}-${index + 1}`,
                    batchId,
                    activityType,
                    requestedBy: form.employeeName,
                    employeeId: form.employeeId,
                    department: form.department,
                    itemName: line.itemName,
                    quantity: Number(line.quantity),
                    remarks: form.remarks,
                    purpose: form.purpose,
                    status: activityType === 'Return' ? 'Returned' : 'Issued',
                    issueDate: activityType === 'Issue' ? formatDisplayDate(form.issueDate) : '—',
                    returnDate: activityType === 'Return' ? formatDisplayDate(form.returnDate) : '—',
                    availableStock: item?.availableQuantity ?? null,
                    originalIssueRef: activityType === 'Return' ? form.originalIssueRef : null,
                    condition: activityType === 'Return' ? (form.condition || 'Good') : null,
                }
            })

            const saved = await saveIssueReturns([...records, ...getIssueReturns()])
            if (!saved) {
                toast.error('The stock movement could not be saved.')
                return
            }
            toast.success(
                activityType === 'Issue'
                    ? `Issued ${lines.length} product line(s). Inventory updated.`
                    : `Return recorded for ${lines.length} product line(s). Inventory updated.`,
            )
            navigate('/stationery-store-manager/issue-returns')
        } finally {
            setSaving(false)
        }
    }

    return (
        <section>
            <div className='bg-white rounded-2xl shadow-md p-4'>
                <h2 className='text-xl font-semibold text-black'>Record Issue / Return</h2>
                <p className='text-sm text-[#667085] mt-1'>
                    Add multiple products in one transaction. Issue deducts stock; Good returns restore stock.
                </p>
                <IssueReturnInfo value={form} onChange={setForm} />
            </div>

            <div className='flex sm:justify-end justify-center gap-x-4 mt-6'>
                <button type='button' onClick={() => navigate('/stationery-store-manager/issue-returns')} className='bg-white text-[#515DEF] text-sm text-center px-12 py-2 rounded-md border border-[#515DEF] hover:bg-[#515DEF] hover:text-white hover:border-[#515DEF] transition-all duration-200 cursor-pointer md:w-auto w-full'>
                    Discard Changes
                </button>
                <button type='button' disabled={saving} onClick={save} className='bg-[#515DEF] text-white text-sm text-center px-12 py-2 rounded-md border border-[#515DEF] hover:opacity-90 transition-all duration-200 cursor-pointer md:w-auto w-full disabled:opacity-60'>
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </section>
    )
}

export default AddIssueReturn
