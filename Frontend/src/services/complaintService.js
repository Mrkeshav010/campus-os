import api from './api'

export const createComplaint = (payload) => api.post('/complaints', payload).then((r) => r.data)

export const getMyComplaints = () => api.get('/complaints/my').then((r) => r.data.complaints)

export const getAllComplaints = () => api.get('/complaints').then((r) => r.data.complaints)

export const updateComplaintStatus = (id, status) =>
  api.patch(`/complaints/${id}/status`, { status }).then((r) => r.data)

export const getComplaintAnalytics = () => api.get('/complaints/analytics').then((r) => r.data)