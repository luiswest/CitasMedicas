import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { FrmMedico } from './frm-medico';

describe('FrmMedico', () => {
  let component: FrmMedico;
  let fixture: ComponentFixture<FrmMedico>;
  const dialogRef = { close: vi.fn() };

  beforeEach(async () => {
    dialogRef.close.mockClear();

    await TestBed.configureTestingModule({
      imports: [FrmMedico],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }],
    }).compileComponents();

    fixture = TestBed.createComponent(FrmMedico);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close with the medico data when the form is valid', async () => {
    const medico = {
      especialidad_id: 1,
      nombre_completo: 'Ana Maria Lopez',
      licencia: 'LIC-123',
      telefono: '',
      username: 'ana',
      password: 'secret',
    };
    component.objMedico.set(medico);

    fixture.nativeElement.querySelector('form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();

    expect(dialogRef.close).toHaveBeenCalledWith(medico);
  });

  it('should not close when the form is invalid', async () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
