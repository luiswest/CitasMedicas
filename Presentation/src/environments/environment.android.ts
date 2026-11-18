// Build para Android (ng build --configuration android)
// Dentro del dispositivo "localhost" es el propio teléfono, NO la PC.
//  - Emulador de Android Studio: 10.0.2.2 apunta a la PC anfitriona.
//  - Dispositivo físico: usar la IP de la PC en la red local (ej. 192.168.1.50)
//    y que ambos estén en la misma red Wi-Fi.
export const environment = {
    servidor: 'http://10.0.2.2:9090/api'
};