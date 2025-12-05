# SaaS POS System 🚀

Un sistema de Punto de Venta (POS) moderno, multi-empresa y basado en la nube, construido con React, TypeScript y Supabase.

![POS Screenshot](https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=1000)

## ✨ Características Principales

*   **🛒 Punto de Venta Ágil:** Interfaz optimizada para ventas rápidas con búsqueda inteligente y carrito dinámico.
*   **🏢 Arquitectura SaaS Multi-Tenant:** Aislamiento total de datos entre empresas. Cada usuario ve solo su información.
*   **📦 Gestión de Inventario:** Control de stock en tiempo real, alertas de stock bajo y categorías.
*   **👥 Gestión de Equipos:** Roles de Dueño, Administrador y Cajero con permisos granulares.
*   **💰 Módulo Financiero:**
    *   Corte de Caja (Apertura/Cierre).
    *   Registro de Gastos y Compras.
    *   Reportes de Flujo de Caja.
*   **📊 Reportes y Análisis:** Historial de ventas, exportación a PDF y Excel.
*   **🔒 Seguridad Robusta:** Implementación de Row Level Security (RLS) en base de datos.

## 🛠️ Tecnologías

*   **Frontend:** [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
*   **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
*   **Estado:** [Zustand](https://github.com/pmndrs/zustand)
*   **Base de Datos & Auth:** [Supabase](https://supabase.com/) (PostgreSQL)
*   **Iconos:** [Lucide React](https://lucide.dev/)

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/tu-repo.git
cd tu-repo
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto basado en el ejemplo:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anon_publica
```

### 4. Configurar Base de Datos (Supabase)

1.  Crea un nuevo proyecto en [Supabase](https://supabase.com).
2.  Ve al **SQL Editor**.
3.  Copia el contenido del archivo `production_schema.sql` (ubicado en la raíz de este proyecto).
4.  Ejecuta el script completo. Esto creará todas las tablas, funciones, triggers y políticas de seguridad necesarias.

### 5. Correr en Desarrollo

```bash
npm run dev
```

## 📦 Despliegue a Producción

Este proyecto está optimizado para desplegarse en **Vercel**:

1.  Sube tu código a GitHub.
2.  Importa el proyecto en Vercel.
3.  Configura las variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en el panel de Vercel.
4.  ¡Listo! 🚀

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
