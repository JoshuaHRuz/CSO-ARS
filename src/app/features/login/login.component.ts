import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html'
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
