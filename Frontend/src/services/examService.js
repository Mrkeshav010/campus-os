import api from './api'

// Teacher / HOD
export const aiGenerateQuestions = (payload) => api.post('/exams/ai-generate', payload)
export const createExam = (payload) => api.post('/exams', payload)
export const getManagedExams = () => api.get('/exams/manage')
export const deleteExam = (id) => api.delete(`/exams/${id}`)
export const getSubmissions = (id) => api.get(`/exams/${id}/submissions`)
export const getAttempt = (attemptId) => api.get(`/exams/attempts/${attemptId}`)
export const approveAttempt = (attemptId, payload) => api.patch(`/exams/attempts/${attemptId}/approve`, payload)

// Student
export const getStudentExams = () => api.get('/exams/student')
export const startExam = (id) => api.post(`/exams/${id}/start`)
export const saveAnswer = (id, payload) => api.post(`/exams/${id}/answer`, payload)
export const submitExam = (id) => api.post(`/exams/${id}/submit`)
export const getMyResults = () => api.get('/exams/results/my')