import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MedicoService } from '../../shared/services/medico-service';
import { MedicoCreateInput, MedicoModel } from '../../shared/models/medico-model';
import { FrmMedico } from '../forms/frm-medico/frm-medico';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

@Component({
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule],
  selector: 'app-medico-component',
  styleUrl: './medico-component.css',
  templateUrl: './medico-component.html',
})
export class MedicoComponent implements OnInit {
  buscarID = signal<number | null>(null);
  //medicoSeleccionado = signal<MedicoModel | null>(null);
  filtro : { nombre: string; cedula: string; especialidad: string } = { nombre: '', cedula: '', especialidad: '' };
  displayedColumns: string[] = [
    'id',
    'nombre_completo',
    'especialidad_nombre',
    'licencia',
    'telefono',
    'botonera'
  ];

  dataSource = signal<MedicoModel[]>([]);

  srvMedico = inject(MedicoService);
  dialog = inject(MatDialog);

  constructor() {
    effect(() => {
      const respuesta = this.srvMedico.medicos.value();
      if (respuesta !== undefined) {
        this.dataSource.set(respuesta.data);
      }
    });

    effect(() => {
      const id = this.buscarID();
      const respuesta = this.srvMedico.medicoPorId;

      if (id === null) {
        return;
      }

      if (respuesta.status() === 'resolved') {
        const medico = respuesta.value()?.data;
/*         if (medico === null) {
         // this.medicoSeleccionado.set(null);
          alert('No se encontró el médico');
          return;
        }
        if (medico?.id !== id) {
          return;
        } */

        //this.medicoSeleccionado.set(medico);
        this.mostrarDialogo('Editar Médico', medico!, false, id);
      } else if (respuesta.status() === 'error') {
        console.error(`No se pudo buscar el médico con ID ${id}:`, respuesta.error());
        alert('No se pudo cargar el médico');
      }
    });
  }
  private resetearFiltro() {
    this.filtro = { nombre: '', cedula: '', especialidad: '' };
    this.filtrarMedicos();
  }
  private filtrarMedicos() {
    this.srvMedico.filtrar(this.filtro);
  }

  public mostrarDialogo(titulo: string, datos?: MedicoModel, info?: boolean, id?: number) {
    const dialogRef = this.dialog.open<FrmMedico, unknown, MedicoCreateInput | false | undefined>(FrmMedico, {
      width: '50vw',
      maxWidth: '35rem',
      data: {
        title: titulo,
        data: datos,
        info: info
      },
      disableClose : true
    });
    dialogRef.afterClosed().subscribe((medicoCreado) => {
      if (medicoCreado === undefined || medicoCreado === false) {
        return;
      }

      this.srvMedico.guardar(medicoCreado, id).subscribe({
        complete: () => {
          this.resetearFiltro();
          alert(id === undefined ? 'Datos creados' : 'Datos actualizados');
        },
        error: (error: unknown) => {
          console.error('No se pudo guardar el médico:', error);
          alert('No se pudo guardar el médico');
        },
      });
    });
  } //Fin de mostrarDialogo  
  onCreate() {
    this.buscarID.set(null);
  //  this.medicoSeleccionado.set(null);
    this.mostrarDialogo('Nuevo Médico');
  }
  onEdit(id: number) {
    this.buscarID.set(id);
   // this.medicoSeleccionado.set(null);
    this.srvMedico.buscarPorId(id);
  }
  onInfo(medico: number) {
    //this.mostrarDialogo('Ver Cliente', medico, true);
    console.log('Ver cliente:', medico);
  }
  onDelete(medico: number) {
    // Implementar la lógica para eliminar el cliente
    console.log('Eliminar cliente:', medico);
  }
  onResetPassw(medico: number) {
    // Implementar la lógica para restablecer la contraseña del cliente
    console.log('Restablecer contraseña del cliente:', medico);
  }
  ngOnInit(): void {
    this.resetearFiltro();
  }
}
