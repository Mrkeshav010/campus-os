import api from './api'

export const getMyAttendance = () => api.get('/attendance/my-percentage').then((r) => r.data.subjects)

export const markAttendance = (sessionCode) =>
  api.post('/attendance/mark', { sessionCode }).then((r) => r.data)

export const createSession = (payload) => api.post('/attendance/session', payload).then((r) => r.data)

export const getSessionAttendees = (id) =>
  api.get(`/attendance/session/${id}/attendees`).then((r) => r.data)