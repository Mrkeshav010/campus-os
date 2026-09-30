import api from './api'

export const getMyLeaves = () => api.get('/leave/my').then((r) => r.data.leaves)

export const createLeave = (payload) => api.post('/leave', payload).then((r) => r.data)

export const getPending = () => api.get('/leave/pending').then((r) => r.data.leaves)

export const getHistory = () => api.get('/leave/history').then((r) => r.data.leaves)

export const reviewLeave = (id, status, reviewNote) =>
  api.patch(`/leave/${id}/review`, { status, reviewNote }).then((r) => r.data)