import mongoose from 'mongoose';

const personBranchRoleSchema = new mongoose.Schema({
  person: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: true,
    index: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rol',
    required: true
  }],
  isPrimary: {
    type: Boolean,
    default: false
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

personBranchRoleSchema.index({ person: 1, branch: 1 }, { unique: true });
personBranchRoleSchema.index({ person: 1, isPrimary: 1 });
personBranchRoleSchema.index({ branch: 1, activo: 1 });

personBranchRoleSchema.pre('save', function(next) {
  if (!Array.isArray(this.roles) || this.roles.length === 0) {
    const error = new Error('Debe asignar al menos un rol por sucursal');
    return next(error);
  }
  next();
});

const PersonBranchRole = mongoose.model('PersonBranchRole', personBranchRoleSchema);

export default PersonBranchRole;
