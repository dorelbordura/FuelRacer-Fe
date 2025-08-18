export default function useAuthHeader() {
  const token = localStorage.getItem('fr_jwt')
  return token ? { Authorization: `Bearer ${token}` } : {}
}
