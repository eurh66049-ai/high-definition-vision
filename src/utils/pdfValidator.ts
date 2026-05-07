// This file has been deprecated - use fileValidator.ts instead
import { validateFileUrl, enhanceFileUrl, createOptimizedFileUrl } from './fileValidator';

export const validatePDFUrl = validateFileUrl;
export const enhancePDFUrl = enhanceFileUrl;
export const createOptimizedPDFUrl = (url: string): string => createOptimizedFileUrl(url, 'pdf');