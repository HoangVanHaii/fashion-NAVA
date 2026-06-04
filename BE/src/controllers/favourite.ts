import { Request, Response, NextFunction } from "express";
import * as favouriteService from '../services/favourite'
import { FavouritePayload } from "../interfaces/favourite";
import { AppError } from "../utils/appError";

export const createFavourite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new AppError("Unauthorized", 401);

        const user_id = Number(req.user.id);
        const { product_id } = req.body;

        const favouriteData: FavouritePayload = {
            user_id: user_id,
            product_id: product_id
        };

        await favouriteService.createFavourite(favouriteData);

        res.status(201).json({
            success: true,
            message: 'Product added to favourites'
        });
    } catch (error: any) {
        next(error);
    }
};

export const getFavouritesOfmeDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new AppError("Unauthorized", 401);

        const user_id = Number(req.user.id);

        const favourites = await favouriteService.getAllFavouritesDetailByUserId(user_id);

        res.status(200).json({
            success: true,
            message: "Get favourites detail successfully",
            data: favourites
        });
    } catch (error) {
        next(error);
    }
};

export const getFavouriteIdsOfme = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new AppError("Unauthorized", 401);

        const user_id = Number(req.user.id);

        const favourites = await favouriteService.getAllFavouriteIdsByUserId(user_id);

        res.status(200).json({
            success: true,
            message: "Get favourite ids successfully",
            data: favourites
        });
    } catch (error) {
        next(error);
    }
};

export const deleteFavourite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new AppError("Unauthorized", 401);

        const user_id = Number(req.user.id);
        const product_id = Number(req.params.product_id);

        await favouriteService.deleteFavourite(user_id, product_id);

        res.status(200).json({
            success: true,
            message: 'Product removed from favourites'
        });
    } catch (error) {
        next(error);
    }
};