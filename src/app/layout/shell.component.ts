import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="cso-toolbar">
      <div class="brand">
        <img src="/assets/CSO_Secure_logo.png" alt="CSO Secure" style="width: 5rem; height: 5rem"/>
        <strong>CSO ARS — Automatic Reception System</strong>
      </div>
      <div>
        <button class="cso-btn" (click)="logout()">Salir</button>
      </div>
    </header>

    <div class="cso-layout">
      <nav class="cso-sidenav">
        <a [routerLink]="['/dashboard']" routerLinkActive="active">Dashboard</a>
        <a class="disabled">Entregas</a>
        <a class="disabled">Reportes</a>
        <a class="disabled">Configuración</a>
      </nav>
      <main class="cso-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class ShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.auth.logout();
  }
}
