import { environment } from 'src/environments/environment';

export const API_BASE_URL = environment.apiUrl;

export const API_PROJECTS_URL = `${API_BASE_URL}/api/projects`;
export const API_TASKS_URL = `${API_BASE_URL}/api/tasks`;
export const API_RESOURCES_URL = `${API_BASE_URL}/api/resources`;
export const API_SUPPLIERS_URL = `${API_BASE_URL}/api/suppliers`;
export const API_GM_DASHBOARD_URL = `${API_BASE_URL}/api/gm/dashboard`;
export const API_FINANCE_SETTINGS_URL = `${API_BASE_URL}/api/finance/settings`;
export const API_GM_URL = `${API_BASE_URL}/api/gm`;