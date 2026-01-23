/**
 * Authentication Service
 * Handles patient and nurse login with localStorage persistence
 */

export type UserRole = 'patient' | 'nurse';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  roomNumber?: string;
  token: string;
}

const STORAGE_KEY = 'attune_user';
const DEMO_PATIENTS = [
  { id: 'PATIENT_001', name: 'John Doe', room: '305' },
  { id: 'PATIENT_002', name: 'Rayhan Patel', room: '42B' },
  { id: 'PATIENT_003', name: 'Sourish Kumar', room: '17C' },
];

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    this.loadUserFromStorage();
  }

  /**
   * Load user from localStorage if available
   */
  private loadUserFromStorage(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  /**
   * Patient login
   */
  loginPatient(
    patientId: string,
    roomNumber: string
  ): { success: boolean; user?: User; error?: string } {
    const patient = DEMO_PATIENTS.find((p) => p.id === patientId);

    if (!patient) {
      return { success: false, error: 'Invalid patient ID' };
    }

    const user: User = {
      id: patientId,
      name: patient.name,
      role: 'patient',
      roomNumber: roomNumber || patient.room,
      token: this.generateToken('patient', patientId),
    };

    this.currentUser = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    return { success: true, user };
  }

  /**
   * Nurse login
   */
  loginNurse(nurseId: string, name: string): {
    success: boolean;
    user?: User;
    error?: string;
  } {
    if (!nurseId || nurseId.length < 3) {
      return { success: false, error: 'Invalid nurse ID' };
    }

    const user: User = {
      id: nurseId,
      name: name || `Nurse ${nurseId}`,
      role: 'nurse',
      token: this.generateToken('nurse', nurseId),
    };

    this.currentUser = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    return { success: true, user };
  }

  /**
   * Logout
   */
  logout(): void {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Check if user is a patient
   */
  isPatient(): boolean {
    return this.currentUser?.role === 'patient';
  }

  /**
   * Check if user is a nurse
   */
  isNurse(): boolean {
    return this.currentUser?.role === 'nurse';
  }

  /**
   * Generate mock token
   */
  private generateToken(role: UserRole, id: string): string {
    const timestamp = Date.now();
    return `${role}_${id}_${timestamp}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Get demo patients for selection
   */
  getDemoPatients() {
    return DEMO_PATIENTS;
  }
}

export default new AuthService();
