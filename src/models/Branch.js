import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  // Nombre visible de la sucursal
  name: {
    type: String,
    required: [true, 'El nombre de la sucursal es requerido'],
    trim: true,
    minlength: [3, 'El nombre debe tener al menos 3 caracteres']
  },
  // Dirección física de la sucursal
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'La dirección no puede exceder 200 caracteres']
  },
  // Sucursal padre dentro de la jerarquía
  parentBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  // Persona encargada principal de la sucursal
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: [true, 'El encargado de la sucursal es requerido']
  },
  // Usuario del sistema asociado al encargado
  managerUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Cadena de ancestros desde la raíz hasta el padre inmediato
  ancestors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }],
  // Nivel dentro del árbol (0 si es raíz)
  depth: {
    type: Number,
    default: 0
  },
  // Ruta completa de nodos representada como cadena
  nodePath: {
    type: String,
    index: true
  },
  // Indicador de disponibilidad operativa
  active: {
    type: Boolean,
    default: true
  },
  // Marca si la sucursal corresponde a una iglesia (true) o a un ministerio (false)
  isChurch: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const computeHierarchyData = async (model, branchId, parentId) => {
  if (!parentId) {
    return {
      ancestors: [],
      depth: 0,
      nodePath: branchId ? branchId.toString() : null
    };
  }

  const parent = await model.findById(parentId).select('ancestors nodePath');

  if (!parent) {
    throw new Error('La sucursal padre especificada no existe');
  }

  if (parentId.toString() === branchId.toString()) {
    throw new Error('Una sucursal no puede ser su propio padre');
  }

  if (parent.ancestors?.some((ancestorId) => ancestorId.toString() === branchId.toString())) {
    throw new Error('La relación entre sucursales genera un ciclo no permitido');
  }

  const ancestors = [...(parent.ancestors || []), parent._id];
  const depth = ancestors.length;
  const nodePath = parent.nodePath
    ? `${parent.nodePath}.${branchId.toString()}`
    : `${parent._id.toString()}.${branchId.toString()}`;

  return { ancestors, depth, nodePath };
};

const refreshDescendantsHierarchy = async (branchDoc) => {
  const children = await branchDoc.constructor.find({ parentBranch: branchDoc._id });

  for (const child of children) {
    child.markModified('parentBranch');
    await child.save();
    await refreshDescendantsHierarchy(child);
  }
};

branchSchema.pre('save', async function(next) {
  this._parentChanged = this.isNew || this.isModified('parentBranch');

  try {
    const hierarchy = await computeHierarchyData(this.constructor, this._id, this.parentBranch);
    this.ancestors = hierarchy.ancestors;
    this.depth = hierarchy.depth;
    this.nodePath = hierarchy.nodePath;
    next();
  } catch (error) {
    next(error);
  }
});

branchSchema.post('save', async function(doc, next) {
  try {
    if (doc._parentChanged) {
      await refreshDescendantsHierarchy(doc);
    }
    next();
  } catch (error) {
    next(error);
  }
});

branchSchema.index({ name: 1 }, { unique: true });
branchSchema.index({ active: 1 });
branchSchema.index({ parentBranch: 1 });
branchSchema.index({ manager: 1 });
branchSchema.index({ ancestors: 1 });

const Branch = mongoose.model('Branch', branchSchema);

export default Branch;
