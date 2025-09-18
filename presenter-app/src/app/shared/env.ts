import { isDevMode } from '@angular/core';

const DEV_API = 'http://localhost:8081';
const PROD_API = 'https://www.sportiariders.com/obs/colourbrain/backend-app/public';

export const API_BASE = isDevMode() ? DEV_API : PROD_API;


