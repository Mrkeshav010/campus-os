import api from './api'

export const askAI = (payload) => {
  const body = Array.isArray(payload) ? { messages: payload } : payload
  return api.post('/ai/ask', body)
}

export const generateNaacAudit = (focus = '') => api.post('/ai/naac-audit', { focus })
