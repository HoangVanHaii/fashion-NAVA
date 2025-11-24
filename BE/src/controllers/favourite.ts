import { Request, Response, NextFunction } from "express";
import *as favouriteService from '../services/favourite'
import { FavouritePayload } from "../interfaces/favourite";
import { AppError } from "../utils/appError";
import { pool } from "mssql";
import { getBranchIdByCode } from "../services/product";

export const createFavourite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch || !req.dbBranch.connected) {
            throw new AppError(`${ req.user?.branch_code } is not connected`, 503);
        }
        const user_id = req.user!.id;
        const { product_id } = req.body;
        const favouriteData: FavouritePayload = {
            user_id: user_id!,
            product_id: product_id
        }
        await favouriteService.createFavourite(favouriteData, req.dbBranch);
        res.status(201).json({
            success: true,
            message: 'Product added to favourites'
        });
    }
    catch (error: any) {
        next(error);
    }
}
export const getFavouritesOfmeDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch || !req.dbBranch.connected) {
            throw new AppError(`${ req.user?.branch_code } is not connected`, 503);
        }
        const user_id = req.user!.id;
        const branchId = await getBranchIdByCode(req.dbBranch!, req.user?.branch_code || "DN");
        if (!branchId) {
            throw new AppError("branch_id not found", 404);
        }
        const favourites = await favouriteService.getAllFavouritesDetailByUserId(req.dbBranch, user_id, branchId)
        res.status(200).json({
            success: true,
            message: "Get favourites detail successfully",
            favourites
        });
    } catch (error) {
        next(error);
    }
}
export const getFavouriteIdsOfme = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch || !req.dbBranch.connected) {
            throw new AppError(`${ req.user?.branch_code } is not connected`, 503);
        }
        const user_id = req.user!.id;
        const favourites = await favouriteService.getAllFavouriteIdsByUserId(req.dbBranch, user_id)
        res.status(200).json({
            success: true,
            message: "Get favourite ids successfully",
            favourites
        });
    } catch (error) {
        next(error);
    }
}
export const deleteFavourite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.dbBranch || !req.dbBranch.connected) {
            throw new AppError(`${ req.user?.branch_code } is not connected`, 503);
        }
        const user_id = req.user!.id;
        const product_id = req.params.product_id;

        await favouriteService.deleteFavourite(user_id, product_id, req.dbBranch);
        res.status(200).json({
            success: true,
            message: 'Product removed from favourites'
        });
    } catch (error) {
        next(error);
    }
}