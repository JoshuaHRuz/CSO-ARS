import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

interface StoredUser { u: string; s: string; h: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly KEY = 'cso-auth';
  private readonly USERS = 'cso-users';
  private router = inject(Router);

  // Utility: base64 encode/decode ArrayBuffer/Uint8Array
  private toB64(bytes: Uint8Array): string {
    let str = '';
    bytes.forEach(b => str += String.fromCharCode(b));
    return btoa(str);
  }
  private fromB64(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  private async sha256(data: ArrayBuffer): Promise<Uint8Array> {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(buf);
  }

  private async hashPassword(password: string, saltB64: string): Promise<string> {
    const salt = this.fromB64(saltB64);
    // simple concat: salt || utf8(password)
    const enc = new TextEncoder();
    const pw = enc.encode(password);
    const combined = new Uint8Array(salt.length + pw.length);
    combined.set(salt, 0);
    combined.set(pw, salt.length);
    const digest = await this.sha256(combined.buffer);
    return this.toB64(digest);
  }

  private loadUsers(): StoredUser[] {
    try {
      const raw = localStorage.getItem(this.USERS);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr as StoredUser[];
      return [];
    } catch {
      return [];
    }
  }

  private saveUsers(users: StoredUser[]): void {
    localStorage.setItem(this.USERS, JSON.stringify(users));
  }

  async register(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const u = username?.trim();
    const p = password ?? '';
    if (!u) return { ok: false, error: 'El usuario es requerido.' };
    if (!this.meetsPolicy(p)) return { ok: false, error: 'La contraseña no cumple la política de seguridad.' };

    const users = this.loadUsers();
    if (users.some(x => x.u.toLowerCase() === u.toLowerCase())) {
      return { ok: false, error: 'El usuario ya existe.' };
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltB64 = this.toB64(salt);
    const hashB64 = await this.hashPassword(p, saltB64);
    users.push({ u, s: saltB64, h: hashB64 });
    this.saveUsers(users);
    return { ok: true };
  }

  async login(username: string, password: string): Promise<boolean> {
    const u = username?.trim();
    const p = password ?? '';
    if (!u || !p) return false;

    const users = this.loadUsers();
    if (users.length === 0) {
      // Demo mode (no registered users): accept any non-empty credentials
      localStorage.setItem(this.KEY, '1');
      return true;
    }

    const found = users.find(x => x.u.toLowerCase() === u.toLowerCase());
    if (!found) return false;
    const hashB64 = await this.hashPassword(p, found.s);
    const ok = hashB64 === found.h;
    if (ok) localStorage.setItem(this.KEY, '1');
    return ok;
  }

  isAuthenticated(): boolean {
    return localStorage.getItem(this.KEY) === '1';
  }

  logout(): void {
    localStorage.removeItem(this.KEY);
    this.router.navigateByUrl('/login');
  }

  // Password policy: >=8, upper, lower, number, special
  meetsPolicy(p: string): boolean {
    if (!p || p.length < 8) return false;
    const hasUpper = /[A-Z]/.test(p);
    const hasLower = /[a-z]/.test(p);
    const hasNumber = /\d/.test(p);
    const hasSpecial = /[^A-Za-z0-9]/.test(p);
    return hasUpper && hasLower && hasNumber && hasSpecial;
  }
}
