import express from "express";
import * as favouriteController from "../controllers/favourite";

const router = express.Router();
import { authMiddleware } from "../middlewares/authMiddleware";

router.post(
    "/",
    authMiddleware,
    favouriteController.createFavourite
);

router.get(
    "/detail",
    authMiddleware,
    favouriteController.getFavouritesOfmeDetail
);
router.get(
    "/getFavouriteIdsOfme",
    authMiddleware,
    favouriteController.getFavouriteIdsOfme
);
router.delete(
    "/:product_id",
    authMiddleware,
    favouriteController.deleteFavourite
);

export default router;