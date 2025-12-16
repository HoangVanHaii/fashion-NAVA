import express from 'express';
import * as cartController from '../controllers/cart';
import { authMiddleware } from '../middlewares/authMiddleware'; 
import { validateRequest } from '../middlewares/validateRequest';
import * as cartValidator from '../middlewares/cart';

const router = express.Router();
router.post('/', authMiddleware, cartValidator.addtoCart, validateRequest, cartController.addtoCartController);
router.get('/', authMiddleware, cartController.getCartItems);
router.put('/updateItemQuantity/:id', authMiddleware, cartValidator.updateCartItemQuantity, validateRequest, cartController.updateCartItemQuantity);
router.put('/updateItem/:id' , authMiddleware, cartValidator.updateCartItem, validateRequest, cartController.updateCartItem);
router.delete('/removeItem/:id', authMiddleware, cartValidator.removeCartItem, validateRequest, cartController.removeCartItem);
router.delete('/clearCart', authMiddleware, cartController.clearCart);
router.get('/count', authMiddleware, cartController.countCartItems);
export default router;
