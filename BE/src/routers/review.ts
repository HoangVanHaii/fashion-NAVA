import { Router } from 'express';
import * as reviewController from '../controllers/review'
import {uploadReview} from '../utils/uploadReview'
import { adminOrEmployee, authMiddleware, isAdmin } from '../middlewares/authMiddleware'; 
import { validateRequest } from '../middlewares/validateRequest';
import * as reviewValidator from '../middlewares/review';

const router = Router();
router.post("/", authMiddleware, uploadReview, reviewValidator.createReview, validateRequest, reviewController.createReviewController);
router.put("/:review_id", authMiddleware, uploadReview, reviewValidator.updateReview, validateRequest, reviewController.updateReviewController);
router.post("/child/:parent_id", authMiddleware, uploadReview, reviewValidator.addChildReview, validateRequest, reviewController.addChildReviewController);
router.put("/child/:parent_id", authMiddleware, uploadReview, reviewValidator.updateChildReview, validateRequest, reviewController.updateChildReviewController);
router.delete("/:review_id_sql/:mongodb_id", authMiddleware, reviewValidator.deleteReview, validateRequest, reviewController.deleteReviewController);
router.delete("/child/:parent_id/:child_id", authMiddleware, reviewValidator.deleteChildReview, validateRequest, reviewController.deleteChildReviewController);
router.get("/product/:product_id", authMiddleware, reviewValidator.getReviewsByProductId, validateRequest, reviewController.getReviewsByProductId);
router.get('/review_of_me/:order_id',authMiddleware,validateRequest,reviewController.getReviewsByOrderItemIdOfMe);

router.get("/stats/products/all", authMiddleware, adminOrEmployee, reviewController.getAllProductStats);
router.get("/admin/products/central", authMiddleware, isAdmin, reviewController.getCentralProductStats);

router.get("/product/:product_id/top-discussed", authMiddleware, adminOrEmployee, reviewController.getTopDiscussedByProduct);

export default router;
