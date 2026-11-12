import React from 'react'
import { SimpleRegister } from '../../../Common/demoDomain/DemoScreens'
import { MAINT_REQUEST_KEY, MAINT_REQUEST_SEED } from '../maintenanceOpsData'

const StoreRequests = () => (
    <SimpleRegister
        title="Store Requests"
        description="Request materials from Store for Maintenance repairs. Approvals follow Store Officer / JD chain (PDF §4.4). Does not bypass Finance or Store controls."
        storageKey={MAINT_REQUEST_KEY}
        seed={MAINT_REQUEST_SEED}
        idPrefix="MRQ-2026-"
        columns={[
            { key: 'id', label: 'Request' },
            { key: 'requestType', label: 'Type' },
            { key: 'item', label: 'Item' },
            { key: 'quantity', label: 'Qty' },
            { key: 'status', label: 'Status' },
            { key: 'approver', label: 'Approver' },
        ]}
        fields={[
            {
                key: 'requestType',
                label: 'Request Type',
                type: 'select',
                options: ['Store Issue', 'Returnable Issue', 'Material Return', 'New Product Request'],
            },
            { key: 'item', label: 'Item', required: true },
            { key: 'quantity', label: 'Quantity', type: 'number', required: true },
            { key: 'requestedBy', label: 'Requested By' },
            { key: 'department', label: 'Department' },
            { key: 'approver', label: 'Approver' },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: ['Pending', 'Approved', 'Issued', 'Returned', 'Rejected'],
            },
            { key: 'remarks', label: 'Remarks', type: 'textarea' },
        ]}
    />
)

export default StoreRequests
