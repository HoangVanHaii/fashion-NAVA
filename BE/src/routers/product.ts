import express from 'express';
import * as productController from '../controllers/products';
import { uploadProduct } from '../utils/uploadProduct';
import { authMiddleware } from '../middlewares/authMiddleware'; 
import * as productMiddleware from '../middlewares/products'
import { validateRequest } from '../middlewares/validateRequest';

const router = express.Router();

router.get('/', authMiddleware, productController.getAllProducts);
router.post('/', authMiddleware, uploadProduct.any(), productMiddleware.createProductValidation, validateRequest, productMiddleware.mapColorFile, productController.createProduct)


export default router;

