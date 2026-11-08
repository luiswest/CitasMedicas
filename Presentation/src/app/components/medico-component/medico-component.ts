import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MedicoService } from '../../shared/services/medico-service';
import { MedicoCreateInput, MedicoModel } from '../../shared/models/medico-model';
import { FrmMedico } from '../forms/frm-medico/frm-medico';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';
import { PrintService } from '../../shared/services/print.service';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { form, FormField } from '@angular/forms/signals';
type FilterForm = {
  nombre: string;
  especialidad: string;
  licencia: string;
};
@Component({
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, 
    MatDialogModule, MatExpansionModule, MatFormFieldModule, MatInputModule,
  FormField],
  selector: 'app-medico-component',
  styleUrl: './medico-component.css',
  templateUrl: './medico-component.html',
})
export class MedicoComponent implements OnInit {
  buscarID = signal<number | null>(null);
  filtro : { nombre: string; cedula: string; especialidad: string} = { nombre: '', cedula: '', especialidad: ''};
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
  private readonly srvPrint = inject(PrintService);
  dialog = inject(MatDialog);
  panelFilterState = signal(false);

  objFilter = signal<FilterForm>({
    nombre : '',
    especialidad : '',
    licencia: ''
  });

  frmFilter = form(this.objFilter, (s) => {
    s.nombre;
    s.especialidad;
    s.licencia;
  });  


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


        this.mostrarDialogo('Editar Médico', medico!, false, id);
      } else if (respuesta.status() === 'error') {
        console.error(`No se pudo buscar el médico con ID ${id}:`, respuesta.error());
        alert('No se pudo cargar el médico');
      }
    });
  }
  private resetearFiltro() {
    this.filtro = { nombre: '', cedula: '', especialidad: ''};
    this.filtrarMedicos();
  }
  private filtrarMedicos() {
    this.srvMedico.filtrar(this.filtro);
  }
  private alertar(icono: string, mensaje: string, textoAceptar: string) {
    this.dialog.open(DialogoGeneral, {
      width: '30vw',
      maxWidth: '20rem',
      data: {
        icono: icono,
        texto: mensaje,
        textoAceptar: textoAceptar
      }
    });
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
          // alert(id === undefined ? 'Datos creados' : 'Datos actualizados');
          this.dialog.open(DialogoGeneral, {
            width: '30vw',
            maxWidth: '20rem',
            data: {
              icono: 'check',
              texto: id === undefined ? 'Datos creados' : 'Datos actualizados',
              textoAceptar: ' Aceptar '
            }
          });
          // this.alertar('check', id === undefined ? 'Datos creados' : 'Datos actualizados', ' Aceptar '); hacer así
        },
        error: (error) => {
          // console.error('No se pudo guardar el médico:', error);
          this.alertar('error', 'No se pudo guardar el médico', ' Aceptar ');
        },
      });
    });
  } //Fin de mostrarDialogo  

  onCreate() {
    this.buscarID.set(null);

    this.mostrarDialogo('Nuevo Médico');
  }
  onEdit(id: number) {
    this.buscarID.set(id);

    this.srvMedico.buscarPorId(id);
  }
  onInfo(medico: number) {

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
  onPrint(): void {
    const columnas = ['Id', 'Nombre', 'Especialidad', 'Licencia', 'Teléfono'];
    const filas = this.dataSource().map((fila) => [
      fila.id?.toString() ?? '',
      fila.nombre_completo,
      fila.especialidad_nombre ?? '',
      fila.licencia ?? '',
      fila.telefono ?? '',
      fila.username ?? ''
    ]);
    this.srvPrint.print(columnas, filas, 'Catálogo de médicos');
  }
  onFilterClose() {

  }
  toggleFilterPanel(): void {
    this.panelFilterState.update((isOpen) => !isOpen);
  }

  onFilterChange() {
    this.filtro.nombre = this.objFilter().nombre;
    this.filtro.especialidad = this.objFilter().especialidad;
    this.filtro.cedula = this.objFilter().licencia;
    // console.log(this.filtro);
    this.filtrarMedicos();
  }

  ngOnInit(): void {
    this.resetearFiltro();
  }
}
