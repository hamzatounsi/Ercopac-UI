import { environment } from 'src/environments/environment';

export const API_BASE_URL = environment.apiUrl;

export const API_AUTH_URL = `${API_BASE_URL}/auth`;
export const API_PROJECTS_URL = `${API_BASE_URL}/projects`;
export const API_TASKS_URL = `${API_BASE_URL}/tasks`;
export const API_RESOURCES_URL = `${API_BASE_URL}/resources`;
export const API_SUPPLIERS_URL = `${API_BASE_URL}/suppliers`;
export const API_GM_DASHBOARD_URL = `${API_BASE_URL}/gm/dashboard`;
export const API_FINANCE_SETTINGS_URL = `${API_BASE_URL}/finance/settings`;
export const API_GM_URL = `${API_BASE_URL}/gm`;
export const API_ADMIN_URL = `${API_BASE_URL}/admin`;
export const API_PLATFORM_URL = `${API_BASE_URL}/platform`;