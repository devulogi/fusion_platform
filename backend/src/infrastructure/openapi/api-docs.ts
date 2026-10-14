import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

const openApiSpecification = readFileSync(resolve(process.cwd(), 'openapi.yaml'), 'utf8');
const router = express.Router();

router.get('/openapi.yaml', (_request, response) => {
  response.type('application/yaml').send(openApiSpecification);
});

router.use(
  '/',
  ...swaggerUi.serve,
  swaggerUi.setup(null, { swaggerUrl: '/api-docs/openapi.yaml' }),
);

export default router;
