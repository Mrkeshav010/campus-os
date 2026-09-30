import api from './api'

export const createFeeQuery = (subject, message) =>
  api.post('/fee-queries', { subject, message }).then((r) => r.data)

export const getMyFeeQueries = () => api.get('/fee-queries/my').then((r) => r.data.queries)

export const getAllFeeQueries = () => api.get('/fee-queries').then((r) => r.data.queries)

export const replyToFeeQuery = (id, message) =>
  api.post(`/fee-queries/${id}/reply`, { message }).then((r) => r.data)

export const resolveFeeQuery = (id) => api.patch(`/fee-queries/${id}/resolve`).then((r) => r.data)