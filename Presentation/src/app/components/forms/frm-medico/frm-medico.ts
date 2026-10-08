import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';


@Component({
  imports: [MatDialogModule, MatDividerModule],
  selector: 'app-frm-medico',
  styleUrl: './frm-medico.css',
  templateUrl: './frm-medico.html',
})
export class FrmMedico {
  titulo: string = "Formulario de Medico";
}
