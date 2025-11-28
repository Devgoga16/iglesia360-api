import mongoose from 'mongoose';
import Branch from '../models/Branch.js';
import Person from '../models/Person.js';
import User from '../models/User.js';

const populateBranch = (query) => query
  .populate('parentBranch', 'name')
  .populate('manager', 'nombres apellidos numeroDocumento')
  .populate('managerUser', 'username email');

const syncManagerAssignments = async (branchId, managerPersonId, managerUserId) => {
  if (managerPersonId) {
    await Person.findByIdAndUpdate(managerPersonId, { branch: branchId });
  }

  if (managerUserId) {
    await User.findByIdAndUpdate(managerUserId, { branch: branchId });
  }
};

const buildTree = (branches, parentId = null) => {
  const normalizeId = (value) => {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value._id) {
      return value._id.toString();
    }

    return value.toString();
  };

  const parentKey = parentId ? parentId.toString() : null;

  return branches
    .filter((branch) => {
      const branchParent = normalizeId(branch.parentBranch);
      return branchParent === parentKey;
    })
    .map((branch) => ({
      ...branch,
      children: buildTree(branches, normalizeId(branch._id))
    }));
};

const cascadeActiveState = async (branchId, active) => {
  await Branch.updateOne({ _id: branchId }, { active });

  const children = await Branch.find({ parentBranch: branchId }).select('_id');

  for (const child of children) {
    await cascadeActiveState(child._id, active);
  }
};

// @desc    Listar sucursales
// @route   GET /api/branches
export const getBranches = async (req, res, next) => {
  try {
    const { active, structure } = req.query;
    const filter = {};

    if (active === 'true') {
      filter.active = true;
    }

    if (active === 'false') {
      filter.active = false;
    }

    const queryBuilder = () => populateBranch(
      Branch.find(filter).sort({ depth: 1, name: 1 })
    );

    const isTreeStructure = structure !== 'flat';

    if (isTreeStructure) {
      const branches = await queryBuilder().lean();
      const treeData = buildTree(branches);

      return res.status(200).json({
        success: true,
        count: branches.length,
        data: treeData
      });
    }

    const branches = await queryBuilder();

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener sucursal por ID
// @route   GET /api/branches/:id
export const getBranchById = async (req, res, next) => {
  try {
    const branch = await populateBranch(Branch.findById(req.params.id));

    if (!branch) {
      const error = new Error('Sucursal no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      success: true,
      data: branch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Crear nueva sucursal
// @route   POST /api/branches
export const createBranch = async (req, res, next) => {
  try {
    const {
      name,
      address,
      parentBranchId = null,
      managerPersonId,
      isChurch = true
    } = req.body;

    if (!managerPersonId) {
      const error = new Error('Debe especificar el encargado de la sucursal');
      error.statusCode = 400;
      throw error;
    }

    if (typeof isChurch !== 'boolean') {
      const error = new Error('isChurch debe ser un valor booleano');
      error.statusCode = 400;
      throw error;
    }

    if (parentBranchId && !mongoose.Types.ObjectId.isValid(parentBranchId)) {
      const error = new Error('El identificador de la sucursal padre es inválido');
      error.statusCode = 400;
      throw error;
    }

    const managerPerson = await Person.findById(managerPersonId);

    if (!managerPerson) {
      const error = new Error('La persona encargada indicada no existe');
      error.statusCode = 404;
      throw error;
    }

    const managerUser = await User.findOne({ person: managerPersonId }).select('_id');

    const payload = {
      name,
      address,
      parentBranch: parentBranchId || null,
      manager: managerPersonId,
      managerUser: managerUser ? managerUser._id : null,
      isChurch
    };

    const branch = await Branch.create(payload);

    await syncManagerAssignments(branch._id, managerPersonId, managerUser ? managerUser._id : null);

    await branch.populate('manager', 'nombres apellidos numeroDocumento');
    await branch.populate('managerUser', 'username email');
    await branch.populate('parentBranch', 'name');

    res.status(201).json({
      success: true,
      data: branch
    });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 400;
      error.message = 'Ya existe una sucursal con ese nombre';
    }

    next(error);
  }
};

// @desc    Actualizar sucursal
// @route   PUT /api/branches/:id
export const updateBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      const error = new Error('Sucursal no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    const {
      name,
      address,
      parentBranchId,
      managerPersonId,
      isChurch
    } = req.body;

    if (name !== undefined) {
      branch.name = name;
    }

    if (address !== undefined) {
      branch.address = address;
    }

    if (parentBranchId !== undefined) {
      if (parentBranchId && !mongoose.Types.ObjectId.isValid(parentBranchId)) {
        const error = new Error('El identificador de la sucursal padre es inválido');
        error.statusCode = 400;
        return next(error);
      }
      branch.parentBranch = parentBranchId || null;
    }

    if (managerPersonId !== undefined) {
      const managerPerson = await Person.findById(managerPersonId);
      if (!managerPerson) {
        const error = new Error('La persona encargada indicada no existe');
        error.statusCode = 404;
        return next(error);
      }
      branch.manager = managerPersonId;
    }

    if (isChurch !== undefined) {
      if (typeof isChurch !== 'boolean') {
        const error = new Error('isChurch debe ser un valor booleano');
        error.statusCode = 400;
        return next(error);
      }
      branch.isChurch = isChurch;
    }

    const managerUser = await User.findOne({ person: branch.manager }).select('_id');
    branch.managerUser = managerUser ? managerUser._id : null;

    await branch.save();

    await syncManagerAssignments(branch._id, branch.manager, branch.managerUser);

    await branch.populate('manager', 'nombres apellidos numeroDocumento');
    await branch.populate('managerUser', 'username email');
    await branch.populate('parentBranch', 'name');

    res.status(200).json({
      success: true,
      data: branch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activar/desactivar sucursal
// @route   PATCH /api/branches/:id/status
export const toggleBranchStatus = async (req, res, next) => {
  try {
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      const error = new Error('Debe especificar el estado activo como booleano');
      error.statusCode = 400;
      return next(error);
    }

    const branchExists = await Branch.exists({ _id: req.params.id });

    if (!branchExists) {
      const error = new Error('Sucursal no encontrada');
      error.statusCode = 404;
      return next(error);
    }

    await cascadeActiveState(req.params.id, active);

    const branch = await populateBranch(Branch.findById(req.params.id));

    res.status(200).json({
      success: true,
      data: branch
    });
  } catch (error) {
    next(error);
  }
};
