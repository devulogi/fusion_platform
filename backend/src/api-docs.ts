import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { stringify } from 'yaml';
import { openApiDocument } from './api-contract.ts';

const openApiSpecification = stringify(openApiDocument);
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
