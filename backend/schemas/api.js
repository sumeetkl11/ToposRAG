import { z } from 'zod';

// Regex to identify absolute paths on Windows (e.g. C:\path or C:/path) or Unix (/path or //unc)
const absolutePathRegex = /^([a-zA-Z]:[/\\]|[/\\]{2}|\/)/;

/**
 * Validates repository ingestion payloads.
 */
export const ingestRepoSchema = z.object({
  name: z.string({
    required_error: 'Repository name is required',
  }).min(1, 'Repository name cannot be empty').max(100, 'Repository name is too long'),
  rootPath: z.string({
    required_error: 'Root directory path is required',
  }).refine((val) => absolutePathRegex.test(val), {
    message: 'Root path must be a valid absolute directory path',
  }),
  gitBranch: z.string().max(100).optional(),
  commitHash: z.string().max(40).optional(),
});

/**
 * Validates chat query request payloads.
 */
export const chatQuerySchema = z.object({
  repositoryId: z.string({
    required_error: 'Repository ID is required',
  }).uuid('Repository ID must be a valid UUID'),
  prompt: z.string({
    required_error: 'Chat query prompt is required',
  }).min(1, 'Prompt cannot be empty').max(4000, 'Prompt length exceeds limit'),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

/**
 * Validates generic UUID parameter layouts (e.g. /api/repositories/:id).
 */
export const repositoryIdSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID format'),
});

/**
 * Validates general pagination parameters.
 */
export const paginationSchema = z.object({
  limit: z.preprocess(
    (val) => (val === undefined ? 10 : Number(val)),
    z.number().int().min(1).max(100)
  ).optional().default(10),
  offset: z.preprocess(
    (val) => (val === undefined ? 0 : Number(val)),
    z.number().int().min(0)
  ).optional().default(0),
});

/**
 * Express middleware helper to validate schemas.
 * @param {z.ZodSchema} schema 
 * @param {'body'|'query'|'params'} source - HTTP request component to extract fields from
 */
export const validateRequest = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      console.log(`[Validate] Checking ${source}:`, JSON.stringify(dataToValidate));
      const parsed = await schema.parseAsync(dataToValidate);
      // Re-assign back to request containing sanitized/casted values
      req[source] = parsed;
      console.log(`[Validate] ✓ Schema passed`);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[Validate] ✗ Schema rejected:', JSON.stringify(error.errors));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

export default {
  ingestRepoSchema,
  chatQuerySchema,
  repositoryIdSchema,
  paginationSchema,
  validateRequest,
};
