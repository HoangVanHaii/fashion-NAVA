import { Request, Response, NextFunction } from "express";
import *as favouriteService from '../services/favourite'
import { FavouritePayload } from "../interfaces/favourite";


export const createFavourite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = req.user!.id;
        const { product_id } = req.body;
        const favouriteData: FavouritePayload = {
            user_id: user_id!,
            product_id: product_id
        }
        await favouriteService.createFavourite(favouriteData);
        res.status(201).json({ message: 'Product added to favourites' });
    }
    catch (error: any) {
        next(error);
    }
}
export const getFavouritesOfme = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = req.user!.id;
        const favourites = await favouriteService.getFavouritesByUserId(user_id)
        res.status(200).json(favourites);
    } catch (error) {
        next(error);
    }
}
export const deleteFavourite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = req.user!.id;
        const product_id = parseInt(req.params.product_id);
        await favouriteService.deleteFavourite(user_id, product_id);
        res.status(200).json({ message: 'Product removed from favourites' });
    } catch (error) {
        next(error);
    }
}