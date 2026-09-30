import api from './api'

export const requestCertificate = (payload) => api.post('/certificates', payload).then((r) => r.data)

export const getMyCertificates = () => api.get('/certificates/my').then((r) => r.data.certs)

export const getPendingCertificates = () => api.get('/certificates/pending').then((r) => r.data.certs)

export const approveCertificate = (id) => api.patch(`/certificates/${id}/approve`).then((r) => r.data)

export const rejectCertificate = (id, reason) =>
  api.patch(`/certificates/${id}/reject`, { reason }).then((r) => r.data)

export const verifyCertificate = (certificateId) => api.get(`/verify/${certificateId}`).then((r) => r.data)