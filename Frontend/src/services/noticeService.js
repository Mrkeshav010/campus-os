import api from './api'

export const getMyNotices = () => api.get('/notices').then((r) => r.data.notices)

export const getFacultyNotices = () => api.get('/notices/faculty').then((r) => r.data.notices)

export const getAllNotices = () => api.get('/notices/all').then((r) => r.data.notices)

export const createNotice = (payload) => api.post('/notices', payload).then((r) => r.data)

export const deleteNotice = (id) => api.delete(`/notices/${id}`).then((r) => r.data)