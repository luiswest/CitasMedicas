// Build de producción (ng build). La SPA llama a /api en su MISMO dominio y
// nginx (nginx/default.conf.template) lo reenvía a la capa de negocio.
// - ng serve sigue usando environment.development.ts (http://localhost:9090/api)
// - Android sigue usando environment.android.ts
export const environment = {
    servidor: '/api'
};
