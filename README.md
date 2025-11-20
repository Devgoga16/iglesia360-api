# Iglesia 360 API

API robusta y minimalista desarrollada con Node.js y MongoDB para la gestión de un sistema de iglesia.

## 🏗️ Arquitectura del Proyecto

```
iglesia360-api/
│
├── src/
│   ├── config/          # Configuraciones centralizadas
│   │   ├── database.js  # Configuración de conexión a MongoDB
│   │   └── config.js    # Variables de entorno y configuración general
│   │
│   ├── models/          # Modelos de datos (Schemas de Mongoose)
│   │   └── User.js      # Modelo de ejemplo: Usuario
│   │
│   ├── controllers/     # Lógica de negocio
│   │   └── userController.js  # Controlador de usuarios (CRUD)
│   │
│   ├── routes/          # Definición de rutas/endpoints
│   │   └── userRoutes.js      # Rutas de usuarios
│   │
│   ├── middleware/      # Middlewares personalizados
│   │   └── errorHandler.js    # Manejo centralizado de errores
│   │
│   ├── utils/           # Funciones auxiliares y utilidades
│   │
│   └── index.js         # Punto de entrada principal de la aplicación
│
├── .env.example         # Ejemplo de variables de entorno
├── .gitignore          # Archivos ignorados por Git
├── package.json        # Dependencias y scripts del proyecto
└── README.md           # Este archivo

```

## 📁 Descripción de Carpetas

### `/src/config`
Contiene toda la configuración de la aplicación:
- **database.js**: Gestiona la conexión a MongoDB con manejo de errores
- **config.js**: Centraliza las variables de entorno y configuraciones globales

### `/src/models`
Define los esquemas de datos usando Mongoose:
- Estructura de documentos de MongoDB
- Validaciones a nivel de base de datos
- Relaciones entre colecciones
- **Ejemplo**: `User.js` con campos de usuario de iglesia (nombre, email, rol, etc.)

### `/src/controllers`
Contiene la lógica de negocio de la aplicación:
- Procesa las peticiones HTTP
- Interactúa con los modelos
- Retorna respuestas estructuradas
- Maneja errores específicos
- **Patrón**: Funciones asíncronas que reciben `(req, res, next)`

### `/src/routes`
Define los endpoints de la API:
- Mapea URLs a controladores
- Organiza rutas por recurso
- Aplica middlewares específicos por ruta
- **Ejemplo**: `/api/users` con operaciones GET, POST, PUT, DELETE

### `/src/middleware`
Middlewares personalizados para:
- Manejo de errores centralizado
- Validaciones
- Autenticación (futuro)
- Logging
- **Actual**: `errorHandler.js` para errores 404 y 500

### `/src/utils`
Funciones reutilizables:
- Helpers
- Formateadores
- Validadores personalizados
- Constantes

## 🚀 Instalación y Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Crea un archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

Edita `.env` con tus valores:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/iglesia360
NODE_ENV=development
```

### 3. Asegúrate de tener MongoDB corriendo
```bash
# Con MongoDB local
mongod

# O usa MongoDB Atlas (conexión en la nube)
```

### 4. Ejecutar la aplicación

**Modo desarrollo (con hot-reload):**
```bash
npm run dev
```

**Modo producción:**
```bash
npm start
```

## 📡 Endpoints Disponibles

### Health Check
```
GET /health
```
Verifica que la API esté funcionando correctamente.

### Usuarios
```
GET    /api/users      # Obtener todos los usuarios activos
GET    /api/users/:id  # Obtener un usuario específico
POST   /api/users      # Crear nuevo usuario
PUT    /api/users/:id  # Actualizar usuario
DELETE /api/users/:id  # Eliminar usuario (soft delete)
```

**Ejemplo de creación de usuario:**
```json
POST /api/users
{
  "nombre": "Juan Pérez",
  "email": "juan@iglesia.com",
  "telefono": "+52 123 456 7890",
  "rol": "miembro"
}
```

## 🛡️ Características de Seguridad

- **Helmet**: Protección de headers HTTP
- **CORS**: Control de acceso entre orígenes
- **Rate Limiting**: 100 peticiones por 15 minutos por IP
- **Validación**: Joi para validación de datos (incluido en dependencias)
- **Soft Delete**: Los usuarios no se eliminan físicamente

## 🏛️ Principios Arquitectónicos

### Minimalismo
- Sin dependencias innecesarias
- Código limpio y directo
- Estructura clara y predecible

### Robustez
- Manejo centralizado de errores
- Validación en múltiples capas
- Conexión resiliente a base de datos
- Rate limiting para prevenir abusos

### Escalabilidad
- Separación de responsabilidades (MVC modificado)
- Código modular y reutilizable
- Fácil de extender con nuevos recursos

### Patrón de Diseño
Sigue una arquitectura de **3 capas**:
1. **Rutas** → Definen endpoints
2. **Controladores** → Lógica de negocio
3. **Modelos** → Acceso a datos

## 📦 Dependencias Principales

- **express**: Framework web minimalista
- **mongoose**: ODM para MongoDB
- **dotenv**: Gestión de variables de entorno
- **cors**: Habilitación de CORS
- **helmet**: Seguridad de headers
- **express-rate-limit**: Limitación de peticiones
- **joi**: Validación de esquemas

## 🔄 Flujo de una Petición

```
Cliente → Express → Rate Limiter → CORS → Helmet 
   ↓
Rutas (/api/users) → Controlador (userController)
   ↓
Modelo (User) → MongoDB
   ↓
Respuesta JSON ← Controlador ← Express ← Cliente
```

## 🎯 Próximos Pasos Sugeridos

1. Implementar autenticación JWT
2. Agregar más modelos (Eventos, Grupos, Donaciones)
3. Implementar paginación en listados
4. Agregar búsqueda y filtros avanzados
5. Crear tests unitarios e integración
6. Documentar API con Swagger/OpenAPI

## 🐳 Docker y Despliegue

### Construcción y ejecución con Docker

**Opción 1: Solo API (necesitas MongoDB externo)**
```bash
# Construir imagen
docker build -t iglesia360-api .

# Ejecutar contenedor
docker run -p 3000:3000 -e MONGODB_URI=tu_uri_mongodb iglesia360-api
```

**Opción 2: API + MongoDB con Docker Compose (Recomendado)**
```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

### Despliegue en Plataformas

**Railway:**
1. Conecta tu repositorio GitHub
2. Agrega servicio MongoDB desde Railway
3. Configura variable `MONGODB_URI` con la URI de Railway
4. Deploy automático

**Render:**
1. Crea Web Service desde GitHub
2. Build Command: `npm install`
3. Start Command: `node src/index.js`
4. Agrega MongoDB Atlas URI en variables de entorno

**DigitalOcean App Platform:**
1. Conecta repositorio
2. Detecta automáticamente Node.js
3. Configura variables de entorno
4. Deploy

## 📝 Notas Importantes

- Usa **ES Modules** (`import/export`) en lugar de CommonJS
- Node.js >= 18.0.0 requerido para `--watch` flag
- MongoDB debe estar corriendo antes de iniciar la app
- Los errores se muestran en detalle solo en `development`
- **Docker**: Usa multi-stage build para optimizar tamaño de imagen
- **Seguridad**: Corre con usuario no-root en producción

---

**Desarrollado con Claude Sonnet 4.5** 🚀
