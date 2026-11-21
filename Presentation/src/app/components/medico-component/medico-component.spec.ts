import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MedicoComponent } from './medico-component';
import { MedicoService } from '../../shared/services/medico-service';
import { PrintService } from '../../shared/services/print.service';
import { FrmMedico } from '../forms/frm-medico/frm-medico';
import { DialogoGeneral } from '../forms/dialogo-general/dialogo-general';
import { MedicoCreateInput, MedicoModel } from '../../shared/models/medico-model';

/** Doble de MedicoService: los httpResource se sustituyen por signals controlables desde el test. */
function crearMedicoServiceFalso() {
  return {
    medicos: {
      value: signal<{ data: MedicoModel[] } | undefined>(undefined),
      isLoading: signal(false),
      status: signal('idle'),
      error: signal<unknown>(undefined),
    },
    medicoPorId: {
      value: signal<{ data: MedicoModel | null } | undefined>(undefined),
      isLoading: signal(false),
      status: signal('idle'),
      error: signal<unknown>(undefined),
    },
    filtrar: vi.fn(),
    buscarPorId: vi.fn(),
    guardar: vi.fn(),
  };
}

describe('MedicoComponent', () => {
  let component: MedicoComponent;
  let fixture: ComponentFixture<MedicoComponent>;
  let srvMedico: ReturnType<typeof crearMedicoServiceFalso>;
  let srvPrint: { print: ReturnType<typeof vi.fn> };
  let dialogOpen: ReturnType<typeof vi.fn>;

  const medico: MedicoModel = {
    id: 1,
    nombre_completo: 'Ana Médica',
    especialidad_id: 2,
    especialidad_nombre: 'Cardiología',
    licencia: 'LIC-123',
    telefono: '8888-1234',
    username: 'ana',
  };
  const medicoForm: MedicoCreateInput = {
    nombre_completo: 'Ana Médica',
    especialidad_id: 2,
    licencia: 'LIC-123',
    telefono: '8888-1234',
  };
  const filtroVacio = { nombre: '', cedula: '', especialidad: '' };

  /** Hace que la próxima llamada a dialog.open devuelva un diálogo que se cierra con `resultado`. */
  const cerrarDialogoCon = (resultado: unknown) =>
    dialogOpen.mockReturnValueOnce({ afterClosed: () => of(resultado) } as unknown as MatDialogRef<unknown>);

  const textoPagina = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    srvMedico = crearMedicoServiceFalso();
    srvPrint = { print: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MedicoComponent],
      providers: [
        { provide: MedicoService, useValue: srvMedico },
        { provide: PrintService, useValue: srvPrint },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicoComponent);
    component = fixture.componentInstance;
    // Por defecto los diálogos se cierran sin datos (cancelar)
    dialogOpen = vi
      .spyOn(component.dialog, 'open')
      .mockReturnValue({ afterClosed: () => of(undefined) } as unknown as MatDialogRef<unknown>) as never;
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('se crea el componente', () => {
    expect(component).toBeTruthy();
  });

  describe('carga inicial y tabla', () => {
    it('ngOnInit solicita el listado con el filtro vacío', () => {
      expect(srvMedico.filtrar).toHaveBeenCalledTimes(1);
      expect(srvMedico.filtrar).toHaveBeenCalledWith(filtroVacio);
    });

    it('copia en dataSource los médicos que entrega el servicio', () => {
      srvMedico.medicos.value.set({ data: [medico] });
      TestBed.tick();

      expect(component.dataSource()).toEqual([medico]);
    });

    it('muestra en la tabla una fila por médico con sus datos', () => {
      srvMedico.medicos.value.set({ data: [medico, { ...medico, id: 2, nombre_completo: 'Luis Médico' }] });
      fixture.detectChanges();

      const filas = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(filas.length).toBe(2);
      expect(filas[0].textContent).toContain('Ana Médica');
      expect(filas[0].textContent).toContain('Cardiología');
      expect(filas[0].textContent).toContain('LIC-123');
      expect(filas[0].textContent).toContain('8888-1234');
      expect(filas[1].textContent).toContain('Luis Médico');
    });

    it('muestra "Tabla vacía" mientras no hay respuesta del servicio', () => {
      expect(textoPagina()).toContain('Tabla vacía');

      srvMedico.medicos.value.set({ data: [] });
      fixture.detectChanges();
      expect(textoPagina()).not.toContain('Tabla vacía');
    });

    it('muestra "Cargando..." mientras el listado está cargando', () => {
      srvMedico.medicos.isLoading.set(true);
      fixture.detectChanges();
      expect(textoPagina()).toContain('Cargando...');

      srvMedico.medicos.isLoading.set(false);
      fixture.detectChanges();
      expect(textoPagina()).not.toContain('Cargando...');
    });
  });

  describe('panel de filtro', () => {
    it('toggleFilterPanel() abre y cierra el panel', () => {
      expect(component.panelFilterState()).toBe(false);
      component.toggleFilterPanel();
      expect(component.panelFilterState()).toBe(true);
      component.toggleFilterPanel();
      expect(component.panelFilterState()).toBe(false);
    });

    it('el botón "Filtrar" del pie expande el panel y cambia su texto', () => {
      const botonFiltrar = () =>
        Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('mat-card-footer button'))[0];
      const panel = fixture.nativeElement.querySelector('mat-expansion-panel') as HTMLElement;

      expect(botonFiltrar().textContent).toContain('Filtrar');
      botonFiltrar().click();
      fixture.detectChanges();

      expect(component.panelFilterState()).toBe(true);
      expect(panel.classList).toContain('mat-expanded');
      expect(botonFiltrar().textContent).toContain('Ocultar filtro');
    });

    it('onFilterChange() envía el filtro al servicio, mapeando licencia a cedula', () => {
      srvMedico.filtrar.mockClear();
      component.objFilter.set({ nombre: 'Ana', especialidad: 'Cardio', licencia: 'LIC' });

      component.onFilterChange();

      expect(srvMedico.filtrar).toHaveBeenCalledWith({ nombre: 'Ana', cedula: 'LIC', especialidad: 'Cardio' });
    });

    it('escribir en el campo Nombre actualiza el modelo del formulario', () => {
      component.toggleFilterPanel();
      fixture.detectChanges();

      const inputNombre = fixture.nativeElement.querySelector('mat-expansion-panel input') as HTMLInputElement;
      inputNombre.value = 'Ana';
      inputNombre.dispatchEvent(new Event('input'));

      expect(component.objFilter().nombre).toBe('Ana');
    });

    // BUG conocido: en la plantilla, (input)="onFilterChange()" se ejecuta ANTES de que
    // [formField] actualice objFilter, por lo que el filtro enviado al API va una tecla atrasado
    // (al escribir "Ana" se filtra por ""). Cuando se corrija, cambiar `it.fails` por `it`.
    it.fails('escribir en el campo Nombre filtra el listado con el texto actual', () => {
      component.toggleFilterPanel();
      fixture.detectChanges();
      srvMedico.filtrar.mockClear();

      const inputNombre = fixture.nativeElement.querySelector('mat-expansion-panel input') as HTMLInputElement;
      inputNombre.value = 'Ana';
      inputNombre.dispatchEvent(new Event('input'));

      expect(srvMedico.filtrar).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Ana' }));
    });

    it('onFilterClose() reinicia el filtro y cierra el panel', () => {
      component.panelFilterState.set(true);
      component.objFilter.set({ nombre: 'Ana', especialidad: '', licencia: '' });
      component.onFilterChange();
      srvMedico.filtrar.mockClear();

      component.onFilterClose();

      expect(component.panelFilterState()).toBe(false);
      expect(component.filtro).toEqual(filtroVacio);
      expect(srvMedico.filtrar).toHaveBeenCalledWith(filtroVacio);
    });
  });

  describe('crear médico', () => {
    it('onCreate() abre el formulario "Nuevo Médico" sin datos', () => {
      component.onCreate();

      expect(component.buscarID()).toBeNull();
      expect(dialogOpen).toHaveBeenCalledWith(
        FrmMedico,
        expect.objectContaining({
          data: { title: 'Nuevo Médico', data: undefined, info: undefined },
          disableClose: true,
        }),
      );
    });

    it('el botón "+" de la tabla llama a onCreate()', () => {
      const onCreate = vi.spyOn(component, 'onCreate');
      (fixture.nativeElement.querySelector('th button') as HTMLButtonElement).click();
      expect(onCreate).toHaveBeenCalled();
    });

    it('al aceptar el formulario guarda (POST, sin id), refresca el listado y avisa "Datos creados"', () => {
      srvMedico.guardar.mockReturnValue(of({}));
      srvMedico.filtrar.mockClear();
      cerrarDialogoCon(medicoForm);

      component.onCreate();

      expect(srvMedico.guardar).toHaveBeenCalledWith(medicoForm, undefined);
      expect(srvMedico.filtrar).toHaveBeenCalledWith(filtroVacio);
      expect(dialogOpen).toHaveBeenLastCalledWith(
        DialogoGeneral,
        expect.objectContaining({ data: expect.objectContaining({ icono: 'check', texto: 'Datos creados' }) }),
      );
    });

    it.each([
      ['undefined', undefined],
      ['false', false],
    ])('si el formulario se cierra con %s no guarda nada', (_, resultado) => {
      cerrarDialogoCon(resultado);

      component.onCreate();

      expect(srvMedico.guardar).not.toHaveBeenCalled();
      expect(dialogOpen).toHaveBeenCalledTimes(1);
    });

    it('si el API falla muestra el diálogo de error y no refresca el listado', () => {
      srvMedico.guardar.mockReturnValue(throwError(() => ({ status: 500 })));
      srvMedico.filtrar.mockClear();
      cerrarDialogoCon(medicoForm);

      component.onCreate();

      expect(srvMedico.filtrar).not.toHaveBeenCalled();
      expect(dialogOpen).toHaveBeenLastCalledWith(
        DialogoGeneral,
        expect.objectContaining({
          data: { icono: 'error', texto: 'No se pudo guardar el médico', textoAceptar: ' Aceptar ' },
        }),
      );
    });
  });

  describe('editar médico', () => {
    it('onEdit() guarda el id buscado y pide el médico al servicio', () => {
      component.onEdit(1);

      expect(component.buscarID()).toBe(1);
      expect(srvMedico.buscarPorId).toHaveBeenCalledWith(1);
    });

    it('el botón editar de una fila llama a onEdit() con el id del médico', () => {
      const onEdit = vi.spyOn(component, 'onEdit');
      srvMedico.medicos.value.set({ data: [medico] });
      fixture.detectChanges();

      const botonEditar = Array.from(fixture.nativeElement.querySelectorAll('tbody button') as NodeListOf<HTMLButtonElement>)
        .find((b) => b.textContent?.includes('edit'));
      botonEditar?.click();

      expect(onEdit).toHaveBeenCalledWith(1);
    });

    it('cuando llega el médico abre el formulario "Editar Médico" con sus datos', () => {
      const mostrarDialogo = vi.spyOn(component, 'mostrarDialogo');

      component.onEdit(1);
      srvMedico.medicoPorId.value.set({ data: medico });
      srvMedico.medicoPorId.status.set('resolved');
      TestBed.tick();

      expect(mostrarDialogo).toHaveBeenCalledWith('Editar Médico', medico, false, 1);
      expect(dialogOpen).toHaveBeenCalledWith(
        FrmMedico,
        expect.objectContaining({ data: { title: 'Editar Médico', data: medico, info: false } }),
      );
    });

    it('no abre el formulario si no hay un id buscado', () => {
      srvMedico.medicoPorId.value.set({ data: medico });
      srvMedico.medicoPorId.status.set('resolved');
      TestBed.tick();

      expect(dialogOpen).not.toHaveBeenCalled();
    });

    it('al aceptar la edición guarda con el id (PUT) y avisa "Datos actualizados"', () => {
      srvMedico.guardar.mockReturnValue(of({}));
      cerrarDialogoCon(medicoForm);

      component.onEdit(1);
      srvMedico.medicoPorId.value.set({ data: medico });
      srvMedico.medicoPorId.status.set('resolved');
      TestBed.tick();

      expect(srvMedico.guardar).toHaveBeenCalledWith(medicoForm, 1);
      expect(dialogOpen).toHaveBeenLastCalledWith(
        DialogoGeneral,
        expect.objectContaining({ data: expect.objectContaining({ icono: 'check', texto: 'Datos actualizados' }) }),
      );
    });

    it('si la búsqueda falla registra el error y alerta al usuario', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const alerta = vi.spyOn(window, 'alert').mockImplementation(() => {});

      component.onEdit(99);
      srvMedico.medicoPorId.error.set(new Error('404'));
      srvMedico.medicoPorId.status.set('error');
      TestBed.tick();

      expect(consoleError).toHaveBeenCalledWith('No se pudo buscar el médico con ID 99:', expect.any(Error));
      expect(alerta).toHaveBeenCalledWith('No se pudo cargar el médico');
      expect(dialogOpen).not.toHaveBeenCalled();
    });
  });

  describe('imprimir', () => {
    it('onPrint() envía las columnas y las filas de la tabla al servicio de impresión', () => {
      srvMedico.medicos.value.set({
        data: [medico, { id: 2, nombre_completo: 'Sin Datos', especialidad_id: 1, licencia: '' }],
      });
      TestBed.tick();

      component.onPrint();

      expect(srvPrint.print).toHaveBeenCalledWith(
        ['Id', 'Nombre', 'Especialidad', 'Licencia', 'Teléfono'],
        [
          ['1', 'Ana Médica', 'Cardiología', 'LIC-123', '8888-1234', 'ana'],
          ['2', 'Sin Datos', '', '', '', ''],
        ],
        'Catálogo de médicos',
      );
    });

    it('el botón "Imprimir" llama a onPrint()', () => {
      const onPrint = vi.spyOn(component, 'onPrint');
      const botonImprimir = Array.from(
        fixture.nativeElement.querySelectorAll('mat-card-footer button') as NodeListOf<HTMLButtonElement>,
      ).find((b) => b.textContent?.includes('Imprimir'));

      botonImprimir?.click();

      expect(onPrint).toHaveBeenCalled();
    });
  });
});
