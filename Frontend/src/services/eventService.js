import api from './api'

export const getEvents = async () => (await api.get('/events')).data.events
export const getEventDetail = async (id) => (await api.get(`/events/${id}`)).data
export const getMyEvents = async () => (await api.get('/events/mine')).data.events

// formData = FormData object (has the optional poster file)
export const saveEvent = (id, formData) =>
  id ? api.put(`/events/${id}`, formData) : api.post('/events', formData)

export const removeEvent = (id) => api.delete(`/events/${id}`)
export const registerForEvent = (id, body) => api.post(`/events/${id}/register`, body)
export const getRegistrations = async (id) => (await api.get(`/events/${id}/registrations`)).data
export const reviewRegistration = (regId, status, remark) =>
  api.patch(`/events/registrations/${regId}`, { status, remark })

export const downloadCsv = async (id, title) => {
  const res = await api.get(`/events/${id}/registrations/csv`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `${String(title || 'event').replace(/[^a-z0-9]+/gi, '_')}_registrations.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }) : ''

// Date -> "YYYY-MM-DD" (IST) for <input type="date">
export const toInputDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : ''

export const typeColors = {
  hackathon: 'bg-purple-100 text-purple-700',
  function: 'bg-pink-100 text-pink-700',
  workshop: 'bg-amber-100 text-amber-700',
  seminar: 'bg-sky-100 text-sky-700',
  notice: 'bg-slate-100 text-slate-700',
}

export const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}