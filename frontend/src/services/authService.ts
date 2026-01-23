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

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    this.loadUserFromStorage();
  }

  /**
   * Load user from sessionStorage if available (per-tab sessions)
   */
  private loadUserFromStorage(): void {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  /**
   * Patient login with custom name and room
   */
  loginPatient(
    patientName: string,
    roomNumber: string
  ): { success: boolean; user?: User; error?: string } {
    if (!patientName || patientName.length < 2) {
      return { success: false, error: 'Patient name must be at least 2 characters' };
    }

    if (!roomNumber || roomNumber.length < 1) {
      return { success: false, error: 'Room number is required' };
    }

    const patientId = `PATIENT_${Date.now()}`;

    const user: User = {
      id: patientId,
      name: patientName,
      role: 'patient',
      roomNumber: roomNumber,
      token: this.generateToken('patient', patientId),
    };

    this.currentUser = user;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));

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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    return { success: true, user };
  }

  /**
   * Logout
   */
  logout(): void {
    this.currentUser = null;
    sessionStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    this.loadUserFromStorage();
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
}

export default new AuthService();
