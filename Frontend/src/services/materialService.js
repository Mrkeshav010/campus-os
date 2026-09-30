import api from './api'

export const uploadMaterial = (formData) =>
  api.post('/materials', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)

export const getMyUploads = () => api.get('/materials/mine').then((r) => r.data.materials)

export const getStudentMaterials = () => api.get('/materials/my').then((r) => r.data.materials)

export const deleteMaterial = (id) => api.delete(`/materials/${id}`).then((r) => r.data)