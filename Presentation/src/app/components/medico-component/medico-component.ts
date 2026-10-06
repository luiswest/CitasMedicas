import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MedicoService } from '../../shared/services/medico-service';
import { MedicoModel } from '../../shared/models/medico-model';

@Component({
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule],
  selector: 'app-medico-component',
  styleUrl: './medico-component.css',
  templateUrl: './medico-component.html',
})
export class MedicoComponent implements OnInit {
  displayedColumns: string[] = [
    'id',
    'nombre_completo',
    'especialidad_nombre',
    'licencia',
    'telefono',
  ];

  dataSource = signal<MedicoModel[]>([]);

  srvMedico = inject(MedicoService);

  constructor() {
    effect(() => {
      const respuesta = this.srvMedico.medicos.value();
      if (respuesta !== undefined) {
        console.log(respuesta.data);
        this.dataSource.set(respuesta.data);
      }
    });
  }

  ngOnInit(): void {
    this.srvMedico.filtrar({ nombre: '', cedula: '', especialidad: '' });
  }
}
