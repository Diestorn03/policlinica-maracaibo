/// <reference path="./worker-configuration.d.ts" />

declare namespace App {
  interface Locals {
    /** Usuario con sesión válida (solo en rutas privadas: /admin, /medico, /panel, /acceso, /api) */
    usuario?: { id: number; rol: import('./lib/auth').Rol; nombre: string };
  }
}

declare namespace Cloudflare {
  interface Env {
    SESSION_SECRET?: string;
  }
}
