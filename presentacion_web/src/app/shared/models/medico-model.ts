export interface MedicoModel {
  id?: number;
  usuario_id?: number;
  especialidad_id: number;
  especialidad_nombre: string;
  nombre_completo: string;
  licencia: string;
  telefono: string;
}
