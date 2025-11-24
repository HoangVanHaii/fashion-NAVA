import express from 'express';
import * as productController from '../controllers/product';
import { uploadProduct } from '../utils/uploadProduct';
import { authMiddleware } from '../middlewares/authMiddleware'; 
import * as productMiddleware from '../middlewares/products'
import { validateRequest } from '../middlewares/validateRequest';

const router = express.Router();

router.get('/', authMiddleware, productController.getAllProducts)
router.get('/category/:category_id', authMiddleware, productMiddleware.getByCategoryValidation, validateRequest, productController.getAllProductsByCategoryId)
router.get('/brand/:brand_id', authMiddleware, productMiddleware.getByBrandValidation, validateRequest, productController.getAllProductsByBrandId)

///

router.get('/public', productController.getAllProductsForGuests)
router.get('/public/:id', productMiddleware.ProductIdValidation, validateRequest, productController.getProductDetailForGuests);
router.get('/public/category/:category_id' ,productMiddleware.getByCategoryValidation, validateRequest , productController.getAllProductsByCategoryIdForGuests)
router.get('/public/brand/:brand_id', productMiddleware.getByBrandValidation, validateRequest, productController.getAllProductsByBrandIdForGuests)


router.get('/:id', authMiddleware, productMiddleware.ProductIdValidation, validateRequest, productController.getProductDetail);

export default router;

