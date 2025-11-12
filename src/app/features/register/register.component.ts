import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html'
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
