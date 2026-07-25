import { request } from './apiClient';

export interface StaffMember {
  id: string;
  dentistId?: string;
  name: string;
  role: 'dentist' | 'receptionist' | 'cashier' | 'manager';
  roleName: string;
  phone: string;
  email: string;
  avatar: string;
  status: 'Active' | 'Inactive';
  permissions: {
    admission: boolean;
    clinical: boolean;
    checkout: boolean;
    settings: boolean;
  };
}

export const staffApi = {
  getStaff: () => request<StaffMember[]>('/staff'),
  
  createStaff: (data: { name: string; role: string; phone: string; email?: string; password?: string }) => 
    request<{ id: string; name: string; role: string; phone: string; email?: string }>('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  togglePermission: (id: string, key: string) => 
    request<any>(`/staff/${id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ key }),
    }),
    
  toggleStatus: (id: string) => 
    request<{ id: string; status: 'Active' | 'Inactive' }>(`/staff/${id}/status`, {
      method: 'PATCH',
    }),

  updateStaff: (id: string, data: { name?: string; role?: string; phone?: string; email?: string; password?: string }) =>
    request<any>(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteStaff: (id: string) =>
    request<any>(`/staff/${id}`, {
      method: 'DELETE',
    }),
};
