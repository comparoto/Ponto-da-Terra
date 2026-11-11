// Carrega .env.test (banco pontodaterra_test e Redis db 1) antes de qualquer import da aplicação.
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '..', '.env.test'), override: true });
