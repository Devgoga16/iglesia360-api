import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Person from '../models/Person.js';
import Rol from '../models/Rol.js';
import Module from '../models/Module.js';
import Option from '../models/Option.js';
import User from '../models/User.js';

dotenv.config();

// Conectar a la base de datos
await connectDB();

const seedData = async () => {
  try {
    console.log('🌱 Iniciando seed de datos...');

    // Limpiar datos existentes
    await Person.deleteMany({});
    await User.deleteMany({});
    await Rol.deleteMany({});
    await Module.deleteMany({});
    await Option.deleteMany({});

    console.log('✅ Datos anteriores eliminados');

    // Crear roles
    const roles = await Rol.create([
      {
        nombre: 'Administrador',
        icono: 'fas fa-user-shield',
        descripcion: 'Acceso total al sistema'
      },
      {
        nombre: 'Pastor',
        icono: 'fas fa-cross',
        descripcion: 'Gestión de ministerios y miembros'
      },
      {
        nombre: 'Líder',
        icono: 'fas fa-users',
        descripcion: 'Gestión de grupos pequeños'
      },
      {
        nombre: 'Miembro',
        icono: 'fas fa-user',
        descripcion: 'Usuario básico del sistema'
      }
    ]);

    console.log('✅ Roles creados:', roles.length);

    // Crear módulos
    const modules = await Module.create([
      {
        nombre: 'Dashboard',
        descripcion: 'Panel principal',
        orden: 1
      },
      {
        nombre: 'Usuarios',
        descripcion: 'Gestión de usuarios',
        orden: 2
      },
      {
        nombre: 'Miembros',
        descripcion: 'Gestión de miembros',
        orden: 3
      },
      {
        nombre: 'Reportes',
        descripcion: 'Reportes y estadísticas',
        orden: 4
      },
      {
        nombre: 'Configuración',
        descripcion: 'Configuración del sistema',
        orden: 5
      }
    ]);

    console.log('✅ Módulos creados:', modules.length);

    // Crear opciones
    const adminRol = roles.find(r => r.nombre === 'Administrador');
    const pastorRol = roles.find(r => r.nombre === 'Pastor');
    const liderRol = roles.find(r => r.nombre === 'Líder');
    const miembroRol = roles.find(r => r.nombre === 'Miembro');

    const dashboardModule = modules.find(m => m.nombre === 'Dashboard');
    const usuariosModule = modules.find(m => m.nombre === 'Usuarios');
    const miembrosModule = modules.find(m => m.nombre === 'Miembros');
    const reportesModule = modules.find(m => m.nombre === 'Reportes');
    const configModule = modules.find(m => m.nombre === 'Configuración');

    const options = await Option.create([
      // Dashboard - todos tienen acceso
      {
        nombre: 'Ver Dashboard',
        ruta: '/dashboard',
        module: dashboardModule._id,
        roles: [adminRol._id, pastorRol._id, liderRol._id, miembroRol._id],
        orden: 1
      },

      // Usuarios - solo admin
      {
        nombre: 'Listar Usuarios',
        ruta: '/usuarios',
        module: usuariosModule._id,
        roles: [adminRol._id],
        orden: 1
      },
      {
        nombre: 'Crear Usuario',
        ruta: '/usuarios/crear',
        module: usuariosModule._id,
        roles: [adminRol._id],
        orden: 2
      },
      {
        nombre: 'Editar Usuario',
        ruta: '/usuarios/editar',
        module: usuariosModule._id,
        roles: [adminRol._id],
        orden: 3
      },

      // Miembros - admin, pastor, líder
      {
        nombre: 'Listar Miembros',
        ruta: '/miembros',
        module: miembrosModule._id,
        roles: [adminRol._id, pastorRol._id, liderRol._id],
        orden: 1
      },
      {
        nombre: 'Crear Miembro',
        ruta: '/miembros/crear',
        module: miembrosModule._id,
        roles: [adminRol._id, pastorRol._id],
        orden: 2
      },
      {
        nombre: 'Editar Miembro',
        ruta: '/miembros/editar',
        module: miembrosModule._id,
        roles: [adminRol._id, pastorRol._id],
        orden: 3
      },

      // Reportes - admin y pastor
      {
        nombre: 'Ver Reportes',
        ruta: '/reportes',
        module: reportesModule._id,
        roles: [adminRol._id, pastorRol._id],
        orden: 1
      },
      {
        nombre: 'Exportar Reportes',
        ruta: '/reportes/exportar',
        module: reportesModule._id,
        roles: [adminRol._id],
        orden: 2
      },

      // Configuración - solo admin
      {
        nombre: 'Configuración General',
        ruta: '/configuracion',
        module: configModule._id,
        roles: [adminRol._id],
        orden: 1
      },
      {
        nombre: 'Gestión de Roles',
        ruta: '/configuracion/roles',
        module: configModule._id,
        roles: [adminRol._id],
        orden: 2
      }
    ]);

    console.log('✅ Opciones creadas:', options.length);

    // Crear persona admin
    const adminPerson = await Person.create({
      nombres: 'Admin',
      apellidos: 'Sistema',
      tipoDocumento: 'DNI',
      numeroDocumento: '00000000',
      fechaNacimiento: new Date('1990-01-01'),
      telefono: '+52 999 999 9999',
      direccion: 'Dirección administrativa'
    });

    // Crear usuario admin
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@iglesia360.com',
      password: 'admin123',
      person: adminPerson._id,
      roles: [adminRol._id]
    });

    console.log('✅ Usuario admin creado');
    console.log('   Username: admin');
    console.log('   Password: admin123');

    // Crear persona pastor
    const pastorPerson = await Person.create({
      nombres: 'Juan Carlos',
      apellidos: 'Rodríguez',
      tipoDocumento: 'DNI',
      numeroDocumento: '11111111',
      fechaNacimiento: new Date('1985-06-15'),
      telefono: '+52 888 888 8888',
      direccion: 'Calle Pastor 456'
    });

    // Crear usuario pastor
    const pastorUser = await User.create({
      username: 'pastor',
      email: 'pastor@iglesia360.com',
      password: 'pastor123',
      person: pastorPerson._id,
      roles: [pastorRol._id]
    });

    console.log('✅ Usuario pastor creado');
    console.log('   Username: pastor');
    console.log('   Password: pastor123');

    console.log('\n🎉 Seed completado exitosamente!');
    console.log('\n📝 Resumen:');
    console.log(`   - ${roles.length} roles`);
    console.log(`   - ${modules.length} módulos`);
    console.log(`   - ${options.length} opciones`);
    console.log(`   - 2 usuarios de prueba`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
};

seedData();
