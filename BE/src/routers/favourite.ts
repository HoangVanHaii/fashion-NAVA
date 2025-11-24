import express from "express";
import * as favouriteController from "../controllers/favourite";

const router = express.Router();
import { authMiddleware } from "../middlewares/authMiddleware";

router.post(
    "/createFavourite",
    authMiddleware,
    favouriteController.createFavourite
);

router.get(
    "/getFavouritesOfme",
    authMiddleware,
    favouriteController.getFavouritesOfme
);
router.delete(
    "/deleteFavourite/:product_id",
    authMiddleware,
    favouriteController.deleteFavourite
);
export default router;