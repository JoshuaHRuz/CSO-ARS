import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div style="min-height:100vh; display:grid; place-items:center; padding:16px;">
      <div class="cso-card" style="width:100%; max-width:420px; padding:24px;">
        <div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:16px;">
          <img src="/assets/CSO_Secure_logo.png" alt="CSO Secure" style="max-height:60px;" />
          <h2 style="margin:0;">CSO ARS — Automatic Reception System</h2>
          <div class="text-muted-contrast">CSO Secure</div>
        </div>

        <div *ngIf="registered()" class="cso-card" style="padding:10px; background: rgba(41,211,255,0.08); border-color: rgba(41,211,255,0.25); margin-bottom:12px;">
          Cuenta creada correctamente. Ya puedes iniciar sesión.
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
          <button class="cso-btn" type="submit">Entrar</button>
          <div *ngIf="error()" class="cso-warn" role="alert">Ingresa credenciales válidas.</div>
        </form>

        <div class="text-muted-contrast" style="margin-top:12px;">¿No tienes cuenta? <a [routerLink]="['/register']">Crear cuenta</a></div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  user = '';
  pass = '';
  error = signal(false);
  registered = signal(false);

  constructor() {
    const flag = this.route.snapshot.queryParamMap.get('registered');
    if (flag === '1') this.registered.set(true);
  }

  async onSubmit() {
    this.error.set(false);
    const ok = await this.auth.login(this.user, this.pass);
    if (ok) {
      this.router.navigateByUrl('/dashboard');
    } else {
      this.error.set(true);
    }
  }
}
