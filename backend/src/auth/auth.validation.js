/**
 * auth.validation.js — Joi schemas for auth endpoints (R30)
 * Validation happens at the route boundary, before any service call.
 */
const Joi = require('joi');

const signupSchema = Joi.object({
  email: Joi.string().email().max(255).required().messages({
    'string.email':   'Email must be a valid email address.',
    'string.max':     'Email must be at most 255 characters.',
    'any.required':   'Email is required.',
  }),
  password: Joi.string()
    .min(12)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .pattern(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'special')
    .required()
    .messages({
      'string.min':      'Password must be at least 12 characters.',
      'string.pattern.name': 'Password must contain at least one {#name} character.',
      'any.required':    'Password is required.',
    }),
  name: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Name is required.',
  }),
  orgName: Joi.string().min(2).max(100).required().messages({
    'string.min':   'Organization name must be at least 2 characters.',
    'string.max':   'Organization name must be at most 100 characters.',
    'any.required': 'Organization name is required.',
  }),
});

const loginSchema = Joi.object({
  email:            Joi.string().email().max(255).required(),
  password:         Joi.string().required(),
  organizationSlug: Joi.string().optional(),
});

/**
 * Middleware factory — validates req.body against a Joi schema.
 * On failure: 422 with field-level errors array compatible with the frontend.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (!error) return next();

    const errors = error.details.map((d) => ({
      field:   d.path.join('.'),
      message: d.message,
    }));
    return res.status(422).json({ error: 'Validation failed', errors });
  };
}

module.exports = { signupSchema, loginSchema, validate };
