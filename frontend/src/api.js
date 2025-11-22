import axios from 'axios';

export const READ_API = import.meta.env.VITE_READ_API || 'http://localhost:4001';
export const WRITE_API = import.meta.env.VITE_WRITE_API || 'http://localhost:4000';

const readClient = axios.create({ baseURL: READ_API });
const writeClient = axios.create({ baseURL: WRITE_API });

export default { readClient, writeClient };