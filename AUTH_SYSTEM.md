# Sistema de Autenticación y Permisos - Iglesia 360 API

## 📋 Descripción General

Sistema robusto de autenticación basado en JWT con control de permisos granular mediante roles, módulos y opciones.

## 🏗️ Arquitectura

### Modelos

#### 1. **Person** (Persona)
Almacena información personal básica:
- `nombres`: Nombres de la persona
- `apellidos`: Apellidos de la persona
- `tipoDocumento`: DNI, Pasaporte, Cédula, RUC
- `numeroDocumento`: Número único de identificación
- `fechaNacimiento`: Fecha de nacimiento
- `telefono`: Número de teléfono
- `direccion`: Dirección física

#### 2. **User** (Usuario)
Credenciales y datos de autenticación:
- `username`: Nombre de usuario único
- `email`: Email único
- `password`: Contraseña hasheada con bcrypt
- `person`: Referencia 1:1 a Person
- `roles`: Array de referencias a Rol (1:M)
- `ultimoAcceso`: Fecha del último login
- `intentosFallidos`: Contador de intentos fallidos
- `bloqueadoHasta`: Fecha hasta la cual está bloqueado
- `activo`: Estado del usuario

**Métodos del modelo:**
- `comparePassword()`: Compara contraseña
- `estaBloqueado()`: Verifica si está bloqueado
- `incrementarIntentosFallidos()`: Incrementa contador (bloquea después de 5 intentos)
- `resetearIntentosFallidos()`: Limpia contador al login exitoso
- `obtenerPermisos()`: Retorna todas las opciones permitidas

#### 3. **Rol**
Define roles en el sistema:
- `nombre`: Nombre único del rol
- `icono`: Ícono para UI (FontAwesome)
- `descripcion`: Descripción del rol
- `activo`: Estado del rol

#### 4. **Module** (Módulo)
Agrupa opciones funcionales:
- `nombre`: Nombre único del módulo
- `descripcion`: Descripción del módulo
- `icono`: Ícono para menú
- `orden`: Orden de visualización
- `activo`: Estado del módulo

#### 5. **Option** (Opción)
Permisos específicos dentro de módulos:
- `nombre`: Nombre de la opción
- `ruta`: Ruta en el frontend
- `icono`: Ícono para UI
- `orden`: Orden dentro del módulo
- `module`: Referencia 1:1 a Module
- `roles`: Array de roles permitidos (1:M)
- `activo`: Estado de la opción

## 🔐 Sistema de Seguridad

### Autenticación JWT
- Token generado al login exitoso
- Expiración configurable (por defecto 7 días)
- Token debe enviarse en header: `Authorization: Bearer <token>`

### Protección contra Ataques
- **Bloqueo temporal**: 5 intentos fallidos = 15 minutos bloqueado
- **Password hashing**: bcrypt con salt rounds de 10
- **Rate limiting**: 100 peticiones por 15 minutos
- **Helmet**: Protección de headers HTTP
- **CORS**: Control de orígenes permitidos

### Niveles de Autorización

#### 1. Middleware `protect`
Verifica que el usuario esté autenticado:
```javascript
router.get('/ruta-protegida', protect, controller);
```

#### 2. Middleware `authorize(...roles)`
Verifica roles específicos:
```javascript
router.post('/admin-only', protect, authorize('Administrador'), controller);
```

#### 3. Middleware `checkPermission(opcionNombre)`
Verifica permiso específico por opción:
```javascript
router.get('/miembros', protect, checkPermission('Listar Miembros'), controller);
```

## 📡 Endpoints de Autenticación

### POST `/api/auth/login`
Autentica usuario y retorna token.

**Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "...",
      "username": "admin",
      "email": "admin@iglesia360.com",
      "person": { ... },
      "roles": [ ... ]
    },
    "permisos": [ ... ]
  }
}
```

### POST `/api/auth/register`
Registra nuevo usuario (crea Person y User).

**Body:**
```json
{
  "nombres": "Juan Carlos",
  "apellidos": "Pérez García",
  "tipoDocumento": "DNI",
  "numeroDocumento": "12345678",
  "fechaNacimiento": "1990-05-15",
  "telefono": "+52 123 456 7890",
  "direccion": "Av. Principal 123",
  "username": "juanperez",
  "email": "juan@iglesia.com",
  "password": "password123",
  "roles": ["507f1f77bcf86cd799439011"]
}
```

### GET `/api/auth/me` 🔒
Obtiene perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

### PUT `/api/auth/updatepassword` 🔒
Actualiza contraseña del usuario.

**Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

### GET `/api/auth/permissions` 🔒
Obtiene permisos organizados por módulo.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "module": {
        "_id": "...",
        "nombre": "Dashboard",
        "icono": "fas fa-home"
      },
      "opciones": [
        {
          "_id": "...",
          "nombre": "Ver Dashboard",
          "ruta": "/dashboard",
          "icono": "fas fa-circle"
        }
      ]
    }
  ]
}
```

## 🌱 Inicialización de Datos

### Ejecutar Seed
```bash
npm run seed:auth
```

### Datos Creados

**Roles:**
- Administrador (acceso total)
- Pastor (gestión ministerial)
- Líder (gestión de grupos)
- Miembro (usuario básico)

**Módulos:**
- Dashboard
- Usuarios
- Miembros
- Reportes
- Configuración

**Usuarios de Prueba:**

| Usuario | Password | Rol |
|---------|----------|-----|
| admin | admin123 | Administrador |
| pastor | pastor123 | Pastor |

## 🔄 Flujo de Autenticación

```
1. Usuario envía credentials → POST /api/auth/login
2. Sistema verifica usuario y password
3. Si es válido, genera JWT
4. Retorna token + datos de usuario + permisos
5. Cliente guarda token
6. Peticiones subsecuentes incluyen: Authorization: Bearer <token>
7. Middleware 'protect' verifica token en cada petición
8. Middleware 'authorize' o 'checkPermission' verifica permisos
```

## 💡 Ejemplos de Uso

### Proteger ruta solo con autenticación
```javascript
import { protect } from '../middleware/auth.js';

router.get('/perfil', protect, getPerfil);
```

### Proteger ruta con rol específico
```javascript
import { protect, authorize } from '../middleware/auth.js';

router.post('/admin', protect, authorize('Administrador'), createAdmin);
```

### Proteger ruta con permiso específico
```javascript
import { protect, checkPermission } from '../middleware/auth.js';

router.get('/miembros', protect, checkPermission('Listar Miembros'), getMiembros);
```

### Usar información del usuario autenticado en controlador
```javascript
export const getPerfil = async (req, res, next) => {
  try {
    // req.user está disponible después del middleware 'protect'
    const userId = req.user._id;
    const userRoles = req.user.roles;
    const personData = req.user.person;
    
    res.json({ success: true, data: req.user });
  } catch (error) {
    next(error);
  }
};
```

## 🛡️ Mejores Prácticas

1. **Nunca** guardes el JWT_SECRET en el código
2. **Cambia** el JWT_SECRET en producción
3. **Usa HTTPS** en producción
4. **Rota tokens** periódicamente en sistemas críticos
5. **Implementa refresh tokens** para sesiones largas
6. **Valida** siempre en el backend, no confíes solo en el frontend
7. **Loguea** intentos fallidos de login
8. **Implementa 2FA** para usuarios admin en producción

## 🚀 Próximas Mejoras Sugeridas

- [ ] Refresh tokens
- [ ] Autenticación de dos factores (2FA)
- [ ] Recuperación de contraseña por email
- [ ] Auditoría de acciones de usuarios
- [ ] Sesiones concurrentes (limitar dispositivos)
- [ ] OAuth2 / Social Login
- [ ] Políticas de contraseñas más estrictas
- [ ] Encriptación de datos sensibles

---

**Desarrollado con Claude Sonnet 4.5** 🔐
