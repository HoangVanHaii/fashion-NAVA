import { Router } from 'express';
import * as reviewController from '../controllers/review'
import {uploadReview} from '../utils/uploadReview'
const router = Router();
router.post("/",uploadReview, reviewController.createReviewController);
router.put("/:review_id",uploadReview, reviewController.updateReviewController);
router.post("/child/:parent_id",uploadReview, reviewController.addChildReviewController);
router.put("/child/:parent_id",uploadReview, reviewController.updateChildReviewController);
router.delete("/:review_id_sql/:mongodb_id", reviewController.deleteReviewController);
router.delete("/child/:parent_id/:child_id", reviewController.deleteChildReviewController);
router.get("/product/:product_id", reviewController.getReviewsByProductId);
export default router;