import express from 'express';
import * as productController from '../../controllers/employee/product';
import { uploadProduct } from '../../utils/uploadProduct';
import { authMiddleware, adminOrEmployee } from '../../middlewares/authMiddleware'; 
import * as productMiddleware from '../../middlewares/products'
import { validateRequest } from '../../middlewares/validateRequest';

const router = express.Router();

router.post('/', authMiddleware, adminOrEmployee, uploadProduct.any(), productMiddleware.mapColorFile, productMiddleware.createProductValidation, validateRequest, productController.createProduct)
router.put('/status/:id', authMiddleware, adminOrEmployee, productMiddleware.changeStatusValidation, validateRequest, productController.changeStatusProduct);
router.put('/:id', authMiddleware, adminOrEmployee, uploadProduct.any(), productMiddleware.mapColorFile,
    productMiddleware.updateProductValidation, validateRequest, productController.updateProduct)


export default router;

