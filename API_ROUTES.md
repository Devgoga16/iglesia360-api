# Documentación de Rutas de la API

Este documento detalla todas las rutas disponibles en la API, incluyendo sus métodos, URLs, cuerpos de petición (Body) y respuestas esperadas.

## Índice
1. [Autenticación](#autenticación)
2. [Usuarios](#usuarios)
3. [Personas](#personas)
4. [Roles](#roles)
5. [Módulos](#módulos)
6. [Opciones](#opciones)
7. [Sucursales](#sucursales)
8. [Solicitudes Financieras](#solicitudes-financieras)
9. [Configuración Financiera](#configuración-financiera)

---

## Autenticación
Base URL: `/api/auth`

### Login
- **Método:** `POST`
- **Ruta:** `/login`
- **Descripción:** Autentica un usuario y retorna un token JWT.
- **Body:**
  ```json
  {
    "username": "admin", // Requerido. Username o email
    "password": "password123" // Requerido
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "user": { ... },
      "permisos": [ ... ]
    }
  }
  ```

### Registro
- **Método:** `POST`
- **Ruta:** `/register`
- **Descripción:** Crea una nueva persona y usuario en el sistema.
- **Body:**
  ```json
  {
    "nombres": "Juan Carlos", // Requerido
    "apellidos": "Pérez García", // Requerido
    "tipoDocumento": "DNI", // Requerido. Enum: [DNI, Pasaporte, Cédula, RUC]
    "numeroDocumento": "12345678", // Requerido
    "fechaNacimiento": "1990-05-15", // Requerido (YYYY-MM-DD)
    "username": "juanperez", // Requerido
    "email": "juan@iglesia.com", // Requerido
    "password": "password123", // Requerido
    "roles": ["507f1f77bcf86cd799439011"], // Requerido. Array de IDs de roles
    "telefono": "+52 123 456 7890",
    "direccion": "Av. Principal 123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "token": "...",
    "user": { ... }
  }
  ```

### Obtener Perfil (Me)
- **Método:** `GET`
- **Ruta:** `/me`
- **Descripción:** Retorna la información del usuario actual y sus permisos. Requiere Token.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": { ... },
      "permisos": [ ... ]
    }
  }
  ```

### Actualizar Contraseña
- **Método:** `PUT`
- **Ruta:** `/updatepassword`
- **Descripción:** Permite al usuario cambiar su contraseña. Requiere Token.
- **Body:**
  ```json
  {
    "currentPassword": "oldpassword123", // Requerido
    "newPassword": "newpassword123" // Requerido
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "..." // Nuevo token generado
  }
  ```

### Obtener Permisos
- **Método:** `GET`
- **Ruta:** `/permissions`
- **Descripción:** Retorna todos los módulos y opciones a los que el usuario tiene acceso. Requiere Token.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [ ... ]
  }
  ```

---

## Usuarios
Base URL: `/api/users`

### Obtener Todos los Usuarios
- **Método:** `GET`
- **Ruta:** `/`
- **Descripción:** Retorna la lista de todos los usuarios.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 10,
    "data": [ ... ]
  }
  ```

### Crear Usuario
- **Método:** `POST`
- **Ruta:** `/`
- **Descripción:** Crea un nuevo usuario (solo usuario, no persona completa).
- **Body:**
  ```json
  {
    "username": "juanperez", // Requerido
    "email": "juan@iglesia.com", // Requerido
    "password": "password123", // Requerido
    "person": "507f1f77bcf86cd799439011", // Requerido (ID de Persona)
    "branch": "507f1f77bcf86cd799439012", // Requerido (ID de Sucursal)
    "roles": ["507f1f77bcf86cd799439013"] // Requerido (Array de IDs de roles)
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Crear Usuario desde Persona
- **Método:** `POST`
- **Ruta:** `/from-person`
- **Descripción:** Genera un usuario para una persona existente reutilizando su sucursal asignada.
- **Body:**
  ```json
  {
    "personId": "507f1f77bcf86cd799439011", // Requerido (ID de Persona activa sin usuario)
    "username": "juanperez", // Requerido
    "email": "juan@iglesia.com", // Requerido
    "password": "password123", // Requerido
    "roles": ["507f1f77bcf86cd799439013"] // Requerido (Array de IDs de roles)
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Obtener Usuario por ID
- **Método:** `GET`
- **Ruta:** `/:id`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Actualizar Usuario
- **Método:** `PUT`
- **Ruta:** `/:id`
- **Body:**
  ```json
  {
    "nombre": "Juan Pérez Actualizado",
    "email": "juan.nuevo@iglesia.com",
    "rol": "lider"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Eliminar Usuario
- **Método:** `DELETE`
- **Ruta:** `/:id`
- **Descripción:** Soft delete (marca como inactivo).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Usuario eliminado correctamente"
  }
  ```

---

## Personas
Base URL: `/api/persons`

### Obtener Todas las Personas
- **Método:** `GET`
- **Ruta:** `/`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 5,
    "data": [ ... ]
  }
  ```

### Crear Persona
- **Método:** `POST`
- **Ruta:** `/`
- **Permisos:** Administrador, Pastor.
- **Body:**
  ```json
  {
    "nombres": "Juan Carlos", // Requerido
    "apellidos": "Pérez García", // Requerido
    "tipoDocumento": "DNI", // Requerido
    "numeroDocumento": "12345678", // Requerido
    "fechaNacimiento": "1990-05-15", // Requerido
    "telefono": "+52...",
    "direccion": "Av..."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Obtener Persona por ID
- **Método:** `GET`
- **Ruta:** `/:id`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Actualizar Persona
- **Método:** `PUT`
- **Ruta:** `/:id`
- **Permisos:** Administrador, Pastor.
- **Body:** (Campos a actualizar del objeto persona)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Eliminar Persona
- **Método:** `DELETE`
- **Ruta:** `/:id`
- **Permisos:** Administrador.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

---

## Roles
Base URL: `/api/roles`

### Obtener Roles
- **Método:** `GET`
- **Ruta:** `/`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [ ... ]
  }
  ```

### Crear Rol
- **Método:** `POST`
- **Ruta:** `/`
- **Permisos:** Administrador.
- **Body:**
  ```json
  {
    "nombre": "Líder de Jóvenes", // Requerido
    "icono": "fas fa-star",
    "descripcion": "Gestión de ministerio juvenil"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Actualizar Rol
- **Método:** `PUT`
- **Ruta:** `/:id`
- **Permisos:** Administrador.
- **Body:** (Campos a actualizar)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Eliminar Rol
- **Método:** `DELETE`
- **Ruta:** `/:id`
- **Permisos:** Administrador.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

---

## Módulos
Base URL: `/api/modules`

### Obtener Módulos
- **Método:** `GET`
- **Ruta:** `/`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [ ... ]
  }
  ```

### Crear Módulo
- **Método:** `POST`
- **Ruta:** `/`
- **Permisos:** Administrador.
- **Body:**
  ```json
  {
    "nombre": "Eventos", // Requerido
    "descripcion": "Gestión de eventos",
    "icono": "fas fa-calendar",
    "orden": 6
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Actualizar/Eliminar Módulo
- **Métodos:** `PUT`, `DELETE`
- **Ruta:** `/:id`
- **Permisos:** Administrador.

---

## Opciones
Base URL: `/api/options`

### Obtener Opciones
- **Método:** `GET`
- **Ruta:** `/`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [ ... ]
  }
  ```

### Crear Opción
- **Método:** `POST`
- **Ruta:** `/`
- **Permisos:** Administrador.
- **Body:**
  ```json
  {
    "nombre": "Crear Evento", // Requerido
    "module": "507f1f...", // Requerido (ID del módulo)
    "roles": ["507f1f..."], // Requerido (Array de IDs de roles permitidos)
    "ruta": "/eventos/crear",
    "icono": "fas fa-plus",
    "orden": 1
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Obtener Opciones por Módulo
- **Método:** `GET`
- **Ruta:** `/module/:moduleId`

### Actualizar/Eliminar Opción
- **Métodos:** `PUT`, `DELETE`
- **Ruta:** `/:id`
- **Permisos:** Administrador.

---

## Sucursales
Base URL: `/api/branches`

### Obtener Sucursales
- **Método:** `GET`
- **Ruta:** `/`
- **Query Params:**
  - `active`: `true` | `false` (Filtrar por estado)
  - `tree`: `true` (Retorna estructura jerárquica)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 5,
    "data": [ ... ] // Array plano o árbol según parámetro 'tree'
  }
  ```

### Crear Sucursal
- **Método:** `POST`
- **Ruta:** `/`
- **Permisos:** ADMIN.
- **Body:**
  ```json
  {
    "name": "Sucursal Norte", // Requerido
    "address": "Calle 123",
    "managerPersonId": "507f1f...", // Requerido (ID de Persona)
    "managerUserId": "507f1f...", // Opcional (ID de Usuario)
    "parentBranchId": "507f1f..." // Opcional (ID de Sucursal Padre)
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Obtener Sucursal por ID
- **Método:** `GET`
- **Ruta:** `/:id`

### Actualizar Sucursal
- **Método:** `PUT`
- **Ruta:** `/:id`
- **Permisos:** ADMIN.
- **Body:** (Mismos campos que Crear, opcionales)

### Cambiar Estado (Activar/Desactivar)
- **Método:** `PATCH`
- **Ruta:** `/:id/status`
- **Permisos:** ADMIN.
- **Body:**
  ```json
  {
    "active": true // boolean
  }
  ```

---

## Solicitudes Financieras
Base URL: `/api/financial-requests`

### Obtener Solicitudes
- **Método:** `GET`
- **Ruta:** `/`
- **Query Params:**
  - `status`: (Filtrar por estado: CREATED, APPROVED_NETWORK, etc.)
  - `branchId`: (Filtrar por sucursal)
  - `requesterUserId`: (Filtrar por solicitante)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "count": 10,
    "data": [ ... ]
  }
  ```

### Crear Solicitud
- **Método:** `POST`
- **Ruta:** `/`
- **Body:**
  ```json
  {
    "branchId": "507f...", // Requerido
    "description": "Compra de equipos", // Requerido
    "depositType": "OWN_ACCOUNT", // Requerido. Enum: [OWN_ACCOUNT, THIRD_PARTY, SUPPLIER]
    "items": [ // Requerido. Array de items
      {
        "description": "Micrófono",
        "amount": 150.00
      }
    ],
    "currency": "PEN", // Opcional. Default: PEN. Enum: [PEN, USD]
    "costCenterId": "...", // Opcional
    "supervisorUserId": "...", // Opcional
    "ownAccountId": 123, // Requerido si depositType es OWN_ACCOUNT
    "bankName": "BCP", // Opcional
    "accountNumber": "123456", // Opcional
    "docType": "RUC", // Opcional
    "docNumber": "20123456789" // Opcional
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

### Obtener Solicitud por ID
- **Método:** `GET`
- **Ruta:** `/:id`

### Actualizar Solicitud
- **Método:** `PUT`
- **Ruta:** `/:id`
- **Descripción:** Solo permitido en estado `CREATED`. Solo solicitante o Admin.
- **Body:** (Mismos campos que Crear)

### Cambiar Estado de Solicitud
- **Método:** `PATCH`
- **Ruta:** `/:id/status`
- **Body:**
  ```json
  {
    "status": "APPROVED_NETWORK", // Requerido. Nuevo estado
    "rejectionReason": "Falta detalle", // Requerido si status es REJECTED
    "evidenceUrls": ["https://..."], // Requerido para ciertos estados (e.g. MONEY_DELIVERED)
    "remainderAmount": 50.00 // Requerido si status es REMAINDER_REFUNDED
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

---

## Configuración Financiera
Base URL: `/api/financial-config`

### Obtener Configuración
- **Método:** `GET`
- **Ruta:** `/`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "maxAmountLeadApproval": 1000,
      "defaultCurrency": "PEN",
      "remainderTarget": { ... }
    }
  }
  ```

### Actualizar Configuración
- **Método:** `PATCH`
- **Ruta:** `/`
- **Permisos:** ADMIN.
- **Body:**
  ```json
  {
    "maxAmountLeadApproval": 2000,
    "defaultCurrency": "USD",
    "remainderTarget": {
      "accountName": "Iglesia Central",
      "bankName": "BCP",
      "accountNumber": "193-...",
      "notes": "Cuenta principal"
    }
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```
