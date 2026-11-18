import { Service } from '@angular/core';
import jsPDF from 'jspdf';
import { autoTable, CellInput } from 'jspdf-autotable';

@Service()
export class PrintService {
    //print(columna : string[], cuerpo : Array<any>, encabezado : string, guardar? : boolean) {
    print(columnHeaders: string[], rows: CellInput[][], title: string, save = false): void {
        
        const doc = new jsPDF({
            orientation: 'portrait',  //landscape
            unit: 'px', 
            format: 'letter'});


        doc.text(title, (doc.internal.pageSize.width / 2), 25, {align: 'center'} );
        autoTable(doc, {
            head: [columnHeaders],
            body: rows
        });
        if (save) {
            // hora actual formato ISO 8601, (2026-11-08T02:31:41.104Z) 
            // Z formato UTC, reemplazando ":" y "." por "-" para que sea un nombre de archivo válido
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const hoy = new Date();
//            const nombreArchivo = hoy.getDate() + hoy.getMonth() + hoy.getFullYear() + hoy.getTime() + '.pdf';
            doc.save(`reporte-${timestamp}`);
        } else {
            doc.output("dataurlnewwindow");
        }
    }    
}
