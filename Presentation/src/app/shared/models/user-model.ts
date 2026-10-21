export class User {
    cedula : string;
    nombre : string;
    rol : number;
    constructor(usr? :  User) {
        this.cedula = usr !== undefined ? usr.cedula : '';
        this.nombre = usr !== undefined ? usr.nombre : '';
        this.rol = usr !== undefined ? usr.rol : -1;
    }
}