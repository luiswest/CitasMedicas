import { Component, inject } from '@angular/core';
import { FrmLogin } from '../forms/frm-login/frm-login';
import { MatDialog } from '@angular/material/dialog';

@Component({
  imports: [],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private readonly dialogo = inject(MatDialog);

  mostrarDialogo() {
    const dialogoRef = this.dialogo.open(FrmLogin, {
      width: '100%',
      maxWidth: '400px',
      disableClose: true
    });
  }
  
  ngOnInit(): void {
    this.mostrarDialogo();
  }  
}
