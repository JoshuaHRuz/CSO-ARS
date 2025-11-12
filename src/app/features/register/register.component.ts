import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div style="min-height:100vh; display:grid; place-items:center; padding:16px;">
      <div class="cso-card" style="width:100%; max-width:480px; padding:24px;">
        <div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:16px;">
          <img src="/assets/CSO_Secure_logo.png" alt="CSO Secure" style="max-height:60px;" />
          <h2 style="margin:0;">Crear cuenta</h2>
          <div class="text-muted-contrast">CSO ARS — Automatic Reception System</div>
        </div>

        <form (ngSubmit)="onSubmit()" style="display:grid; gap:12px;">
          <div class="form-field">
            <label for="user">Usuario</label>
            <input id="user" name="user" class="input" [(ngModel)]="user" required />
          </div>
          <div class="form-field">
            <label for="pass">Contraseña</label>
            <input id="pass" name="pass" class="input" type="password" [(ngModel)]="pass" required />
          </div>
          <div class="form-field">
            <label for="pass2">Confirmar contraseña</label>
            <input id="pass2" name="pass2" class="input" type="password" [(ngModel)]="pass2" required />
          </div>

          <div class="cso-card" style="padding:12px; background: rgba(255,255,255,0.03);">
            <div class="text-muted-contrast" style="margin-bottom:6px;">La contraseña debe incluir:</div>
            <ul style="margin:0; padding-left:18px;">
              <li>{{ policy.len ? '✓' : '✗' }} Mínimo 8 caracteres</li>
              <li>{{ policy.upper ? '✓' : '✗' }} Una letra mayúscula (A-Z)</li>
              <li>{{ policy.lower ? '✓' : '✗' }} Una letra minúscula (a-z)</li>
              <li>{{ policy.num ? '✓' : '✗' }} Un número (0-9)</li>
              <li>{{ policy.sym ? '✓' : '✗' }} Un símbolo (!@#$...)</li>
            </ul>
          </div>

          <button class="cso-btn" type="submit">Registrarme</button>
          <div *ngIf="error()" class="cso-warn" role="alert">{{error()}}</div>
          <div class="text-muted-contrast">¿Ya tienes cuenta? <a [routerLink]="['/login']">Inicia sesión</a></div>
        </form>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  user = '';
  pass = '';
  pass2 = '';
  error = signal<string | ''>('');

  get policy() {
    const p = this.pass || '';
    return {
      len: p.length >= 8,
      upper: /[A-Z]/.test(p),
      lower: /[a-z]/.test(p),
      num: /\d/.test(p),
      sym: /[^A-Za-z0-9]/.test(p)
    };
  }

  async onSubmit() {
    this.error.set('');
    if (this.pass !== this.pass2) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    const res = await this.auth.register(this.user, this.pass);
    if (!res.ok) {
      this.error.set(res.error || 'No fue posible registrar al usuario.');
      return;
    }
    // Navigate to login with success flag
    this.router.navigateByUrl('/login?registered=1');
  }
}
